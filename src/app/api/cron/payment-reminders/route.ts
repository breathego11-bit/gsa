import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { PaymentReminderEmail } from '@/emails/PaymentReminderEmail'
import { OVERDUE_GRACE_DAYS, pauseDate } from '@/lib/payment-rules'
import { syncPaymentStatus } from '@/lib/payments'
import { sendPaymentEmail } from '@/lib/payment-emails'

export const dynamic = 'force-dynamic'

/**
 * Daily cron endpoint — cobro de cuotas (spec_invitation_payment.md §5):
 *   1. Recordatorio "vence en 7 días" para cada cuota pendiente.
 *   2. Aviso "tu cuota ha vencido": fija el día en que se pausará el acceso (aviso + gracia).
 *   3. Pausa: quien sigue sin pagar pasada la gracia pasa a `past_due` (sin acceso a los cursos,
 *      con el progreso intacto) y recibe el correo de acceso pausado.
 * Solo cuentan las cuotas de planes con algo pagado: los checkouts abandonados no avisan ni pausan.
 *
 * Authorization: requires header `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Idempotency:
 *   - Reminders skip installments that already have `reminder_sent_at`; overdue notices skip
 *     those with `overdue_notice_sent_at`.
 *   - We use a 48-hour window [today+6, today+8] so that if the cron is delayed,
 *     missed runs catch up the next day without losing reminders.
 *   - The pause email goes out only on the actual active → past_due transition.
 *
 * Response: JSON summary per step.
 */
export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET no configurado en el servidor' }, { status: 500 })
    }
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const reminders = await sendDueSoonReminders(now)
    const overdueNotices = await sendOverdueNotices(now)
    const paused = await pauseUnpaid(now)

    return NextResponse.json({ reminders, overdueNotices, paused, graceDays: OVERDUE_GRACE_DAYS })
}

/** Planes (de entre `planIds`) con al menos una cuota pagada. */
async function livePlansAmong(planIds: (string | null)[]): Promise<Set<string>> {
    const ids = [...new Set(planIds.filter((id): id is string => !!id))]
    if (ids.length === 0) return new Set()
    const rows = await prisma.payment.findMany({
        where: { installment_plan_id: { in: ids }, status: 'completed' },
        select: { installment_plan_id: true },
        distinct: ['installment_plan_id'],
    })
    return new Set(rows.map((r) => r.installment_plan_id!))
}

// ── 1. Recordatorio 7 días antes ─────────────────────────────────────────────

