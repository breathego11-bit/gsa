'use client'

import { CheckoutButton } from './CheckoutButton'

interface Installment {
    id: string
    amount: number
    installmentNumber: number
    dueDate: string | null
}

interface InstallmentBannerProps {
    installments: Installment[]
}

function formatEur(cents: number) {
    return (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InstallmentBanner({ installments }: InstallmentBannerProps) {
    const now = new Date()

    return (
        <div className="space-y-3">
            {installments.map((inst) => {
                const isOverdue = inst.dueDate ? new Date(inst.dueDate) <= now : false

                return (
                    <div
                        key={inst.id}
                        className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
                            isOverdue
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-surface-container-low border-outline-variant/15'
                        }`}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <span className={`material-symbols-outlined text-2xl shrink-0 ${isOverdue ? 'text-amber-400' : 'text-on-surface-variant'}`}>
                                {isOverdue ? 'warning' : 'event'}
                            </span>
                            <div>
                                <p className="text-sm font-bold text-on-surface">
                                    Cuota #{inst.installmentNumber} — {formatEur(inst.amount)}€
                                </p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    {isOverdue
                                        ? `Vencida${inst.dueDate ? ` el ${formatDate(inst.dueDate)}` : ''} — Realiza el pago para mantener tu acceso`
                                        : inst.dueDate
                                            ? `Vence el ${formatDate(inst.dueDate)}`
                                            : 'Disponible para pagar'
                                    }
                                </p>
                            </div>
                        </div>
                        <CheckoutButton
                            paymentId={inst.id}
                            className={`shrink-0 px-6 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all ${
                                isOverdue
                                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                                    : 'bg-white/10 text-on-surface hover:bg-white/15 border border-outline-variant/20'
                            }`}
                        >
                            {isOverdue ? 'Pagar cuota' : 'Pagar anticipado'}
                        </CheckoutButton>
                    </div>
                )
            })}
        </div>
    )
}
