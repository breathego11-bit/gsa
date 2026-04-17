import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, getPricing, computeInstallments } from '@/lib/stripe'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    const stripe = getStripe()
    const session = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { plan?: 'one_time' | 'installment'; paymentId?: string }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { payment_status: true, stripe_customer_id: true, email: true, name: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    const pricing = await getPricing()

    // ── Pay a specific pending installment ──
    if (body.paymentId) {
        const payment = await prisma.payment.findUnique({ where: { id: body.paymentId } })
        if (!payment || payment.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }
        if (payment.status !== 'pending') {
            return NextResponse.json({ error: 'This payment is not pending' }, { status: 400 })
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: payment.currency,
                    product_data: {
                        name: `Growth Sales Academy — Cuota ${payment.installment_number}`,
                    },
                    unit_amount: payment.amount,
                },
                quantity: 1,
            }],
            metadata: { user_id: session.user.id, payment_id: payment.id },
            success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/dashboard`,
        })

        await prisma.payment.update({
            where: { id: payment.id },
            data: { stripe_checkout_id: checkoutSession.id },
        })

        return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Initial payment (new student) ──
    const { plan } = body
    if (!plan || !['one_time', 'installment'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (user.payment_status === 'active') {
        return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    if (plan === 'one_time') {
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Growth Sales Academy — Pago Completo',
                        description: 'Acceso a todos los cursos de la academia',
                    },
                    unit_amount: pricing.totalPrice,
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
                amount: pricing.totalPrice,
                currency: 'eur',
                status: 'pending',
            },
        })

        return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Installment plan ──
    const installments = computeInstallments(pricing)
    const planId = crypto.randomUUID()
    const now = new Date()

    // Create Stripe checkout for first installment
    const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'eur',
                product_data: {
                    name: 'Growth Sales Academy — Cuota 1',
                    description: `Primera cuota de ${pricing.installmentCount}`,
                },
                unit_amount: installments[0].amount,
            },
            quantity: 1,
        }],
        metadata: { user_id: session.user.id, plan: 'installment', installment_plan_id: planId },
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment/cancel`,
    })

    // Create ALL installment Payment records upfront
    const paymentRecords = installments.map((inst, i) => ({
        user_id: session.user.id,
        stripe_checkout_id: i === 0 ? checkoutSession.id : null,
        payment_type: 'installment' as const,
        amount: inst.amount,
        currency: 'eur',
        status: 'pending' as const,
        installment_number: inst.number,
        installment_plan_id: planId,
        due_date: new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000), // +30 days per installment
    }))

    for (const record of paymentRecords) {
        await prisma.payment.create({ data: record })
    }

    return NextResponse.json({ url: checkoutSession.url })
}
