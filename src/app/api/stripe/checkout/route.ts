import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, PRICING } from '@/lib/stripe'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json() as { plan: 'one_time' | 'installment' }
    if (!['one_time', 'installment'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { payment_status: true, stripe_customer_id: true, email: true, name: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.payment_status === 'active') {
        return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    // Find or create Stripe Customer
    let customerId = user.stripe_customer_id
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email!,
            name: user.name!,
            metadata: { user_id: session.user.id },
        })
        customerId = customer.id
        await prisma.user.update({
            where: { id: session.user.id },
            data: { stripe_customer_id: customerId },
        })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (plan === 'one_time') {
        // One-time payment: 1,888 EUR
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: PRICING.currency,
                    product_data: {
                        name: 'Growth Sales Academy — Acceso Completo',
                        description: 'Acceso de por vida a todos los cursos de la academia',
                    },
                    unit_amount: PRICING.ONE_TIME.amount,
                },
                quantity: 1,
            }],
            metadata: { user_id: session.user.id, plan: 'one_time' },
            success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/payment/cancel`,
        })

        await prisma.payment.create({
            data: {
                user_id: session.user.id,
                stripe_checkout_id: checkoutSession.id,
                payment_type: 'one_time',
                amount_total: PRICING.ONE_TIME.amount,
                currency: PRICING.currency,
                status: 'pending',
                installments_total: 1,
            },
        })

        return NextResponse.json({ url: checkoutSession.url })
    }

    // Installment plan: 3 x 740.67 EUR/month
    const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{
            price_data: {
                currency: PRICING.currency,
                product_data: {
                    name: 'Growth Sales Academy — Plan de Pagos',
                    description: 'Acceso a todos los cursos (3 cuotas mensuales)',
                },
                unit_amount: PRICING.INSTALLMENT.amount,
                recurring: { interval: 'month' },
            },
            quantity: 1,
        }],
        subscription_data: {
            metadata: { user_id: session.user.id, plan: 'installment' },
        },
        metadata: { user_id: session.user.id, plan: 'installment' },
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment/cancel`,
    })

    await prisma.payment.create({
        data: {
            user_id: session.user.id,
            stripe_checkout_id: checkoutSession.id,
            payment_type: 'installment',
            amount_total: PRICING.INSTALLMENT.amount * PRICING.INSTALLMENT.months,
            currency: PRICING.currency,
            status: 'pending',
            installments_total: 3,
        },
    })

    return NextResponse.json({ url: checkoutSession.url })
}
