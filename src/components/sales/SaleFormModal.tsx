'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Upload, Trash2, Check, AlertTriangle } from 'lucide-react'
import { PhoneInputWithPrefix } from './PhoneInputWithPrefix'
import type { SaleDTO } from '@/lib/sales'

interface Props {
    open: boolean
    onClose: () => void
    onCreated: (sale: SaleDTO) => void
}

type PaymentType = 'SINGLE' | 'INSTALLMENTS'

export function SaleFormModal({ open, onClose, onCreated }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Customer
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    // Package
    const [packageName, setPackageName] = useState('')
    const [packageDescription, setPackageDescription] = useState('')

    // Money
    const [totalAmountEur, setTotalAmountEur] = useState('')
    const [paymentType, setPaymentType] = useState<PaymentType>('SINGLE')
    const [installmentCount, setInstallmentCount] = useState('2')
    const [firstInstallmentEur, setFirstInstallmentEur] = useState('')
    const [restInstallmentEur, setRestInstallmentEur] = useState('')
    // Track whether the user has manually overridden each installment amount.
    // While "manual" is false, the value is auto-filled from total+count.
    const [firstIsManual, setFirstIsManual] = useState(false)
    const [restIsManual, setRestIsManual] = useState(false)

    // Date
    const today = new Date().toISOString().slice(0, 10)
    const [saleDate, setSaleDate] = useState(today)

    // Screenshot
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)

    function reset() {
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhone('')
        setPackageName('')
        setPackageDescription('')
        setTotalAmountEur('')
        setPaymentType('SINGLE')
        setInstallmentCount('2')
        setFirstInstallmentEur('')
        setRestInstallmentEur('')
        setFirstIsManual(false)
        setRestIsManual(false)
        setSaleDate(today)
        setScreenshotUrl(null)
        setError(null)
    }

    async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Error subiendo la captura')
            }
            const data = await res.json()
            setScreenshotUrl(data.url)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error subiendo la captura')
        } finally {
            setUploading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!screenshotUrl) {
            setError('Sube una captura como evidencia')
            return
        }

        const totalCents = Math.round(parseFloat(totalAmountEur || '0') * 100)
        if (!Number.isFinite(totalCents) || totalCents <= 0) {
            setError('Monto total inválido')
            return
        }

        const body: Record<string, unknown> = {
            customer_first_name: firstName.trim(),
            customer_last_name: lastName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            package_name: packageName.trim(),
            package_description: packageDescription.trim() || null,
            total_amount: totalCents,
            payment_type: paymentType,
            screenshot_url: screenshotUrl,
            sale_date: new Date(saleDate).toISOString(),
        }

        if (paymentType === 'INSTALLMENTS') {
            const count = parseInt(installmentCount, 10)
            const firstCents = Math.round(parseFloat(firstInstallmentEur || '0') * 100)
            const restCents = Math.round(parseFloat(restInstallmentEur || '0') * 100)
            if (!count || count < 2) {
                setError('Las cuotas deben ser al menos 2')
                return
            }
            if (firstCents <= 0 || restCents <= 0) {
                setError('Montos de cuotas inválidos')
                return
            }
            const sumCents = firstCents + restCents * (count - 1)
            if (sumCents !== totalCents) {
                const fmtEur = (c: number) => `€${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                const diff = totalCents - sumCents
                const verb = diff > 0 ? 'faltan' : 'sobran'
                setError(`La suma de las cuotas (${fmtEur(sumCents)}) no coincide con el total (${fmtEur(totalCents)}): ${verb} ${fmtEur(Math.abs(diff))}.`)
                return
            }
            body.installment_count = count
            body.first_installment_amount = firstCents
            body.rest_installment_amount = restCents
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Error al guardar')
            }
            const sale: SaleDTO = await res.json()
            onCreated(sale)
            reset()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Installments: derived values, auto-fill, and validation ──
    const totalCentsCurrent = Math.round(parseFloat(totalAmountEur || '0') * 100)
    const countCurrent = parseInt(installmentCount, 10) || 0
    const firstCentsCurrent = Math.round(parseFloat(firstInstallmentEur || '0') * 100)
    const restCentsCurrent = Math.round(parseFloat(restInstallmentEur || '0') * 100)
    const installmentsValid = paymentType === 'INSTALLMENTS' && totalCentsCurrent > 0 && countCurrent >= 2

    // Auto-fill rules:
    //   - both auto: split evenly, first absorbs the rounding remainder so sum = total exactly.
    //   - first manual, rest auto: rest = floor((total - first) / (count - 1))
    //   - rest manual, first auto: first = total - rest * (count - 1)
    //   - both manual: leave as-is; banner will flag mismatch.
    useEffect(() => {
        if (!installmentsValid) return

        const writeIfDifferent = (current: string, nextCents: number, setter: (v: string) => void) => {
            if (nextCents <= 0) return
            const next = (nextCents / 100).toFixed(2)
            if (next !== current) setter(next)
        }

        if (!firstIsManual && !restIsManual) {
            const rest = Math.floor(totalCentsCurrent / countCurrent)
            const first = totalCentsCurrent - rest * (countCurrent - 1)
            writeIfDifferent(firstInstallmentEur, first, setFirstInstallmentEur)
            writeIfDifferent(restInstallmentEur, rest, setRestInstallmentEur)
        } else if (firstIsManual && !restIsManual) {
            if (firstCentsCurrent > 0 && firstCentsCurrent < totalCentsCurrent) {
                const rest = Math.floor((totalCentsCurrent - firstCentsCurrent) / (countCurrent - 1))
                writeIfDifferent(restInstallmentEur, rest, setRestInstallmentEur)
            }
        } else if (!firstIsManual && restIsManual) {
            if (restCentsCurrent > 0) {
                const first = totalCentsCurrent - restCentsCurrent * (countCurrent - 1)
                writeIfDifferent(firstInstallmentEur, first, setFirstInstallmentEur)
            }
        }
    }, [
        installmentsValid,
        totalCentsCurrent,
        countCurrent,
        firstIsManual,
        restIsManual,
        firstCentsCurrent,
        restCentsCurrent,
        firstInstallmentEur,
        restInstallmentEur,
    ])

    // Banner: ok if sum matches, warning if mismatch
    let installmentBanner: { ok: boolean; text: string } | null = null
    if (installmentsValid && firstCentsCurrent > 0 && restCentsCurrent > 0) {
        const sumCents = firstCentsCurrent + restCentsCurrent * (countCurrent - 1)
        const fmtEur = (cents: number) => `€${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        if (sumCents === totalCentsCurrent) {
            installmentBanner = {
                ok: true,
                text: `1 × ${fmtEur(firstCentsCurrent)} + ${countCurrent - 1} × ${fmtEur(restCentsCurrent)} = ${fmtEur(sumCents)}`,
            }
        } else {
            const diff = totalCentsCurrent - sumCents
            const verb = diff > 0 ? 'faltan' : 'sobran'
            installmentBanner = {
                ok: false,
                text: `Suma ${fmtEur(sumCents)} ≠ total ${fmtEur(totalCentsCurrent)} · ${verb} ${fmtEur(Math.abs(diff))}`,
            }
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Nueva venta" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cliente */}
                <Section title="Datos del cliente">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Nombre" required>
                            <input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        </Field>
                        <Field label="Apellido" required>
                            <input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        </Field>
                        <Field label="Email" required>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </Field>
                        <Field label="Teléfono" required>
                            <PhoneInputWithPrefix value={phone} onChange={setPhone} required />
                        </Field>
                    </div>
                </Section>

                {/* Producto */}
                <Section title="Producto vendido">
                    <Field label="Nombre del paquete" required>
                        <input className="form-input" value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Ej. Mentoría 3 meses" required />
                    </Field>
                    <Field label="Descripción / notas">
                        <textarea className="form-input" style={{ minHeight: 60 }} value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} placeholder="Opcional" />
                    </Field>
                </Section>

                {/* Pago */}
                <Section title="Pago">
                    <Field label="Monto total (€)" required>
                        <input className="form-input" type="number" step="0.01" min="0" value={totalAmountEur} onChange={(e) => setTotalAmountEur(e.target.value)} required />
                    </Field>
                    <Field label="Tipo de pago" required>
                        <div className="flex gap-2">
                            <PaymentToggle
                                active={paymentType === 'SINGLE'}
                                onClick={() => {
                                    setPaymentType('SINGLE')
                                    // Reset installment state so the next switch back starts fresh
                                    setFirstInstallmentEur('')
                                    setRestInstallmentEur('')
                                    setFirstIsManual(false)
                                    setRestIsManual(false)
                                }}
                            >
                                Pago único
                            </PaymentToggle>
                            <PaymentToggle active={paymentType === 'INSTALLMENTS'} onClick={() => setPaymentType('INSTALLMENTS')}>
                                Cuotas
                            </PaymentToggle>
                        </div>
                    </Field>

                    {paymentType === 'INSTALLMENTS' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="Nº de cuotas" required>
                                <input className="form-input" type="number" min="2" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} required />
                            </Field>
                            <Field label="1ª cuota (€)" required>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={firstInstallmentEur}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setFirstInstallmentEur(v)
                                        setFirstIsManual(v.trim() !== '')
                                    }}
                                    required
                                />
                            </Field>
                            <Field label="Cuotas restantes c/u (€)" required>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={restInstallmentEur}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setRestInstallmentEur(v)
                                        setRestIsManual(v.trim() !== '')
                                    }}
                                    required
                                />
                            </Field>
                            {installmentBanner && (
                                <div
                                    className="sm:col-span-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                                    style={
                                        installmentBanner.ok
                                            ? {
                                                  background: 'rgba(16,185,129,0.08)',
                                                  border: '1px solid rgba(16,185,129,0.28)',
                                                  color: '#34d399',
                                              }
                                            : {
                                                  background: 'rgba(245,158,11,0.08)',
                                                  border: '1px solid rgba(245,158,11,0.30)',
                                                  color: '#fbbf24',
                                              }
                                    }
                                >
                                    {installmentBanner.ok ? (
                                        <Check size={14} className="shrink-0 mt-px" />
                                    ) : (
                                        <AlertTriangle size={14} className="shrink-0 mt-px" />
                                    )}
                                    <span>{installmentBanner.text}</span>
                                </div>
                            )}
                            {(firstIsManual || restIsManual) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFirstIsManual(false)
                                        setRestIsManual(false)
                                        setFirstInstallmentEur('')
                                        setRestInstallmentEur('')
                                    }}
                                    className="sm:col-span-3 self-start text-[11px] underline"
                                    style={{ color: '#9ca3b8' }}
                                >
                                    Restaurar sugerencia automática (división equitativa)
                                </button>
                            )}
                        </div>
                    )}
                </Section>

                {/* Fecha */}
                <Section title="Fecha de la venta">
                    <Field label="Fecha" required>
                        <input className="form-input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
                    </Field>
                </Section>

                {/* Screenshot */}
                <Section title="Captura de pantalla">
                    {screenshotUrl ? (
                        <div className="relative rounded-xl overflow-hidden group"
                            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                    src={screenshotUrl}
                                    alt="Captura del pago"
                                    className="w-full h-auto max-h-80 object-contain"
                                    style={{ background: 'rgba(8,13,24,0.6)' }}
                                />
                            </a>
                            <button
                                type="button"
                                onClick={() => setScreenshotUrl(null)}
                                aria-label="Quitar captura"
                                className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{
                                    background: 'rgba(8,13,24,0.85)',
                                    border: '1px solid rgba(239,68,68,0.35)',
                                    color: '#fca5a5',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <Trash2 size={13} />
                                Quitar
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer"
                            style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)' }}>
                            <Upload size={20} style={{ color: '#9ca3b8' }} />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {uploading ? 'Subiendo…' : 'Sube la captura del pago'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>JPG, PNG, WebP (máx 10 MB)</span>
                            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleScreenshotUpload} />
                        </label>
                    )}
                </Section>

                {error && (
                    <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)' }}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={submitting || uploading || !screenshotUrl}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                            color: '#fff',
                            boxShadow: '0 8px 24px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                        }}>
                        {submitting ? 'Guardando…' : 'Registrar venta'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[1.3px] font-semibold"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#38bdf8' }}>
                {title}
            </h3>
            <div className="space-y-3">{children}</div>
        </div>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </span>
            {children}
        </label>
    )
}

function PaymentToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={
                active
                    ? {
                          background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.1))',
                          border: '1px solid rgba(56,189,248,0.35)',
                          color: '#dee2f2',
                      }
                    : {
                          background: 'transparent',
                          border: '1px solid rgba(129,140,248,0.18)',
                          color: '#9ca3b8',
                      }
            }
        >
            {children}
        </button>
    )
}
