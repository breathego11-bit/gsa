import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CheckoutButton } from '@/components/payment/CheckoutButton'

export const dynamic = 'force-dynamic'

export default async function PaymentPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { payment_status: true, role: true },
    })

    if (user?.role === 'ADMIN' || user?.payment_status === 'active') {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg-base)' }}>
            <div className="max-w-4xl w-full space-y-10">
                {/* Header */}
                <div className="text-center space-y-3">
                    <Link href="/" className="inline-block mb-4">
                        <img src="/logo_dark.png" alt="GSA" className="h-16 w-auto mx-auto" />
                    </Link>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-on-surface">
                        Accede a la Academia
                    </h1>
                    <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
                        Desbloquea todos los cursos, módulos y recursos de Growth Sales Academy.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* One-time */}
                    <div className="relative bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-secondary">Pago Completo</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-5xl font-black text-on-surface tracking-tighter">1.888€</span>
                                </div>
                                <p className="text-sm text-on-surface-variant mt-2">Pago único — acceso de por vida</p>
                            </div>
                            <ul className="space-y-3 text-sm text-on-surface-variant">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Acceso a todos los cursos
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Certificados de completación
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Recursos descargables
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Ahorra 334€ vs plan de pagos
                                </li>
                            </ul>
                        </div>
                        <CheckoutButton
                            plan="one_time"
                            className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-white font-bold text-sm uppercase tracking-widest hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                            Pagar 1.888€
                        </CheckoutButton>
                    </div>

                    {/* Installment */}
                    <div className="relative bg-surface-container-low rounded-2xl p-8 border border-secondary/30 flex flex-col justify-between">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest rounded-full">
                            Flexible
                        </div>
                        <div className="space-y-6">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-secondary">Plan de Pagos</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-5xl font-black text-on-surface tracking-tighter">740.67€</span>
                                    <span className="text-on-surface-variant text-sm font-medium">/mes</span>
                                </div>
                                <p className="text-sm text-on-surface-variant mt-2">3 cuotas mensuales — total 2.222€</p>
                            </div>
                            <ul className="space-y-3 text-sm text-on-surface-variant">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Acceso inmediato a todos los cursos
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Certificados de completación
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    Recursos descargables
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                                    Paga en 3 cómodas cuotas
                                </li>
                            </ul>
                        </div>
                        <CheckoutButton
                            plan="installment"
                            className="w-full mt-8 py-4 rounded-xl bg-white text-surface-dim font-black text-sm uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Empezar Plan de Pagos
                        </CheckoutButton>
                    </div>
                </div>

                <p className="text-center text-xs text-on-surface-variant">
                    Pagos seguros procesados por Stripe. Puedes cancelar en cualquier momento.
                </p>
            </div>
        </div>
    )
}
