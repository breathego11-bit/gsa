'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Upload, Info } from 'lucide-react'
import type { SaleDTO } from '@/lib/sales'

interface Props {
    open: boolean
    onClose: () => void
    sale: SaleDTO
    onUpdated: (sale: SaleDTO) => void
}

export function SaleEditModal({ open, onClose, sale, onUpdated }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)

    // Customer
    const [firstName, setFirstName] = useState(sale.customer_first_name)
    const [lastName, setLastName] = useState(sale.customer_last_name)
    const [email, setEmail] = useState(sale.customer_email)
    const [phone, setPhone] = useState(sale.customer_phone)

    // Package
    const [packageName, setPackageName] = useState(sale.package_name)
    const [packageDescription, setPackageDescription] = useState(sale.package_description ?? '')

    // Date (yyyy-mm-dd)
    const [saleDate, setSaleDate] = useState(sale.sale_date.slice(0, 10))

    // Screenshot
    const [screenshotUrl, setScreenshotUrl] = useState<string>(sale.screenshot_url)

    // Re-sync state when the modal opens with a different sale (avoid stale state across opens)
    useEffect(() => {
        if (!open) return
        setFirstName(sale.customer_first_name)
        setLastName(sale.customer_last_name)
        setEmail(sale.customer_email)
        setPhone(sale.customer_phone)
        setPackageName(sale.package_name)
        setPackageDescription(sale.package_description ?? '')
        setSaleDate(sale.sale_date.slice(0, 10))
        setScreenshotUrl(sale.screenshot_url)
        setError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sale.id])

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

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
            setError('Todos los datos del cliente son requeridos')
            return
        }
        if (!packageName.trim()) {
            setError('El nombre del paquete es requerido')
            return
        }
        if (!screenshotUrl) {
            setError('La captura es requerida')
            return
        }

        const body: Record<string, unknown> = {
            customer_first_name: firstName.trim(),
            customer_last_name: lastName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            package_name: packageName.trim(),
            package_description: packageDescription.trim() || null,
            screenshot_url: screenshotUrl,
            sale_date: new Date(saleDate).toISOString(),
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Error al guardar')
            }
            const updated: SaleDTO = await res.json()
            onUpdated(updated)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Editar venta" size="lg">
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
                            <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </Field>
                    </div>
                </Section>

                {/* Producto */}
                <Section title="Producto vendido">
                    <Field label="Nombre del paquete" required>
                        <input className="form-input" value={packageName} onChange={(e) => setPackageName(e.target.value)} required />
                    </Field>
                    <Field label="Descripción / notas">
                        <textarea
                            className="form-input"
                            style={{ minHeight: 60 }}
                            value={packageDescription}
                            onChange={(e) => setPackageDescription(e.target.value)}
                        />
                    </Field>
                </Section>

                {/* Fecha */}
                <Section title="Fecha de la venta">
                    <Field label="Fecha" required>
                        <input className="form-input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
                    </Field>
                </Section>

                {/* Screenshot */}
                <Section title="Captura de pantalla">
                    <div className="rounded-xl overflow-hidden"
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
                    </div>
                    <label className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm"
                        style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border)', color: 'var(--text-primary)' }}>
                        <Upload size={14} style={{ color: '#9ca3b8' }} />
                        <span>{uploading ? 'Subiendo…' : 'Reemplazar captura (opcional)'}</span>
                        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleScreenshotUpload} />
                    </label>
                </Section>

                {/* Info: lo que NO se puede editar */}
                <div
                    className="flex items-start gap-3 p-3 rounded-xl text-xs"
                    style={{
                        background: 'rgba(56,189,248,0.06)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        color: '#9ca3b8',
                        lineHeight: 1.5,
                    }}
                >
                    <Info size={14} className="shrink-0 mt-0.5" style={{ color: '#38bdf8' }} />
                    <div>
                        El monto total y el plan de cuotas <strong style={{ color: '#dee2f2' }}>no se editan aquí</strong>. Si necesitas cambiarlos, elimina esta venta y crea una nueva. Las cuotas individuales se gestionan desde la sección &quot;Cuotas&quot; (botones de cobrar/marcar pendiente).
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || uploading}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                            color: '#fff',
                            boxShadow: '0 8px 24px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                        }}
                    >
                        {submitting ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3
                className="text-[11px] uppercase tracking-[1.3px] font-semibold"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#38bdf8' }}
            >
                {title}
            </h3>
            <div className="space-y-3">{children}</div>
        </div>
    )
}

function Field({
    label,
    required,
    children,
}: {
    label: string
    required?: boolean
    children: React.ReactNode
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </span>
            {children}
        </label>
    )
}
