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
    looksLikeTranscript,
} from '@/lib/coach/prompt'
import { checkCoachRateLimit } from '@/lib/coach/rate-limit'
import { computeCostUsd } from '@/lib/coach/pricing'

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
        return new Response(
            `La transcripción es demasiado larga (máximo ${COACH_MAX_INPUT_CHARS} caracteres). Pega solo la llamada.`,
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

    // Ajustes de Iván (instrucciones adicionales editables desde el panel admin).
    const setting = await prisma.coachSetting.findUnique({ where: { id: 'singleton' } })

    const result = streamText({
        model: openai(model),
        system: buildCoachSystemPrompt(setting?.extra_instructions ?? undefined),
        messages: modelMessages,
        maxOutputTokens: COACH_MAX_OUTPUT_TOKENS,
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

    return result.toUIMessageStreamResponse()
}
