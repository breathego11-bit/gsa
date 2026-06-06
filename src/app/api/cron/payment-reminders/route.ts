import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { PaymentReminderEmail } from '@/emails/PaymentReminderEmail'

export const dynamic = 'force-dynamic'

/**
 * Daily cron endpoint — sends a "7 days until due" reminder for each pending installment.
 *
 * Authorization: requires header `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Idempotency:
 *   - The query filters out installments that already have `reminder_sent_at`.
 *   - We use a 48-hour window [today+6, today+8] so that if the cron is delayed,
 *     missed runs catch up the next day without losing reminders.
 *
 * Response: JSON summary { checked, sent, failed, errors }.
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

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo_dark.png`

    // [today+6 .. today+8) window
    const now = new Date()
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
            due_date: true,
            user: { select: { id: true, name: true, email: true } },
        },
    })

    const errors: Array<{ paymentId: string; error: string }> = []
    let sent = 0

    for (const p of candidates) {
        if (!p.user?.email || !p.due_date || !p.installment_number) continue

        const amountEur = (p.amount / 100).toLocaleString('es-ES', {
            style: 'currency',
            currency: p.currency.toUpperCase(),
        })

        const result = await sendEmail({
            to: p.user.email,
            subject: `Recordatorio: tu cuota vence en 7 días`,
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

    return NextResponse.json({
        checked: candidates.length,
        sent,
        failed: errors.length,
        errors,
        window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    })
}
