import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
    const stripe = getStripe()
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session
            const userId = session.metadata?.user_id
            if (!userId) break

            // Update payment record
            await prisma.payment.updateMany({
                where: { stripe_checkout_id: session.id },
                data: {
                    status: session.mode === 'payment' ? 'completed' : 'pending',
                    stripe_subscription_id: session.subscription as string | null,
                    installments_paid: session.mode === 'payment' ? 1 : 0,
                },
            })

            // Activate user access
            await prisma.user.update({
                where: { id: userId },
                data: { payment_status: 'active' },
            })

            break
        }

        case 'invoice.paid': {
            const invoice = event.data.object as Stripe.Invoice
            const subscriptionId = (invoice as any).subscription as string | null
            if (!subscriptionId) break

            const payment = await prisma.payment.findFirst({
                where: { stripe_subscription_id: subscriptionId },
            })
            if (!payment) break

            const newCount = payment.installments_paid + 1
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    installments_paid: newCount,
                    status: newCount >= payment.installments_total ? 'completed' : 'pending',
                },
            })

            // Ensure user stays active
            await prisma.user.update({
                where: { id: payment.user_id },
                data: { payment_status: 'active' },
            })

            // Cancel subscription after all installments are paid
            if (newCount >= payment.installments_total) {
                try {
                    await stripe.subscriptions.cancel(subscriptionId)
                } catch {
                    // Subscription may already be cancelled
                }
            }

            break
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice
            const subscriptionId = (invoice as any).subscription as string | null
            if (!subscriptionId) break

            const payment = await prisma.payment.findFirst({
                where: { stripe_subscription_id: subscriptionId },
            })
            if (!payment) break

            await prisma.user.update({
                where: { id: payment.user_id },
                data: { payment_status: 'past_due' },
            })

            break
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription
            const payment = await prisma.payment.findFirst({
                where: { stripe_subscription_id: subscription.id },
            })
            if (!payment) break

            // Only revoke access if not fully paid
            if (payment.installments_paid < payment.installments_total) {
                await prisma.user.update({
                    where: { id: payment.user_id },
                    data: { payment_status: 'cancelled' },
                })
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: 'failed' },
                })
            }

            break
        }
    }

    return NextResponse.json({ received: true })
}
