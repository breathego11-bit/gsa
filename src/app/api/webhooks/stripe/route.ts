import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { completeCheckoutSession } from '@/lib/payments'
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
        await completeCheckoutSession(session)
    }

    return NextResponse.json({ received: true })
}
