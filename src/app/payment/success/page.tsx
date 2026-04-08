import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const { session_id } = await searchParams

    // Verify payment with Stripe and activate user if webhook hasn't processed yet
    if (session_id) {
        try {
            const checkoutSession = await stripe.checkout.sessions.retrieve(session_id)

            if (checkoutSession.payment_status === 'paid' || checkoutSession.status === 'complete') {
                const userId = checkoutSession.metadata?.user_id
                if (userId) {
                    // Activate user access
                    await prisma.user.update({
                        where: { id: userId },
                        data: { payment_status: 'active' },
                    })

                    // Update payment record
                    await prisma.payment.updateMany({
                        where: { stripe_checkout_id: checkoutSession.id },
                        data: {
                            status: checkoutSession.mode === 'payment' ? 'completed' : 'pending',
                            stripe_subscription_id: checkoutSession.subscription as string | null,
                            installments_paid: checkoutSession.mode === 'payment' ? 1 : 1,
                        },
                    })
                }
            }
        } catch {
            // Stripe verification failed — webhook will handle it
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                    </span>
                </div>
                <h1 className="text-3xl font-black text-on-surface tracking-tight">
                    Pago Exitoso
                </h1>
                <p className="text-on-surface-variant">
                    Tu acceso a Growth Sales Academy ha sido activado. Ya puedes inscribirte y acceder a todos los cursos.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    Ir al Dashboard
                </Link>
            </div>
        </div>
    )
}
