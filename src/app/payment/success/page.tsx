import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { completeCheckoutSession } from '@/lib/payments'

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
                // Marca el pago y recalcula el acceso: con otra cuota vencida y pasada la gracia,
                // el alumno sigue en pausa aunque acabe de pagar esta.
                await completeCheckoutSession(checkoutSession)
            }
        } catch {
            // Stripe verification failed — webhook will handle it
        }
    }

    redirect('/onboarding')
}
