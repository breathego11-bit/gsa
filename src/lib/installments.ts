import { prisma } from '@/lib/prisma'
import { hasUniversalCourseAccess, type AccessUser } from '@/lib/access'

/**
 * Desbloqueo de contenido por cuotas.
 *
 * Un alumno que paga en `N` cuotas ve la formación dividida en `N` tramos: con `k` cuotas
 * pagadas se desbloquean los primeros `k` tramos, tanto del catálogo de cursos como de los
 * módulos dentro de cada curso. El reparto favorece al alumno (tramos de tamaño `ceil(L/N)`).
 *
 * NO aplica a: admins, closers CRM_AND_COURSES (acceso universal), pago único, complimentary
 * (sin filas de cuota) ni a planes ya totalmente pagados.
 *
 * Ver spec_installment_gating.md.
 */

export interface InstallmentGate {
    /** false → sin gating (acceso completo). */
    applies: boolean
    /** Nº total de cuotas del plan. */
    total: number
    /** Nº de cuotas pagadas (Payment.status = 'completed'). */
    paid: number
}

/** Gate abierto — todo desbloqueado. Útil como default para admins / acceso universal. */
export const OPEN_GATE: InstallmentGate = { applies: false, total: 0, paid: 0 }

/**
 * Cuántos ítems líderes de una lista ordenada de longitud `L` están desbloqueados.
 * Tramo = ceil(L / total); desbloqueados = paid * tramo (tope L).
 */
export function unlockedCount(L: number, gate: InstallmentGate): number {
    if (!gate.applies || gate.total <= 0 || gate.paid >= gate.total) return L
    const tranche = Math.ceil(L / gate.total)
    return Math.min(L, gate.paid * tranche)
}

/** ¿El ítem en la posición `index` (0-based) de una lista de longitud `L` está bloqueado? */
export function isItemLocked(index: number, L: number, gate: InstallmentGate): boolean {
    return index >= unlockedCount(L, gate)
}

/**
 * Nº de cuota que desbloquea el ítem en `index`. Devuelve 0 cuando no hay gating (siempre
 * accesible). Ej: tramo=2, index=3 → floor(3/2)+1 = cuota 2.
 */
export function itemUnlockInstallment(index: number, L: number, gate: InstallmentGate): number {
    if (!gate.applies || gate.total <= 0) return 0
    const tranche = Math.ceil(L / gate.total)
    return Math.floor(index / tranche) + 1
}

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
        select: { status: true },
    })
    const total = rows.length
    const paid = rows.filter((r) => r.status === 'completed').length
    // Pago único / complimentary → sin filas de cuota → no gated. Plan pagado del todo → no gated.
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
