import { getServerSession } from 'next-auth'
import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCoach } from '@/lib/access'
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
    if (
        !canAccessCoach({
            role: u.role,
            closer_enabled: u.closer_enabled ?? false,
            closer_type: u.closer_type ?? null,
            payment_status: u.payment_status ?? 'none',
        })
    ) {
        return new Response('Forbidden', { status: 403 })
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

    // Persistir el turno del alumno ANTES de streamear (upsert de la conversación).
    const conversationId = body.conversationId

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
        if (conversationId) {
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
        }
    } catch (err) {
        console.error('[coach] error persistiendo el mensaje del alumno:', err)
        // No bloqueamos la evaluación por un fallo de persistencia.
    }

    // Enrutado de modelo: evaluación pesada → gpt-4o; seguimiento conversacional → modelo light.
    const isEvaluation = looksLikeTranscript(userText)
    const model = isEvaluation ? COACH_MODEL : COACH_MODEL_LIGHT

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
            if (!conversationId || !text) return
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

    return result.toUIMessageStreamResponse({
        /*
         * Sin esto el SDK devuelve su default literal: "An error occurred." — que es
         * exactamente el mensaje opaco que veía el alumno cuando OpenAI rechazaba la
         * llamada por tamaño. Aquí se traduce a algo accionable.
         */
        onError(error) {
            const msg = collectErrorText(error)

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
