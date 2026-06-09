'use client'

import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { CloserType } from '@prisma/client'

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
    closer_type: CloserType | null
    is_free: boolean
}

type UserType = 'STUDENT' | 'CRM_ONLY' | 'CRM_AND_COURSES'

const USER_TYPE_LABEL: Record<UserType, string> = {
    STUDENT: 'Estudiante regular',
    CRM_ONLY: 'Closer · CRM only',
    CRM_AND_COURSES: 'Closer · CRM + Formación',
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
    const [userType, setUserType] = useState<UserType>('STUDENT')
    const [isFree, setIsFree] = useState(false)
    const [paymentType, setPaymentType] = useState<'one_time' | 'installment'>('one_time')
    const [amountPaid, setAmountPaid] = useState('')
    const [pendingInstallments, setPendingInstallments] = useState<PendingInst[]>([])
    const [inviteeName, setInviteeName] = useState('')
    const [inviteeEmail, setInviteeEmail] = useState('')
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'warn' | 'error'; text: string } | null>(null)

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
        setFeedback(null)
        try {
            const body: any = {
                closerType: userType === 'STUDENT' ? null : userType,
                isFree,
            }
            if (inviteeEmail.trim()) body.inviteeEmail = inviteeEmail.trim()
            if (inviteeName.trim()) body.inviteeName = inviteeName.trim()
            if (!isFree) {
                body.paymentType = paymentType
                body.amountPaid = Math.round(parseFloat(amountPaid || '0') * 100)
                if (paymentType === 'installment' && pendingInstallments.length > 0) {
                    body.pendingInstallments = pendingInstallments.map(inst => ({
                        amount: Math.round(parseFloat(inst.amount || '0') * 100),
                        dueDate: inst.dueDate,
                    }))
                }
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
                setTimeout(() => setCopiedId(null), 4000)

                // Email feedback
                if (data.emailRequested && data.emailSent) {
                    setFeedback({
                        kind: 'success',
                        text: `Link copiado y enviado por correo a ${inviteeEmail}.`,
                    })
                } else if (data.emailRequested && !data.emailSent) {
                    setFeedback({
                        kind: 'warn',
                        text: `Link copiado al portapapeles, pero el correo falló: ${data.emailError ?? 'error desconocido'}. Compártelo manualmente.`,
                    })
                } else {
                    setFeedback({ kind: 'success', text: 'Link copiado al portapapeles.' })
                }
                setTimeout(() => setFeedback(null), 6000)

                setShowForm(false)
                setUserType('STUDENT')
                setIsFree(false)
                setAmountPaid('')
                setPendingInstallments([])
                setPaymentType('one_time')
                setInviteeName('')
                setInviteeEmail('')
                fetchInvitations()
            } else {
                const data = await res.json().catch(() => ({}))
                setFeedback({ kind: 'error', text: data.error ?? 'Error al crear la invitación' })
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

                    {/* Tipo de usuario */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tipo de usuario</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {(['STUDENT', 'CRM_ONLY', 'CRM_AND_COURSES'] as UserType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setUserType(t)}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left leading-tight ${
                                        userType === t
                                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                            : 'bg-white/5 text-on-surface-variant border border-transparent'
                                    }`}
                                >
                                    {USER_TYPE_LABEL[t]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Datos del invitado (opcional, para envío de email) */}
                    <div className="space-y-1.5 rounded-xl px-3 py-3 bg-white/[0.03] border border-white/5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            Enviar invitación por correo (opcional)
                        </label>
                        <p className="text-xs text-on-surface-variant">
                            Si llenas el email, le mandamos el link automáticamente. Si lo dejas vacío, solo se copia al portapapeles.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <input
                                type="text"
                                value={inviteeName}
                                onChange={(e) => setInviteeName(e.target.value)}
                                placeholder="Nombre (opcional)"
                                className="bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                            />
                            <input
                                type="email"
                                value={inviteeEmail}
                                onChange={(e) => setInviteeEmail(e.target.value)}
                                placeholder="email@dominio.com"
                                className="bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                            />
                        </div>
                    </div>

                    {/* Gratis toggle */}
                    <label className="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                        <input
                            type="checkbox"
                            checked={isFree}
                            onChange={(e) => setIsFree(e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-500"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-on-surface">Acceso gratis (complimentary)</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                No genera registros de pago. El usuario nace con <code className="font-mono">payment_status = complimentary</code>.
                            </p>
                        </div>
                    </label>

                    {/* Sección de pago — sólo si NO es gratis */}
                    {!isFree && (
                        <>
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
                        </>
                    )}

                    {!isFree && paymentType === 'installment' && (
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
                        disabled={creating || (!isFree && !amountPaid)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {creating ? 'Generando...' : 'Generar y copiar link'}
                    </button>
                </div>
            )}

            {/* Feedback after create / copy */}
            {feedback && (
                <div
                    className={`rounded-xl p-3 flex items-start gap-2 border ${
                        feedback.kind === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : feedback.kind === 'warn'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}
                >
                    <MaterialIcon
                        name={feedback.kind === 'success' ? 'check_circle' : feedback.kind === 'warn' ? 'warning' : 'error'}
                        size="text-lg"
                        className="shrink-0 mt-0.5"
                    />
                    <p className="text-sm font-medium leading-snug">{feedback.text}</p>
                </div>
            )}
            {copiedId && !feedback && (
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
                                            {inv.is_free ? 'Gratis' : `${formatEur(inv.amount_paid)}€`}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            inv.used ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                                        }`}>
                                            {inv.used ? 'Usada' : 'Pendiente'}
                                        </span>
                                        {inv.is_free && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                                                Comp
                                            </span>
                                        )}
                                        {inv.closer_type && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                                                {inv.closer_type === 'CRM_ONLY' ? 'Closer · CRM' : 'Closer · CRM + Cursos'}
                                            </span>
                                        )}
                                        {!inv.is_free && inv.payment_type === 'installment' && inv.installments && (
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
