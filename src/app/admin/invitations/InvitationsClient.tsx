'use client'

import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface PendingInst {
    amount: string
    dueDate: string
}

interface Invitation {
    id: string
    payment_type: string
    amount_paid: number
    installments: { number: number; amount: number; dueDate: string }[] | null
    used: boolean
    used_at: string | null
    redeemer: { name: string; last_name: string; email: string } | null
    created_at: string
}

function formatEur(cents: number) {
    return (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InvitationsClient() {
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [creating, setCreating] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Form state
    const [paymentType, setPaymentType] = useState<'one_time' | 'installment'>('one_time')
    const [amountPaid, setAmountPaid] = useState('')
    const [pendingInstallments, setPendingInstallments] = useState<PendingInst[]>([])

    useEffect(() => {
        fetchInvitations()
    }, [])

    async function fetchInvitations() {
        const res = await fetch('/api/admin/invitations')
        if (res.ok) setInvitations(await res.json())
        setLoading(false)
    }

    function addInstallment() {
        const now = new Date()
        const nextMonth = new Date(now.getTime() + (pendingInstallments.length + 1) * 30 * 24 * 60 * 60 * 1000)
        setPendingInstallments([...pendingInstallments, {
            amount: '',
            dueDate: nextMonth.toISOString().split('T')[0],
        }])
    }

    function removeInstallment(idx: number) {
        setPendingInstallments(pendingInstallments.filter((_, i) => i !== idx))
    }

    function updateInstallment(idx: number, field: 'amount' | 'dueDate', value: string) {
        setPendingInstallments(pendingInstallments.map((inst, i) =>
            i === idx ? { ...inst, [field]: value } : inst
        ))
    }

    async function handleCreate() {
        setCreating(true)
        try {
            const body: any = {
                paymentType,
                amountPaid: Math.round(parseFloat(amountPaid || '0') * 100),
            }
            if (paymentType === 'installment' && pendingInstallments.length > 0) {
                body.pendingInstallments = pendingInstallments.map(inst => ({
                    amount: Math.round(parseFloat(inst.amount || '0') * 100),
                    dueDate: inst.dueDate,
                }))
            }

            const res = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                const data = await res.json()
                await navigator.clipboard.writeText(data.link)
                setCopiedId(data.id)
                setTimeout(() => setCopiedId(null), 3000)
                setShowForm(false)
                setAmountPaid('')
                setPendingInstallments([])
                setPaymentType('one_time')
                fetchInvitations()
            }
        } finally {
            setCreating(false)
        }
    }

    async function copyLink(id: string) {
        const appUrl = window.location.origin
        await navigator.clipboard.writeText(`${appUrl}/register?invite=${id}`)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 3000)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Invitaciones</h1>
                    <p className="section-subtitle">Genera links únicos para registrar alumnos que pagaron por fuera</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-white font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
                >
                    <MaterialIcon name="add_link" size="text-lg" />
                    Nueva invitación
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15 space-y-4">
                    <h3 className="text-sm font-bold text-on-surface">Generar invitación</h3>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setPaymentType('one_time'); setPendingInstallments([]) }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${paymentType === 'one_time' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-on-surface-variant border border-transparent'}`}
                        >
                            Pago completo
                        </button>
                        <button
                            onClick={() => setPaymentType('installment')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${paymentType === 'installment' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-on-surface-variant border border-transparent'}`}
                        >
                            Cuotas
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            {paymentType === 'one_time' ? 'Monto pagado (EUR)' : 'Primera cuota pagada (EUR)'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amountPaid}
                            onChange={e => setAmountPaid(e.target.value)}
                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                            placeholder="500.00"
                        />
                    </div>

                    {paymentType === 'installment' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cuotas pendientes</label>
                                <button
                                    onClick={addInstallment}
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    + Agregar cuota
                                </button>
                            </div>
                            {pendingInstallments.map((inst, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-on-surface-variant shrink-0 w-16">Cuota {idx + 2}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={inst.amount}
                                        onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                                        className="flex-1 bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                                        placeholder="EUR"
                                    />
                                    <input
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                                        className="bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                                    />
                                    <button onClick={() => removeInstallment(idx)} className="text-red-400 hover:text-red-300 shrink-0">
                                        <MaterialIcon name="close" size="text-sm" />
                                    </button>
                                </div>
                            ))}
                            {pendingInstallments.length === 0 && (
                                <p className="text-xs text-on-surface-variant text-center py-2">Sin cuotas pendientes — el alumno ya pagó todo</p>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={creating || !amountPaid}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {creating ? 'Generando...' : 'Generar y copiar link'}
                    </button>
                </div>
            )}

            {/* Copied toast */}
            {copiedId && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                    <MaterialIcon name="check_circle" size="text-lg" className="text-emerald-400" />
                    <p className="text-sm text-emerald-400 font-medium">Link copiado al portapapeles</p>
                </div>
            )}

            {/* Invitations list */}
            {loading ? (
                <p className="text-sm text-on-surface-variant text-center py-8">Cargando...</p>
            ) : invitations.length === 0 ? (
                <div className="bg-surface-container-low rounded-2xl p-12 border border-outline-variant/15 text-center">
                    <MaterialIcon name="mail" size="text-4xl" className="text-on-surface-variant mb-3" />
                    <p className="text-sm text-on-surface-variant">No hay invitaciones generadas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {invitations.map((inv) => (
                        <div
                            key={inv.id}
                            className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <MaterialIcon
                                    name={inv.used ? 'how_to_reg' : 'link'}
                                    size="text-xl"
                                    className={inv.used ? 'text-emerald-400 shrink-0' : 'text-blue-400 shrink-0'}
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-on-surface">
                                            {formatEur(inv.amount_paid)}€
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            inv.used ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                                        }`}>
                                            {inv.used ? 'Usada' : 'Pendiente'}
                                        </span>
                                        {inv.payment_type === 'installment' && inv.installments && (
                                            <span className="text-[10px] text-on-surface-variant">
                                                + {(inv.installments as any[]).length} cuotas pendientes
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        {inv.used && inv.redeemer
                                            ? `Usada por ${inv.redeemer.name} ${inv.redeemer.last_name} (${inv.redeemer.email}) el ${formatDate(inv.used_at!)}`
                                            : `Creada el ${formatDate(inv.created_at)}`
                                        }
                                    </p>
                                </div>
                            </div>
                            {!inv.used && (
                                <button
                                    onClick={() => copyLink(inv.id)}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-on-surface-variant transition-colors"
                                >
                                    <MaterialIcon name={copiedId === inv.id ? 'check' : 'content_copy'} size="text-sm" />
                                    {copiedId === inv.id ? 'Copiado' : 'Copiar link'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
