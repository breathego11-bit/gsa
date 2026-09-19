/**
 * Reglas del estado de pago de un alumno — funciones puras, sin Prisma (se usan también en el
 * cliente). La parte con base de datos está en `src/lib/payments.ts`.
 *
 * Ciclo de una cuota impagada (ver spec_invitation_payment.md §5):
 *   D-7  recordatorio "vence en 7 días"                    (cron, `reminder_sent_at`)
 *   D    aviso "tu cuota ha vencido, págala antes del X"   (cron, `overdue_notice_sent_at`)
 *   X    acceso pausado → `payment_status = 'past_due'`    X = día del aviso + OVERDUE_GRACE_DAYS
 * Pausar solo quita el acceso a los cursos: el progreso no se toca. Al pagar vuelve a `active`.
 */

/** Días entre el aviso de cuota vencida y la pausa del acceso. */
export const OVERDUE_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface PaymentRuleInput {
    status: string
    installment_plan_id: string | null
    due_date: Date | null
    overdue_notice_sent_at: Date | null
}

/** Estados que calcula el sistema. `complimentary` y `cancelled` solo los pone un admin. */
export type ComputedPaymentStatus = 'none' | 'active' | 'past_due'

/**
 * Planes con al menos una cuota pagada. Un plan sin ninguna es un checkout abandonado (el
 * checkout general crea todas las cuotas antes de ir a Stripe) o una invitación aún sin pagar:
 * sus cuotas no pueden pausar el acceso de nadie.
 */
export function livePlanIds(payments: Pick<PaymentRuleInput, 'status' | 'installment_plan_id'>[]): Set<string> {
    const ids = new Set<string>()
    for (const p of payments) {
        if (p.status === 'completed' && p.installment_plan_id) ids.add(p.installment_plan_id)
    }
    return ids
}

/**
 * Pagos pendientes que el alumno debe de verdad: las cuotas de un plan vivo y, si entró con una
 * invitación de pago, todo lo pendiente (su plan asignado, aunque aún no haya pagado nada).
 * Quedan fuera los checkouts abandonados de alumnos que se registraron solos.
 */
export function isOwed(p: PaymentRuleInput, live: Set<string>, invitedWithPayment: boolean): boolean {
    if (p.status !== 'pending') return false
    if (invitedWithPayment) return true
    return !!p.installment_plan_id && live.has(p.installment_plan_id)
}

/** Cuota de un plan vivo cuya fecha ya pasó: la única que puede acabar pausando el acceso. */
export function isOverdue(p: PaymentRuleInput, live: Set<string>, now: Date): boolean {
    return (
        p.status === 'pending' &&
        !!p.installment_plan_id &&
        live.has(p.installment_plan_id) &&
        !!p.due_date &&
        p.due_date <= now
    )
}

/**
 * Día en que se pausa el acceso por esta cuota: 00:00 UTC del día del aviso + la gracia.
 * `null` mientras no se haya enviado el aviso de vencida: nadie se pausa sin haber sido avisado.
 */
export function pauseDate(noticeSentAt: Date | null): Date | null {
    if (!noticeSentAt) return null
    const day = Date.UTC(noticeSentAt.getUTCFullYear(), noticeSentAt.getUTCMonth(), noticeSentAt.getUTCDate())
    return new Date(day + OVERDUE_GRACE_DAYS * DAY_MS)
}

/**
 * Estado que corresponde a un alumno según sus pagos:
 *   - ningún pago completado                             → `none`     (sin acceso)
 *   - alguna cuota vencida y avisada, pasada la gracia   → `past_due` (acceso pausado)
 *   - en otro caso                                       → `active`
 * No se aplica a quien no tiene pagos ni a `complimentary`: ver `syncPaymentStatus`.
 */
export function computePaymentStatus(payments: PaymentRuleInput[], now: Date): ComputedPaymentStatus {
    if (!payments.some((p) => p.status === 'completed')) return 'none'
    const live = livePlanIds(payments)
    const paused = payments.some((p) => {
        if (!isOverdue(p, live, now)) return false
        const at = pauseDate(p.overdue_notice_sent_at)
        return !!at && at <= now
    })
    return paused ? 'past_due' : 'active'
}

/** "Cuota 2" / "Pago completo" — cómo se llama un pago ante el alumno. */
export function paymentLabel(p: { payment_type: string; installment_number: number | null }): string {
    return p.payment_type === 'installment' && p.installment_number
        ? `Cuota ${p.installment_number}`
        : 'Pago completo'
}

/**
 * Vencimiento de un pago pendiente en texto, para las cuotas que aún no tienen fecha porque se
 * cuentan desde el primer pago del plan (invitaciones "pagará al registrarse").
 */
export function offsetDueLabel(offsetDays: number | null): string | null {
    return offsetDays ? `Vence ${offsetDays} días después del primer pago` : null
}

/** Orden en que se cobran los pagos pendientes: primero el que vence antes. */
export function byDueDate<T extends { due_date: Date | null; installment_number: number | null }>(a: T, b: T): number {
    const da = a.due_date?.getTime() ?? Number.POSITIVE_INFINITY
    const db = b.due_date?.getTime() ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    return (a.installment_number ?? 0) - (b.installment_number ?? 0)
}
