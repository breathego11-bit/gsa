import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncPaymentStatus } from '@/lib/payments'

/**
 * Corrige a mano el estado de un pago desde "Información de pago" y recalcula el acceso.
 *   - `pending`   — devuelve a pendiente un pago registrado a mano (sin checkout de Stripe).
 *                   Lo cobrado por Stripe no se deshace aquí: se reembolsa en Stripe.
 *   - `completed` — lo marca pagado (cobro por transferencia u otro medio).
 * El progreso del alumno no se toca: perder el acceso no borra nada.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, paymentId } = await params
    const { status } = (await req.json().catch(() => ({}))) as { status?: string }
    if (status !== 'pending' && status !== 'completed') {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
        where: { id: paymentId, user_id: id },
        select: { id: true, status: true, stripe_checkout_id: true, due_date: true },
    })
    if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    const now = new Date()
    let updated: number
    if (status === 'pending') {
        if (payment.status !== 'completed') {
            return NextResponse.json({ error: 'Solo se puede devolver a pendiente un pago completado' }, { status: 409 })
        }
        if (payment.stripe_checkout_id) {
            return NextResponse.json(
                { error: 'Este pago se cobró por Stripe: si hay que devolverlo, reembólsalo desde Stripe' },
                { status: 409 },
            )
        }
        // Ciclo de cobro nuevo: vence hoy salvo que su fecha aún no haya llegado, y los avisos
        // se reinician (si no, un aviso de vencida antiguo lo pausaría de inmediato).
        const res = await prisma.payment.updateMany({
            where: { id: payment.id, status: 'completed', stripe_checkout_id: null },
            data: {
                status: 'pending',
                due_date: payment.due_date && payment.due_date > now ? payment.due_date : now,
                reminder_sent_at: null,
                overdue_notice_sent_at: null,
            },
        })
        updated = res.count
    } else {
        if (payment.status === 'completed') {
            return NextResponse.json({ error: 'El pago ya está pagado' }, { status: 409 })
        }
        const res = await prisma.payment.updateMany({
            where: { id: payment.id, status: { not: 'completed' } },
            data: { status: 'completed' },
        })
        updated = res.count
    }
    if (updated === 0) {
        return NextResponse.json({ error: 'El pago cambió mientras tanto; recarga la página' }, { status: 409 })
    }

    await syncPaymentStatus(id, now)
    const user = await prisma.user.findUnique({ where: { id }, select: { payment_status: true } })
    return NextResponse.json({ status, payment_status: user?.payment_status ?? null })
}
