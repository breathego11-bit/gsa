'use client'

import Link from 'next/link'
import { CheckoutButton } from './CheckoutButton'

interface Installment {
    id: string
    amount: number
    /** "Cuota 2" / "Pago completo" */
    label: string
    dueDate: string | null
    /** Sin fecha aún: vence estos días después del primer pago del plan. */
    offsetDays: number | null
    /** Día en que se pausa el acceso si sigue sin pagarse (solo cuotas ya avisadas). */
    pauseDate: string | null
}

interface InstallmentBannerProps {
    /** `payment_status` del alumno: `none` = aún sin acceso, `past_due` = acceso pausado. */
    status: string
    installments: Installment[]
}

function formatEur(cents: number) {
    return (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
    // Fechas de vencimiento de solo día (00:00 UTC): en UTC se leen como el día correcto.
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Aviso de arriba según el estado: sin acceso aún, acceso pausado o cuota vencida en gracia. */
function Headline({ status, installments }: InstallmentBannerProps) {
    const now = new Date()
    const overdue = installments.filter((i) => i.dueDate && new Date(i.dueDate) <= now)

    let title: string
    let body: string
    if (status === 'past_due') {
        title = 'Tu acceso a los cursos está pausado'
        body = 'Tienes una cuota vencida. Págala para recuperar el acceso: tu progreso se conserva y sigues justo donde lo dejaste.'
    } else if (status === 'none') {
        title = 'Activa tu acceso a los cursos'
        body = installments[0]?.label.startsWith('Cuota')
            ? 'Paga tu primera cuota para empezar la formación.'
            : 'Completa tu pago para empezar la formación.'
    } else if (overdue.length > 0) {
        const pauseDate = overdue.find((i) => i.pauseDate)?.pauseDate
        const today = now.toISOString().slice(0, 10)
        title = overdue.every((i) => i.dueDate!.slice(0, 10) === today) ? 'Tu cuota vence hoy' : 'Tienes una cuota vencida'
        body = pauseDate
            ? `Págala antes del ${formatDate(pauseDate)} para no perder el acceso a los cursos.`
            : 'Págala cuanto antes para mantener tu acceso a los cursos.'
    } else {
        return null
    }

    const alert = status !== 'none'
    return (
        <div
            className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
                alert ? 'bg-amber-500/10 border-amber-500/30' : 'bg-secondary-container/20 border-secondary/30'
            }`}
        >
            <span className={`material-symbols-outlined text-2xl shrink-0 ${alert ? 'text-amber-400' : 'text-secondary'}`}>
                {status === 'past_due' ? 'lock_clock' : alert ? 'warning' : 'lock'}
            </span>
            <div className="flex-1">
                <p className="text-sm font-bold text-on-surface">{title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{body}</p>
            </div>
            <Link
                href="/payment"
                className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white/10 text-on-surface hover:bg-white/15 border border-outline-variant/20 transition-all"
            >
                Ver mi plan
            </Link>
        </div>
    )
}

export function InstallmentBanner({ status, installments }: InstallmentBannerProps) {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    return (
        <div className="space-y-3">
            <Headline status={status} installments={installments} />
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
                                    {inst.label} — {formatEur(inst.amount)}€
                                </p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    {!inst.dueDate
                                        ? inst.offsetDays
                                            ? `Vence ${inst.offsetDays} días después de tu primer pago`
                                            : 'Disponible para pagar'
                                        : isOverdue
                                            ? inst.dueDate.slice(0, 10) === today
                                                ? 'Vence hoy'
                                                : `Vencida el ${formatDate(inst.dueDate)}`
                                            : `Vence el ${formatDate(inst.dueDate)}`}
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
                            {isOverdue ? 'Pagar ahora' : 'Pagar anticipado'}
                        </CheckoutButton>
                    </div>
                )
            })}
        </div>
    )
}
