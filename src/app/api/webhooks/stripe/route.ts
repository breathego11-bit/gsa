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

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) return NextResponse.json({ received: true })

        // Mark the specific payment as completed
        await prisma.payment.updateMany({
            where: { stripe_checkout_id: session.id },
            data: { status: 'completed' },
        })

        // Activate user access (first payment or one-time)
        await prisma.user.update({
            where: { id: userId },
            data: { payment_status: 'active' },
        })
    }

    return NextResponse.json({ received: true })
}
