import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOwedPayments } from '@/lib/payments'
import { sendPaymentEmail } from '@/lib/payment-emails'

/**
 * "Enviar enlace de pago": correo al alumno con el pago que le toca ahora y un enlace a /payment
 * de GSA (no a Stripe: las sesiones de checkout caducan a las 24 h). Guarda la fecha de envío
 * para que la ficha muestre cuándo se mandó el último.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const user = await prisma.user.findUnique({
        where: { id },
        select: { name: true, email: true, blocked: true },
    })
    if (!user) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    if (user.blocked) {
        return NextResponse.json(
            { error: 'La cuenta está suspendida: desbloquéala antes de pedirle el pago' },
            { status: 409 },
        )
    }

    const [next] = await getOwedPayments(id)
    if (!next) return NextResponse.json({ error: 'No tiene pagos pendientes' }, { status: 400 })

    const result = await sendPaymentEmail({ variant: 'request', user, payment: next })
    if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'No se pudo enviar el correo' }, { status: 502 })
    }

    const sentAt = new Date()
    await prisma.payment.update({ where: { id: next.id }, data: { payment_link_sent_at: sentAt } })
    return NextResponse.json({ paymentId: next.id, sentAt: sentAt.toISOString(), to: user.email })
}
