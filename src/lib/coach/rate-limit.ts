import { prisma } from '@/lib/prisma'
import { COACH_RATE_LIMIT_PER_DAY } from './prompt'

/**
 * Límite anti-abuso por usuario: nº de mensajes del alumno en las últimas 24h.
 * Protege la API key del cliente. `COACH_RATE_LIMIT_PER_DAY = 0` lo desactiva.
 */
export async function checkCoachRateLimit(
    userId: string,
): Promise<{ ok: boolean; used: number; limit: number }> {
    const limit = COACH_RATE_LIMIT_PER_DAY
    if (!limit || limit <= 0) return { ok: true, used: 0, limit: 0 }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const used = await prisma.coachMessage.count({
        where: {
            role: 'user',
            created_at: { gte: since },
            conversation: { user_id: userId },
        },
    })

    return { ok: used < limit, used, limit }
}
