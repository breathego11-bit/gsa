'use client'

import { useState } from 'react'
import type { PricingConfig } from '@/lib/stripe'

interface Props {
    initialPricing: PricingConfig
}

function centsToCurrency(cents: number) {
    return (cents / 100).toFixed(2)
}

function currencyToCents(value: string) {
    return Math.round(parseFloat(value || '0') * 100)
}

export function SettingsClient({ initialPricing }: Props) {
    const [totalPrice, setTotalPrice] = useState(centsToCurrency(initialPricing.totalPrice))
    const [firstInstallment, setFirstInstallment] = useState(centsToCurrency(initialPricing.firstInstallment))
    const [installmentCount, setInstallmentCount] = useState(String(initialPricing.installmentCount))
    const [interestRate, setInterestRate] = useState(String(initialPricing.interestRate ?? 0))
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const totalCents = currencyToCents(totalPrice)
    const firstCents = currencyToCents(firstInstallment)
    const count = parseInt(installmentCount) || 1
    const interest = parseFloat(interestRate) || 0

    // Compute preview with interest
    const totalWithInterest = count > 1 ? Math.round(totalCents * (1 + interest / 100)) : totalCents
    const remaining = totalWithInterest - firstCents
    const perRemainder = count > 1 ? Math.ceil(remaining / (count - 1)) : 0

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pricing: {
                        totalPrice: totalCents,
                        firstInstallment: firstCents,
                        installmentCount: count,
                        interestRate: interest,
                    },
                }),
            })
            if (res.ok) {
                setMessage({ text: 'Configuración guardada', type: 'success' })
            } else {
                const data = await res.json()
                setMessage({ text: data.error || 'Error al guardar', type: 'error' })
            }
        } catch {
            setMessage({ text: 'Error de conexión', type: 'error' })
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(null), 4000)
        }
    }

    return (
        <div className="p-6 sm:p-10 max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">Configuración</h1>
                <p className="text-sm text-on-surface-variant mt-1">Configura los precios y opciones de pago de la plataforma</p>
            </div>

            {/* Pricing Config */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-on-surface">Precios</h2>
                    <p className="text-xs text-on-surface-variant mt-1">Los alumnos verán estas opciones al momento de pagar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Precio total (EUR)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={totalPrice}
                            onChange={e => setTotalPrice(e.target.value)}
                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                            placeholder="1888.00"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Número de cuotas</label>
                        <input
                            type="number"
                            min="1"
                            max="12"
                            value={installmentCount}
                            onChange={e => setInstallmentCount(e.target.value)}
                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                            placeholder="3"
                        />
                    </div>
                </div>

                {count > 1 && (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Primera cuota (EUR)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={firstInstallment}
                                onChange={e => setFirstInstallment(e.target.value)}
                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                placeholder="500.00"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Interés (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    </>
                )}

                {/* Live Preview */}
                <div className="bg-surface-container rounded-xl p-4 border border-white/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Vista previa</p>
                    {count <= 1 ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-on-surface">Pago completo</span>
                            <span className="text-sm font-bold text-on-surface">{centsToCurrency(totalCents)} EUR</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-on-surface">Pago completo</span>
                                <span className="text-sm font-bold text-on-surface">{centsToCurrency(totalCents)} EUR</span>
                            </div>
                            <div className="border-t border-white/5 pt-2 mt-2">
                                <p className="text-xs text-on-surface-variant mb-2">
                                    Plan de cuotas ({count} cuotas{interest > 0 ? ` + ${interest}% interés` : ''}):
                                </p>
                                {Array.from({ length: count }).map((_, i) => {
                                    const amount = i === 0 ? firstCents : perRemainder
                                    return (
                                        <div key={i} className="flex items-center justify-between py-0.5">
                                            <span className="text-sm text-on-surface-variant">
                                                Cuota {i + 1} {i === 0 ? '(al inscribirse)' : `(mes ${i})`}
                                            </span>
                                            <span className="text-sm font-medium text-on-surface">{centsToCurrency(amount)} EUR</span>
                                        </div>
                                    )
                                })}
                                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                                    <span className="text-sm font-bold text-on-surface-variant">Total cuotas</span>
                                    <span className="text-sm font-bold text-on-surface">
                                        {centsToCurrency(firstCents + perRemainder * (count - 1))} EUR
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {message && (
                    <p className={`text-sm rounded-xl p-3 ${message.type === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {message.text}
                    </p>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar configuración'}
                </button>
            </div>
        </div>
    )
}
