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

    /*
     * Se cuentan los mensajes del alumno, que la ruta persiste ANTES de llamar a OpenAI.
     *
     * Ese "antes" es el punto: `CoachUsage` solo se escribe al terminar el stream, así que
     * como fuente del tope iba un request por detrás y no frenaba a quien encadena
     * peticiones. Contar aquí hace que el contador avance en cuanto entra la petición.
     *
     * El agujero que tenía esta consulta —`CoachMessage` solo se escribía si el cliente
     * mandaba `conversationId`, un campo opcional bajo su control— está cerrado en la ruta:
     * ahora el id se genera en el servidor cuando falta, así que toda llamada deja rastro.
     *
     * Limitación conocida: peticiones estrictamente SIMULTÁNEAS leen todas el valor previo y
     * pueden colarse juntas. Acotarlo requeriría un contador atómico por usuario; el tope
     * diario es una barrera anti-abuso, no un límite de facturación exacto.
     */
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
