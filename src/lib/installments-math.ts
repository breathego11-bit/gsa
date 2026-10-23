/**
 * Desbloqueo de contenido por cuotas — funciones PURAS, sin Prisma.
 *
 * Viven aparte de `installments.ts` (que consulta la base) por el mismo motivo que
 * `payment-rules.ts`: así se pueden probar solas y usar desde el navegador sin arrastrar el
 * cliente de Prisma al bundle.
 *
 * Un alumno que paga en `N` cuotas ve la formación dividida en `N` tramos: con `k` cuotas pagadas
 * se desbloquean los primeros `k` tramos, tanto del catálogo de cursos como de los módulos de cada
 * curso. El reparto favorece al alumno (tramos de tamaño `ceil(L/N)`).
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
