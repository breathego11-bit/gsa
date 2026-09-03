import { prisma } from '@/lib/prisma'
import { canAccessCoach, type AccessUser } from '@/lib/access'
import { COACH_FREE_EVALUATIONS, coachAccessFrom, type CoachAccess } from '@/lib/coach/trial'

/**
 * Acceso al Coach IA — parte que toca la base de datos.
 *
 * Las constantes, tipos y la lógica pura viven en `trial.ts` para que el componente de chat
 * pueda importarlas sin arrastrar Prisma al bundle del navegador.
 */

/**
 * Nivel de acceso leyendo el contador de la base.
 *
 * El contador NO viaja en el JWT de NextAuth a propósito: la sesión se firma al iniciar
 * sesión y no se refresca al consumir una evaluación, así que un valor cacheado ahí daría
 * pruebas gratis infinitas hasta el siguiente login.
 */
export async function loadCoachAccess(userId: string, u: AccessUser): Promise<CoachAccess> {
    if (canAccessCoach(u)) {
        return { level: 'full', remaining: 0, used: 0, limit: COACH_FREE_EVALUATIONS }
    }
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { coach_free_evaluations_used: true },
    })
    return coachAccessFrom(u, row?.coach_free_evaluations_used ?? 0)
}

/**
 * Reserva una evaluación gratuita de forma ATÓMICA.
 *
 * `updateMany` con la condición del límite en el `where` hace que el incremento solo ocurra
 * si todavía queda cuota: dos pestañas enviando a la vez no pueden pasar ambas. El
 * read-then-write equivalente sí las dejaría pasar, y cada evaluación cuesta dinero real en
 * la API de OpenAI. Es el mismo patrón que el claim del booking de leads.
 *
 * @returns true si se pudo reservar; false si la cuota ya estaba agotada.
 */
export async function reserveFreeEvaluation(userId: string): Promise<boolean> {
    const claim = await prisma.user.updateMany({
        where: { id: userId, coach_free_evaluations_used: { lt: COACH_FREE_EVALUATIONS } },
        data: { coach_free_evaluations_used: { increment: 1 } },
    })
    return claim.count > 0
}

/**
 * Devuelve una evaluación reservada que al final no se consumió — por ejemplo si la petición
 * se rechaza por tamaño antes de llegar a OpenAI. Sin esto, un intento fallido le costaría al
 * usuario una de sus dos pruebas sin haber recibido nada. Nunca baja de cero.
 */
export async function refundFreeEvaluation(userId: string): Promise<void> {
    try {
        await prisma.user.updateMany({
            where: { id: userId, coach_free_evaluations_used: { gt: 0 } },
            data: { coach_free_evaluations_used: { decrement: 1 } },
        })
    } catch (err) {
        console.error('[coach] no se pudo devolver la evaluación gratuita:', err)
    }
}
