import { randomUUID } from 'node:crypto'
import { getServerSession } from 'next-auth'
import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadCoachAccess, refundFreeEvaluation, reserveFreeEvaluation } from '@/lib/coach/access'
import { COACH_TRIAL_EXHAUSTED } from '@/lib/coach/trial'
import {
    buildCoachSystemPrompt,
    COACH_MODEL,
    COACH_MODEL_LIGHT,
    COACH_MAX_INPUT_CHARS,
    COACH_MAX_OUTPUT_TOKENS,
    COACH_HISTORY_LIMIT,
    COACH_TPM_LIMIT,
    estimateTokens,
    looksLikeTranscript,
} from '@/lib/coach/prompt'
import { checkCoachRateLimit } from '@/lib/coach/rate-limit'
import { computeCostUsd } from '@/lib/coach/pricing'
import { loadCoachConfig } from '@/lib/coach/methodology-source'

// Prisma requiere runtime Node (no Edge). El streaming vive dentro de maxDuration.
export const runtime = 'nodejs'
export const maxDuration = 60

/** Extrae el texto plano de un UIMessage (concatena sus text parts). */
function messageText(msg: UIMessage): string {
    return (msg.parts ?? [])
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
        .trim()
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return new Response('Unauthorized', { status: 401 })
    }

    const u = session.user
    /*
     * Acceso freemium: quien ha pagado entra sin límite; quien solo se ha registrado tiene
     * COACH_FREE_EVALUATIONS transcripciones de prueba y después se le bloquea el coach.
     * El nivel se resuelve contra la BASE, no contra el JWT: la sesión no se refresca al
     * consumir una evaluación y un contador cacheado ahí daría pruebas infinitas.
     */
    const access = await loadCoachAccess(u.id, {
        role: u.role,
        closer_enabled: u.closer_enabled ?? false,
        closer_type: u.closer_type ?? null,
        payment_status: u.payment_status ?? 'none',
    })

    if (access.level === 'exhausted') {
        return new Response(COACH_TRIAL_EXHAUSTED, { status: 402 })
    }

    let body: { messages?: UIMessage[]; conversationId?: string; callType?: string }
    try {
        body = await req.json()
    } catch {
        return new Response('Bad Request', { status: 400 })
    }

    const messages = body.messages ?? []
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') {
        return new Response('Bad Request: last message must be from the user', { status: 400 })
    }

    const userText = messageText(lastMessage)
    if (!userText) {
        return new Response('Bad Request: empty message', { status: 400 })
    }
    if (userText.length > COACH_MAX_INPUT_CHARS) {
        // Con el tope actual (~4h de conversación) llegar aquí significa que se ha
        // pegado algo que no es una llamada, no que la llamada sea larga.
        return new Response(
            `El texto supera el máximo de ${COACH_MAX_INPUT_CHARS.toLocaleString('es-ES')} caracteres ` +
                `(has pegado ${userText.length.toLocaleString('es-ES')}). Asegúrate de pegar una sola llamada.`,
            { status: 413 },
        )
    }

    // Límite anti-abuso por usuario (protege la API key del cliente).
    const rl = await checkCoachRateLimit(u.id)
    if (!rl.ok) {
        return new Response(
            `Has alcanzado el límite diario de ${rl.limit} mensajes al coach. Vuelve mañana.`,
            { status: 429 },
        )
    }

    // Título limpio para el historial: quita el prefijo meta "(Tipo de llamada …)"
    // que el cliente antepone, para que coincida con lo que se muestra en el sidebar.
    const conversationTitle =
        userText.replace(/^\(Tipo de llamada[^)]*\)\s*/, '').slice(0, 60) || 'Nueva llamada'

    /*
     * Persistir el turno del alumno ANTES de streamear (upsert de la conversación).
     *
     * Si el cliente no manda `conversationId` se genera aquí en vez de saltarse la
     * persistencia. Era un campo opcional bajo su control, y omitirlo dejaba la petición sin
     * rastro: ni mensaje guardado ni nada que contara para el tope diario. Ahora toda llamada
     * queda registrada antes de gastar un solo token.
     */
    const conversationId = body.conversationId || randomUUID()

    // Integridad + seguridad: nunca escribir en una conversación de OTRO usuario
    // (el id lo controla el cliente). Si existe y no es suya → 403.
    if (conversationId) {
        const owner = await prisma.coachConversation.findUnique({
            where: { id: conversationId },
            select: { user_id: true },
        })
        if (owner && owner.user_id !== u.id) {
            return new Response('Forbidden', { status: 403 })
        }
    }

    try {
        await prisma.coachConversation.upsert({
            where: { id: conversationId },
            create: {
                id: conversationId,
                user_id: u.id,
                title: conversationTitle,
                call_type: body.callType ?? null,
            },
            update: { updated_at: new Date() },
        })
        await prisma.coachMessage.create({
            data: { conversation_id: conversationId, role: 'user', content: userText },
        })
    } catch (err) {
        console.error('[coach] error persistiendo el mensaje del alumno:', err)
        // No bloqueamos la evaluación por un fallo de persistencia.
    }

    // Enrutado de modelo: evaluación pesada → gpt-4o; seguimiento conversacional → modelo light.
    const isEvaluation = looksLikeTranscript(userText)
    const model = isEvaluation ? COACH_MODEL : COACH_MODEL_LIGHT

    /*
     * Consumo de la prueba gratuita: se cobra una evaluación por TRANSCRIPCIÓN, que es
     * literalmente lo que se ofreció ("2 transcripciones únicas gratis"). Un mensaje corto
     * —un "hola", una duda sobre la puntuación— no gasta cuota.
     *
     * Invariante: se cobra EXACTAMENTE cuando se entrega una evaluación, así que la condición
     * es la misma que decide el modelo (`isEvaluation`). Separarlas —se probó con un umbral de
     * cobro más alto— abre una franja donde el alumno recibe la evaluación completa sin gastar
     * cuota, y la prueba deja de tener límite.
     *
     * Sigue siendo una heurística y por tanto esquivable troceando la llamada por debajo de
     * 800 caracteres, pero quien la esquiva NO obtiene el producto: esos mensajes van al
     * modelo light con el prompt de seguimiento, sin rúbrica ni puntuación. Lo que se regala
     * así es charla barata, y el tope diario de `checkCoachRateLimit` acota el gasto.
     *
     * Alternativa descartada: cobrar por conversación. No acota nada — basta con pegar todas
     * las llamadas en el mismo chat para pagar una sola vez — y hacía que abrir un chat y
     * escribir "hola" costara una de las dos pruebas.
     *
     * La reserva es atómica y ocurre ANTES de llamar a OpenAI: si se hiciera después, dos
     * pestañas simultáneas pasarían las dos comprobaciones y consumirían tokens de más.
     */
    let reservedFreeEvaluation = false
    if (access.level === 'trial' && isEvaluation) {
        reservedFreeEvaluation = await reserveFreeEvaluation(u.id)
        if (!reservedFreeEvaluation) {
            // Otra petición se llevó la última mientras esta estaba en vuelo.
            return new Response(COACH_TRIAL_EXHAUSTED, { status: 402 })
        }
    }

    // Solo se reenvían los últimos N mensajes (el system prompt fijo va aparte y se cachea).
    const recentMessages = messages.slice(-COACH_HISTORY_LIMIT)
    const modelMessages = await convertToModelMessages(recentMessages)

    // Configuración de Iván: instrucciones adicionales + Documento Maestro activo
    // (el editado desde el panel si existe; si no, el compilado en el build).
    const coachConfig = await loadCoachConfig()

    // El Documento Maestro (~13.800 tokens) solo se envía en las evaluaciones. En un
    // seguimiento la evaluación previa ya viaja en el historial, así que reenviarlo entero
    // se pagaba en cada pregunta del alumno sin aportar nada.
    const systemPrompt = buildCoachSystemPrompt({
        methodology: coachConfig.methodology,
        extraInstructions: coachConfig.extraInstructions,
        mode: isEvaluation ? 'evaluation' : 'followup',
    })

    /*
     * Comprobación de presupuesto ANTES de llamar a OpenAI.
     *
     * El límite que ata al coach no es la ventana de contexto de gpt-4o (128k), sino
     * el TPM de la cuenta: OpenAI devuelve 429 "Request too large" a cualquier
     * petición que por sí sola supere el tope por minuto de la organización.
     *
     * Sin este pre-check el SDK reintenta 3 veces algo que no puede funcionar y el
     * alumno acaba viendo un "An error occurred" opaco un minuto después.
     */
    const messagesTokens = modelMessages.reduce((n, m) => {
        const content =
            typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '')
        return n + estimateTokens(content)
    }, 0)
    const requestTokens = estimateTokens(systemPrompt) + messagesTokens + COACH_MAX_OUTPUT_TOKENS

    if (requestTokens > COACH_TPM_LIMIT) {
        // La cuota ya estaba reservada: aquí no se ha evaluado nada, así que se devuelve.
        // Si no, un intento con una llamada demasiado larga quemaría una de las dos pruebas.
        if (reservedFreeEvaluation) {
            reservedFreeEvaluation = false
            await refundFreeEvaluation(u.id)
        }
        const overflowChars = Math.ceil((requestTokens - COACH_TPM_LIMIT) * 3.6)
        console.warn(
            `[coach] petición por encima del TPM de la cuenta: ~${requestTokens} tokens ` +
                `(system ~${estimateTokens(systemPrompt)} + mensajes ~${messagesTokens} + ` +
                `salida ${COACH_MAX_OUTPUT_TOKENS}) frente a un límite de ${COACH_TPM_LIMIT}. ` +
                `Subir de tier en platform.openai.com y actualizar COACH_TPM_LIMIT.`,
        )
        return new Response(
            `Esta llamada es demasiado larga para evaluarla de una sola vez. ` +
                `Recorta unos ${overflowChars.toLocaleString('es-ES')} caracteres ` +
                `o divídela en dos partes y envíalas por separado.`,
            { status: 413 },
        )
    }

    const result = streamText({
        model: openai(model),
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: COACH_MAX_OUTPUT_TOKENS,
        // Por defecto son 3 intentos. Un "request too large" no puede triunfar reintentando,
        // así que 3 rondas solo hacían esperar al alumno un minuto antes de fallar. Con 1
        // reintento se siguen absorbiendo los cortes transitorios de red.
        maxRetries: 1,
        async onFinish({ text, usage }) {
            // 1. Registrar el consumo REAL (tokens facturados por OpenAI) + costo calculado.
            try {
                const cachedInputTokens = usage?.inputTokenDetails?.cacheReadTokens ?? 0
                const inputTokens = usage?.inputTokens ?? 0
                const outputTokens = usage?.outputTokens ?? 0
                const cost = computeCostUsd(model, { inputTokens, outputTokens, cachedInputTokens })
                await prisma.coachUsage.create({
                    data: {
                        user_id: u.id,
                        conversation_id: conversationId ?? null,
                        model,
                        is_evaluation: isEvaluation,
                        input_tokens: inputTokens,
                        output_tokens: outputTokens,
                        cached_input_tokens: cachedInputTokens,
                        cost_usd: cost,
                    },
                })
            } catch (err) {
                console.error('[coach] error registrando el consumo de tokens:', err)
            }

            // 2. Persistir la respuesta del coach.
            if (!text) return
            try {
                await prisma.coachMessage.create({
                    data: { conversation_id: conversationId, role: 'assistant', content: text },
                })
                await prisma.coachConversation.update({
                    where: { id: conversationId },
                    data: { updated_at: new Date() },
                })
            } catch (err) {
                console.error('[coach] error persistiendo la respuesta del coach:', err)
            }
        },
    })

    /*
     * El servidor termina de leer el stream aunque el cliente se desconecte.
     *
     * `onFinish` —donde se registra CoachUsage— solo corre si el stream se consume, y ese
     * registro es ahora la fuente del límite diario. Sin esto, abortar cada petición llegaba
     * igualmente a OpenAI pero no dejaba rastro, y el tope de mensajes al día no saltaba nunca.
     */
    void result.consumeStream()

    return result.toUIMessageStreamResponse({
        /*
         * Sin esto el SDK devuelve su default literal: "An error occurred." — que es
         * exactamente el mensaje opaco que veía el alumno cuando OpenAI rechazaba la
         * llamada por tamaño. Aquí se traduce a algo accionable.
         */
        onError(error) {
            const msg = collectErrorText(error)

            /*
             * La evaluación se reservó antes de llamar a OpenAI. Si la llamada falla, se le
             * devuelve: un error transitorio de la API no puede costarle una de sus dos
             * únicas pruebas. Esto también cubre los cortes a mitad de stream —donde ya
             * habría leído parte de la respuesta— a propósito: una evaluación truncada no
             * es una evaluación, y ahí tampoco se registra consumo. El flag evita devolver
             * dos veces si el SDK invoca este callback más de una vez.
             */
            if (reservedFreeEvaluation) {
                reservedFreeEvaluation = false
                void refundFreeEvaluation(u.id)
            }

            // 429 por tope de la cuenta: la petición no cabe en el TPM de la organización.
            if (/tokens per min|TPM|request too large|rate.?limit/i.test(msg)) {
                console.error(
                    `[coach] OpenAI rechazó la petición por el límite de la cuenta. ` +
                        `Si el tier ya se subió, actualizar COACH_TPM_LIMIT (actual: ${COACH_TPM_LIMIT}). ` +
                        `Detalle: ${msg}`,
                )
                return (
                    'Esta llamada es demasiado larga para el plan actual de OpenAI. ' +
                    'Divídela en dos partes y envíalas por separado, o avisa a tu administrador.'
                )
            }

            console.error('[coach] error de la API de OpenAI:', msg)
            return 'Ha ocurrido un error al evaluar la llamada. Vuelve a intentarlo en un momento.'
        },
    })
}

/** Aplana un error del SDK (AI_RetryError envuelve al APICallError real) para poder inspeccionarlo. */
function collectErrorText(error: unknown): string {
    const parts: string[] = []
    let cur: unknown = error
    for (let i = 0; i < 5 && cur; i++) {
        if (typeof cur === 'string') {
            parts.push(cur)
            break
        }
        if (cur instanceof Error) parts.push(cur.message)
        const next = cur as { lastError?: unknown; cause?: unknown }
        cur = next.lastError ?? next.cause
    }
    return parts.join(' | ') || String(error)
}