async function sendDueSoonReminders(now: Date) {
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo_dark.png`

    // [today+6 .. today+8) window
    const windowStart = new Date(now)
    windowStart.setHours(0, 0, 0, 0)
    windowStart.setDate(windowStart.getDate() + 6)
    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 2)

    const candidates = await prisma.payment.findMany({
        where: {
            payment_type: 'installment',
            status: 'pending',
            reminder_sent_at: null,
            due_date: { gte: windowStart, lt: windowEnd },
        },
        select: {
            id: true,
            amount: true,
            currency: true,
            installment_number: true,
            installment_plan_id: true,
            due_date: true,
            user: { select: { id: true, name: true, email: true } },
        },
    })
    const live = await livePlansAmong(candidates.map((p) => p.installment_plan_id))

    const errors: Array<{ paymentId: string; error: string }> = []
    let sent = 0

    for (const p of candidates) {
        if (!p.installment_plan_id || !live.has(p.installment_plan_id)) continue
        if (!p.user?.email || !p.due_date || !p.installment_number) continue

        const amountEur = (p.amount / 100).toLocaleString('es-ES', {
            style: 'currency',
            currency: p.currency.toUpperCase(),
        })

        const result = await sendEmail({
            to: p.user.email,
            subject: 'Tu próxima cuota vence en 7 días',
            react: PaymentReminderEmail({
                firstName: p.user.name,
                installmentNumber: p.installment_number,
                amountEur,
                dueDate: p.due_date,
                paymentUrl: `${appUrl}/dashboard`,
                logoUrl,
            }),
        })

        if (result.ok) {
            await prisma.payment.update({
                where: { id: p.id },
                data: { reminder_sent_at: new Date() },
            })
            sent++
        } else {
            errors.push({ paymentId: p.id, error: result.error || 'unknown' })
        }
    }

    return {
        checked: candidates.length,
        sent,
        failed: errors.length,
        errors,
        window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    }
}

// ── 2. Aviso de cuota vencida ────────────────────────────────────────────────

async function sendOverdueNotices(now: Date) {
    // Solo a quien tiene acceso que perder: sin acceso (`none`), ya pausado o suspendido no aplica.
    const candidates = await prisma.payment.findMany({
        where: {
            payment_type: 'installment',
            status: 'pending',
            overdue_notice_sent_at: null,
            due_date: { lte: now },
            user: { payment_status: 'active', blocked: false },
        },
        orderBy: { due_date: 'asc' },
        select: {
            id: true,
            user_id: true,
            amount: true,
            currency: true,
            payment_type: true,
            installment_number: true,
            installment_plan_id: true,
            due_date: true,
            user: { select: { name: true, email: true } },
        },
    })
    const live = await livePlansAmong(candidates.map((p) => p.installment_plan_id))

    // Un correo por alumno aunque tenga varias vencidas: se cita la más antigua y se marcan todas.
    const byUser = new Map<string, typeof candidates>()
    for (const p of candidates) {
        if (!p.installment_plan_id || !live.has(p.installment_plan_id)) continue
        byUser.set(p.user_id, [...(byUser.get(p.user_id) ?? []), p])
    }

    const errors: Array<{ userId: string; error: string }> = []
    let sent = 0
    for (const [userId, payments] of byUser) {
        const first = payments[0]
        const result = await sendPaymentEmail({
            variant: 'overdue',
            user: first.user,
            payment: first,
            pauseDate: pauseDate(now),
        })
        if (!result.ok) {
            // Sin aviso no hay pausa: se reintenta mañana.
            errors.push({ userId, error: result.error || 'unknown' })
            continue
        }
        // La gracia cuenta desde este instante: es la fecha que acaba de leer el alumno.
        await prisma.payment.updateMany({
            where: { id: { in: payments.map((p) => p.id) }, overdue_notice_sent_at: null },
            data: { overdue_notice_sent_at: now },
        })
        sent++
    }

    return { checked: candidates.length, sent, failed: errors.length, errors }
}

// ── 3. Pausa del acceso pasada la gracia ─────────────────────────────────────

async function pauseUnpaid(now: Date) {
    // Alumnos activos con alguna cuota ya avisada y sin pagar. `syncPaymentStatus` decide si la
    // gracia terminó (misma regla que en cualquier otro punto de la app).
    const noticed = await prisma.payment.findMany({
        where: {
            status: 'pending',
            overdue_notice_sent_at: { not: null },
            user: { payment_status: 'active' },
        },
        orderBy: { due_date: 'asc' },
        select: {
            user_id: true,
            amount: true,
            currency: true,
            payment_type: true,
            installment_number: true,
            due_date: true,
            user: { select: { name: true, email: true, blocked: true } },
        },
    })

    const firstByUser = new Map<string, (typeof noticed)[number]>()
    for (const p of noticed) if (!firstByUser.has(p.user_id)) firstByUser.set(p.user_id, p)

    const errors: Array<{ userId: string; error: string }> = []
    let count = 0
    for (const [userId, p] of firstByUser) {
        const change = await syncPaymentStatus(userId, now)
        if (change?.current !== 'past_due') continue
        count++
        if (p.user.blocked) continue // suspendido: no tiene sentido pedirle el pago
        const result = await sendPaymentEmail({ variant: 'paused', user: p.user, payment: p })
        if (!result.ok) errors.push({ userId, error: result.error || 'unknown' })
    }

    return { checked: firstByUser.size, paused: count, emailFailed: errors.length, errors }
}
