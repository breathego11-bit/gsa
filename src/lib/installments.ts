import { prisma } from '@/lib/prisma'
import { hasUniversalCourseAccess, type AccessUser } from '@/lib/access'
import { livePlanIds } from '@/lib/payment-rules'
import { OPEN_GATE, isItemLocked, type InstallmentGate } from '@/lib/installments-math'

// Reexportadas para no tocar los imports existentes: todo el gating se sigue pidiendo a este módulo.
export { OPEN_GATE, isItemLocked, itemUnlockInstallment, unlockedCount } from '@/lib/installments-math'
export type { InstallmentGate } from '@/lib/installments-math'

/**
 * Desbloqueo de contenido por cuotas.
 *
 * Un alumno que paga en `N` cuotas ve la formación dividida en `N` tramos: con `k` cuotas
 * pagadas se desbloquean los primeros `k` tramos, tanto del catálogo de cursos como de los
 * módulos dentro de cada curso. El reparto favorece al alumno (tramos de tamaño `ceil(L/N)`).
 *
 * NO aplica a: admins, closers CRM_AND_COURSES (acceso universal), pago único, complimentary
 * (sin filas de cuota) ni a planes ya totalmente pagados. Solo cuentan planes con alguna cuota
 * pagada: los checkouts abandonados no suman.
 *
 * Ver spec_installment_gating.md.
 */

/**
 * Carga el gate de cuotas del usuario. Requiere el `AccessUser` ya cargado (role + closer_type)
 * para saltarse el gating en acceso universal sin tocar la BD de más.
 */
export async function loadInstallmentGate(
    userId: string,
    user: AccessUser,
): Promise<InstallmentGate> {
    // Staff / acceso universal nunca están limitados por cuotas.
    if (hasUniversalCourseAccess(user)) return OPEN_GATE

    const rows = await prisma.payment.findMany({
        where: { user_id: userId, payment_type: 'installment' },
        select: { status: true, installment_plan_id: true },
    })
    // Solo cuentan los planes con alguna cuota pagada. Las cuotas de un checkout abandonado
    // inflaban el total (menos tramos de los que tocan) y a quien pagó en pago único y antes
    // abandonó un plan de cuotas le bloqueaban todo el contenido.
    const live = livePlanIds(rows)
    const planRows = rows.filter((r) => r.installment_plan_id && live.has(r.installment_plan_id))
    const total = planRows.length
    const paid = planRows.filter((r) => r.status === 'completed').length
    // Pago único / complimentary → sin plan de cuotas vivo → no gated. Plan pagado del todo → no gated.
    const applies = total > 0 && paid < total
    return { applies, total, paid }
}

/**
 * ¿El usuario puede acceder a este curso/módulo bajo el gating por cuotas?
 * Comprueba la posición del curso en el catálogo publicado y la del módulo dentro del curso.
 * Pensada para enforcement server-side (página de lección + APIs).
 */
export async function isCourseModuleUnlocked(
    userId: string,
    user: AccessUser,
    courseId: string,
    moduleId: string | null = null,
): Promise<boolean> {
    const gate = await loadInstallmentGate(userId, user)
    if (!gate.applies) return true

    // Nivel curso — posición en el catálogo publicado ordenado.
    const courses = await prisma.course.findMany({
        where: { published: true },
        orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
        select: { id: true },
    })
    const courseIdx = courses.findIndex((c) => c.id === courseId)
    // Curso desconocido / no publicado (admin/preview) → no lo gateamos aquí.
    if (courseIdx === -1) return true
    if (isItemLocked(courseIdx, courses.length, gate)) return false

    if (!moduleId) return true

    // Nivel módulo — posición dentro del curso.
    const modules = await prisma.module.findMany({
        where: { course_id: courseId },
        orderBy: { order: 'asc' },
        select: { id: true },
    })
    const modIdx = modules.findIndex((m) => m.id === moduleId)
    if (modIdx === -1) return true
    return !isItemLocked(modIdx, modules.length, gate)
}

/**
 * Variante self-contained para rutas API: carga los campos de acceso del usuario y aplica el
 * gating. Los admins pasan siempre. Devuelve false si el usuario no existe.
 */
export async function isLessonUnlockedForUser(
    userId: string,
    courseId: string,
    moduleId: string | null = null,
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, closer_enabled: true, closer_type: true, payment_status: true },
    })
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return isCourseModuleUnlocked(userId, user, courseId, moduleId)
}
