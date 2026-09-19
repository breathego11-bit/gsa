import type { Payment } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { byDueDate, computePaymentStatus, isOwed, livePlanIds } from '@/lib/payment-rules'

/**
 * Estado de pago de un alumno con base de datos. Las reglas están en `payment-rules.ts`;
 * aquí solo se cargan los pagos y se aplican. Ver spec_invitation_payment.md.
 */

/** ¿Entró con una invitación de pago? Entonces todo lo pendiente es su plan asignado. */
async function isInvitedWithPayment(userId: string): Promise<boolean> {
    const n = await prisma.invitation.count({ where: { used_by: userId, is_free: false } })
    return n > 0
}

/**
 * Pagos pendientes que el alumno debe (sin checkouts abandonados), en orden de cobro.
 * El primero es el que tiene que pagar ahora.
 */
export async function getOwedPayments(userId: string): Promise<Payment[]> {
    const [payments, invited] = await Promise.all([
        prisma.payment.findMany({ where: { user_id: userId } }),
        isInvitedWithPayment(userId),
    ])
    const live = livePlanIds(payments)
    return payments.filter((p) => isOwed(p, live, invited)).sort(byDueDate)
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Fija las fechas de las cuotas que se cuentan "desde el primer pago" (invitaciones "pagará al
 * registrarse"): nacen sin `due_date` y con `due_offset_days`; en cuanto su plan tiene un pago
 * cobrado, cada una vence ese número de días después de `paidAt`. Solo toca cuotas aún sin fecha,
 * así que llamarla de más no mueve nada.
 */
export async function anchorPlanDueDates(userId: string, paidAt = new Date()): Promise<void> {
    const pending = await prisma.payment.findMany({
        where: { user_id: userId, status: 'pending', due_date: null, due_offset_days: { not: null } },
        select: { id: true, installment_plan_id: true, due_offset_days: true },
    })
    if (pending.length === 0) return

    const paid = await prisma.payment.findMany({
        where: { user_id: userId, status: 'completed' },
        select: { status: true, installment_plan_id: true },
    })
    const live = livePlanIds(paid)
    for (const p of pending) {
        if (!p.installment_plan_id || !live.has(p.installment_plan_id)) continue
        await prisma.payment.updateMany({
            where: { id: p.id, due_date: null },
            data: { due_date: new Date(paidAt.getTime() + p.due_offset_days! * DAY_MS) },
        })
    }
}

export interface PaymentStatusChange {
    previous: string
    current: string
}

/**
 * Recalcula `payment_status` a partir de los pagos. Es la única función que lo decide tras un
 * cobro, una acción del admin o el cron de impagos. Devuelve el cambio si lo hubo.
 *
 * No toca a quien es `complimentary` ni a quien no tiene ningún `Payment` (usuarios antiguos o
 * de equipo activados a mano): para ellos no hay pagos de los que deducir nada.
 * El progreso del alumno no se toca nunca: perder el acceso no borra nada.
 */
export async function syncPaymentStatus(userId: string, now = new Date()): Promise<PaymentStatusChange | null> {
    const [user, payments] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { payment_status: true } }),
        prisma.payment.findMany({
            where: { user_id: userId },
            select: { status: true, installment_plan_id: true, due_date: true, overdue_notice_sent_at: true },
        }),
    ])
    if (!user || user.payment_status === 'complimentary' || payments.length === 0) return null

    const next = computePaymentStatus(payments, now)
    if (next === user.payment_status) return null

    // Condicionado al estado leído: si otra petición lo cambió entretanto, no se pisa ni se
    // informa de una transición que no hicimos (el cron manda el correo de "pausado" por ella).
    const res = await prisma.user.updateMany({
        where: { id: userId, payment_status: user.payment_status },
        data: { payment_status: next },
    })
    return res.count === 1 ? { previous: user.payment_status, current: next } : null
}

/**
 * Registra un checkout de Stripe cobrado y recalcula el acceso. Lo usan `/payment/success` y el
 * webhook. Si el alumno abrió dos checkouts para la misma cuota, el `Payment` guarda el último:
 * se recurre al `payment_id` de los metadatos para no perder un cobro real.
 */
export async function completeCheckoutSession(session: {
    id: string
    metadata: Record<string, string> | null
}): Promise<void> {
    const userId = session.metadata?.user_id
    if (!userId) return

    const byCheckout = await prisma.payment.updateMany({
        where: { stripe_checkout_id: session.id, user_id: userId },
        data: { status: 'completed' },
    })
    const paymentId = session.metadata?.payment_id
    if (byCheckout.count === 0 && paymentId) {
        await prisma.payment.updateMany({
            where: { id: paymentId, user_id: userId, status: { not: 'completed' } },
            data: { status: 'completed', stripe_checkout_id: session.id },
        })
    }

    await anchorPlanDueDates(userId)
    await syncPaymentStatus(userId)
}
