import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const { session_id } = await searchParams

    // Verify payment with Stripe and activate user if webhook hasn't processed yet
    if (session_id) {
        try {
            const stripe = getStripe()
            const checkoutSession = await stripe.checkout.sessions.retrieve(session_id)

            if (checkoutSession.payment_status === 'paid' || checkoutSession.status === 'complete') {
                const userId = checkoutSession.metadata?.user_id
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { payment_status: 'active' },
                    })

                    await prisma.payment.updateMany({
                        where: { stripe_checkout_id: checkoutSession.id },
                        data: { status: 'completed' },
                    })
                }
            }
        } catch {
            // Stripe verification failed — webhook will handle it
        }
    }

    redirect('/onboarding')
}
