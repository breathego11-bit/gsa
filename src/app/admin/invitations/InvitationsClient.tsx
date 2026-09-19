'use client'

import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { CloserType } from '@prisma/client'

interface PendingInst {
    amount: string
    /** "Ya pagó por fuera": fecha fija. */
    dueDate: string
    /** "Pagará al registrarse": días después del primer pago. */
    offsetDays: string
}

interface Invitation {
    id: string
    payment_type: string
    amount_paid: number
    installments: { number: number; amount: number; dueDate?: string; offsetDays?: number }[] | null
    used: boolean
    used_at: string | null
    redeemer: { name: string; last_name: string; email: string } | null
    created_at: string
    closer_type: CloserType | null
    is_free: boolean
    pay_on_signup: boolean
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

/** Cómo se cobra: el modo por defecto es el más seguro — un error pide un pago de más, no regala acceso. */
type InviteMode = 'pay_on_signup' | 'paid_externally' | 'free'

const INVITE_MODES: { value: InviteMode; label: string; hint: string }[] = [
    { value: 'pay_on_signup', label: 'Pagará al registrarse', hint: 'Todo queda pendiente. Paga por Stripe desde su panel y entonces obtiene acceso. Las cuotas siguientes se cuentan desde ese primer pago.' },
    { value: 'paid_externally', label: 'Ya pagó por fuera', hint: 'Cobraste por transferencia u otro medio: la cuota 1 se registra como pagada.' },
    { value: 'free', label: 'Gratis', hint: 'Beca o cortesía. No genera pagos: nace con payment_status = complimentary.' },
]

/** "Pendiente de pago · 3 × 500,00 €" — lo que se le cobrará, sin que parezca ya cobrado. */
function pendingPaymentLabel(inv: Invitation): string {
    const amounts = [inv.amount_paid, ...(inv.installments ?? []).map((i) => i.amount)]
    if (amounts.length === 1) return `Pendiente de pago · ${formatEur(amounts[0])}€`
    const total = amounts.reduce((sum, a) => sum + a, 0)
    return amounts.every((a) => a === amounts[0])
        ? `Pendiente de pago · ${amounts.length} × ${formatEur(amounts[0])}€`
        : `Pendiente de pago · ${formatEur(total)}€ en ${amounts.length} cuotas`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Mismo criterio que valida la API en POST /api/admin/invitations. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Céntimos → valor del input en EUR ("1888.00"). */
function toEurInput(cents: number) {
    return (cents / 100).toFixed(2)
}

/** Valor del input en EUR → céntimos. */
function toCents(eur: string) {
    return Math.round(parseFloat(eur || '0') * 100)
}

/** Fecha fija por defecto de la cuota siguiente `idx` (0 = cuota 2): cada 30 días desde hoy. */
function defaultDueDate(idx: number) {
    return new Date(Date.now() + (idx + 1) * 30 * DAY_MS).toISOString().split('T')[0]
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
    /** Precio del curso en pago único, en céntimos. */
    coursePrice: number
    /** Lo que cuesta el curso pagando en cuotas (con el recargo configurado), en céntimos. */
    installmentPlanTotal: number
    /** Cuántas cuotas se proponen después de la primera. */
    followingInstallments: number
}

export function InvitationsClient({ coursePrice, installmentPlanTotal, followingInstallments }: Props) {
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [creating, setCreating] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Form state
    const [userType, setUserType] = useState<UserType>('STUDENT')
    const [mode, setMode] = useState<InviteMode>('pay_on_signup')
    const isFree = mode === 'free'
    const [paymentType, setPaymentType] = useState<'one_time' | 'installment'>('one_time')
    // "Pagará al registrarse" + pago completo arranca con el precio del curso.
    const [amountPaid, setAmountPaid] = useState(toEurInput(coursePrice))
    // Mientras sea true, las cuotas siguientes se recalculan al cambiar la primera. Se apaga en
    // cuanto el admin toca a mano un importe o añade/quita cuotas.
    const [autoSplit, setAutoSplit] = useState(true)
    const [confirmPrice, setConfirmPrice] = useState(false)
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

    /** Importe inicial según modo y tipo: pagará al registrarse + pago completo = precio del curso. */
    function defaultAmount(m: InviteMode, t: 'one_time' | 'installment') {
        return m === 'pay_on_signup' && t === 'one_time' ? toEurInput(coursePrice) : ''
    }

    function resetPayment(m: InviteMode, t: 'one_time' | 'installment') {
        setAmountPaid(defaultAmount(m, t))
        setPendingInstallments([])
        setAutoSplit(true)
    }

    function selectMode(m: InviteMode) {
        setMode(m)
        resetPayment(m, paymentType)
    }

    function selectPaymentType(t: 'one_time' | 'installment') {
        setPaymentType(t)
        resetPayment(mode, t)
    }

    /**
     * Reparte lo que falta del precio en cuotas entre las cuotas siguientes, a partes iguales (los
     * céntimos sobrantes van a la última). Conserva los días/fechas que ya tuvieran.
     */
    function splitFollowing(firstEur: string, current: PendingInst[]): PendingInst[] {
        const remaining = installmentPlanTotal - toCents(firstEur)
        if (!firstEur || remaining <= 0) return []
        const n = followingInstallments
        const base = Math.floor(remaining / n)
        return Array.from({ length: n }, (_, i) => ({
            amount: toEurInput(i === n - 1 ? remaining - base * (n - 1) : base),
            dueDate: current[i]?.dueDate ?? defaultDueDate(i),
            offsetDays: current[i]?.offsetDays ?? String((i + 1) * 30),
        }))
    }

    function changeAmount(value: string) {
        setAmountPaid(value)
        if (mode === 'pay_on_signup' && paymentType === 'installment' && autoSplit) {
            setPendingInstallments(splitFollowing(value, pendingInstallments))
        }
    }

    function resplit() {
        setAutoSplit(true)
        setPendingInstallments(splitFollowing(amountPaid, pendingInstallments))
    }

    function addInstallment() {
        setAutoSplit(false)
        setPendingInstallments([...pendingInstallments, {
            amount: '',
            dueDate: defaultDueDate(pendingInstallments.length),
            offsetDays: String((pendingInstallments.length + 1) * 30),
        }])
    }

    function removeInstallment(idx: number) {
        setAutoSplit(false)
        setPendingInstallments(pendingInstallments.filter((_, i) => i !== idx))
    }

    function updateInstallment(idx: number, field: 'amount' | 'dueDate' | 'offsetDays', value: string) {
        if (field === 'amount') setAutoSplit(false)
        setPendingInstallments(pendingInstallments.map((inst, i) =>
            i === idx ? { ...inst, [field]: value } : inst
        ))
    }

    // Pago completo por un importe distinto del precio del curso: se confirma antes de generar,
    // porque ese importe le da acceso a todo el curso y no se le cobra ninguna diferencia después.
    const oneTimeCents = toCents(amountPaid)
    const customOneTimePrice =
        mode === 'pay_on_signup' && paymentType === 'one_time' && !!amountPaid && oneTimeCents !== coursePrice

    function requestCreate() {
        if (customOneTimePrice) {
            setConfirmPrice(true)
            return
        }
        handleCreate()
    }

    // Suma del plan en cuotas frente a lo que cuesta el curso a plazos.
    const planSum = toCents(amountPaid) + pendingInstallments.reduce((sum, inst) => sum + toCents(inst.amount), 0)

    // El correo es obligatorio: la invitación se manda por correo, el enlace copiado es el respaldo.
    const email = inviteeEmail.trim()
    const emailValid = EMAIL_RE.test(email)

    useEffect(() => {
        if (!confirmPrice) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setConfirmPrice(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [confirmPrice])

    async function handleCreate() {
        setCreating(true)
        setFeedback(null)
        try {
            const body: any = {
                closerType: userType === 'STUDENT' ? null : userType,
                isFree,
                payOnSignup: mode === 'pay_on_signup',
            }
            body.inviteeEmail = inviteeEmail.trim()
            if (inviteeName.trim()) body.inviteeName = inviteeName.trim()
            if (!isFree) {
                body.paymentType = paymentType
                body.amountPaid = Math.round(parseFloat(amountPaid || '0') * 100)
                if (paymentType === 'installment' && pendingInstallments.length > 0) {
                    body.pendingInstallments = pendingInstallments.map(inst => ({
                        amount: Math.round(parseFloat(inst.amount || '0') * 100),
                        ...(mode === 'pay_on_signup'
                            ? { offsetDays: parseInt(inst.offsetDays || '0', 10) }
                            : { dueDate: inst.dueDate }),
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
                setMode('pay_on_signup')
                setPaymentType('one_time')
                resetPayment('pay_on_signup', 'one_time')
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="section-title">Invitaciones</h1>
                    <p className="section-subtitle">Genera links únicos para registrar alumnos: que paguen al entrar, que ya pagaron o con acceso gratis</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-white font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
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
                            Enviar invitación por correo
                        </label>
                        <p className="text-xs text-on-surface-variant">
                            El correo del invitado es obligatorio: le mandamos el link ahí. También se copia al portapapeles
                            por si tienes que compartirlo a mano.
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
                                placeholder="email@dominio.com (obligatorio)"
                                required
                                aria-invalid={!!email && !emailValid}
                                className={`bg-surface-container-lowest border-none rounded-xl focus:ring-1 text-sm py-2.5 px-3 text-on-surface ${
                                    email && !emailValid ? 'ring-1 ring-red-500/50 focus:ring-red-500' : 'focus:ring-blue-500'
                                }`}
                            />
                        </div>
                        {!!email && !emailValid && (
                            <p className="text-xs text-red-400">Ese correo no tiene un formato válido.</p>
                        )}
                    </div>

                    {/* Cómo se cobra */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cobro</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {INVITE_MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => selectMode(m.value)}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left leading-tight ${
                                        mode === m.value
                                            ? m.value === 'free'
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                            : 'bg-white/5 text-on-surface-variant border border-transparent'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-on-surface-variant">
                            {INVITE_MODES.find((m) => m.value === mode)?.hint}
                        </p>
                    </div>

                    {/* Sección de pago — sólo si NO es gratis */}
                    {!isFree && (
                        <>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => selectPaymentType('one_time')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${paymentType === 'one_time' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-on-surface-variant border border-transparent'}`}
                                >
                                    Pago completo
                                </button>
                                <button
                                    onClick={() => selectPaymentType('installment')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${paymentType === 'installment' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-on-surface-variant border border-transparent'}`}
                                >
                                    Cuotas
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                    {mode === 'pay_on_signup'
                                        ? paymentType === 'one_time' ? 'Importe a pagar (EUR)' : 'Importe de la primera cuota (EUR)'
                                        : paymentType === 'one_time' ? 'Monto pagado (EUR)' : 'Primera cuota pagada (EUR)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountPaid}
                                    onChange={e => changeAmount(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                    placeholder="500.00"
                                />
                                {mode === 'pay_on_signup' && (
                                    <p className="text-xs text-on-surface-variant">
                                        {paymentType === 'one_time'
                                            ? `Precio del curso: ${formatEur(coursePrice)}€`
                                            : `Precio del curso en cuotas: ${formatEur(installmentPlanTotal)}€. Al poner la primera, el resto se reparte en ${followingInstallments} cuotas.`}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {!isFree && paymentType === 'installment' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                    {mode === 'pay_on_signup' ? 'Cuotas siguientes' : 'Cuotas pendientes'}
                                </label>
                                <button
                                    onClick={addInstallment}
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    + Agregar cuota
                                </button>
                            </div>
                            {pendingInstallments.map((inst, idx) => (
                                /*
                                 * `flex-wrap` + `min-w-0`: el input numérico era `flex-1` sin
                                 * `min-w-0`, así que su `min-width:auto` lo anclaba en ~175px;
                                 * con el `<input type=date>` (~140px intrínsecos) la fila pedía
                                 * ~435px sobre 279px y, al no haber `overflow` en el contenedor,
                                 * el desbordamiento subía hasta `main` y desplazaba todo el panel.
                                 */
                                <div key={idx} className="flex flex-wrap items-center gap-3">
                                    <span className="text-xs text-on-surface-variant shrink-0 w-16">Cuota {idx + 2}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={inst.amount}
                                        onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                                        className="flex-1 min-w-0 basis-24 bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                                        placeholder="EUR"
                                    />
                                    {mode === 'pay_on_signup' ? (
                                        // Las fechas se cuentan desde el día que pague la primera cuota.
                                        <label className="flex items-center gap-2 min-w-0 basis-36 sm:basis-auto text-xs text-on-surface-variant">
                                            <input
                                                type="number"
                                                min="1"
                                                max="730"
                                                step="1"
                                                value={inst.offsetDays}
                                                onChange={e => updateInstallment(idx, 'offsetDays', e.target.value)}
                                                className="w-20 bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                                            />
                                            días tras el 1.er pago
                                        </label>
                                    ) : (
                                        <input
                                            type="date"
                                            value={inst.dueDate}
                                            onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                                            className="min-w-0 basis-36 sm:basis-auto bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-2.5 px-3 text-on-surface"
                                        />
                                    )}
                                    <button onClick={() => removeInstallment(idx)} className="text-red-400 hover:text-red-300 shrink-0">
                                        <MaterialIcon name="close" size="text-sm" />
                                    </button>
                                </div>
                            ))}
                            {mode === 'pay_on_signup' && !!amountPaid && (
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className={planSum === installmentPlanTotal ? 'text-on-surface-variant' : 'text-amber-400'}>
                                        Total del plan: {formatEur(planSum)}€
                                        {planSum !== installmentPlanTotal &&
                                            ` · ${formatEur(Math.abs(installmentPlanTotal - planSum))}€ ${planSum < installmentPlanTotal ? 'menos' : 'más'} que el precio en cuotas (${formatEur(installmentPlanTotal)}€)`}
                                    </span>
                                    {!autoSplit && (
                                        <button onClick={resplit} className="font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                            Repartir el resto en {followingInstallments} cuotas
                                        </button>
                                    )}
                                </div>
                            )}
                            {pendingInstallments.length === 0 && (
                                <p className="text-xs text-on-surface-variant text-center py-2">
                                    {mode === 'pay_on_signup'
                                        ? 'Sin más cuotas — solo pagará la primera'
                                        : 'Sin cuotas pendientes — el alumno ya pagó todo'}
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        onClick={requestCreate}
                        disabled={creating || !emailValid || (!isFree && !amountPaid)}
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
                                            {inv.is_free
                                                ? 'Gratis'
                                                : inv.pay_on_signup
                                                    ? pendingPaymentLabel(inv)
                                                    : `${formatEur(inv.amount_paid)}€`}
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
                                        {!inv.is_free && !inv.pay_on_signup && inv.payment_type === 'installment' && inv.installments && (
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

            {/* Aviso: pago completo por un importe distinto del precio del curso */}
            {confirmPrice && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    style={{ background: 'rgba(8,13,24,0.85)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setConfirmPrice(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-price-title"
                        className="w-full max-w-md bg-surface-container-low rounded-2xl p-6 border border-amber-500/30 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                                <MaterialIcon name="warning" size="text-xl" className="text-amber-400" />
                            </div>
                            <h3 id="confirm-price-title" className="text-base font-bold text-on-surface">
                                ¿Acceso a todo el curso por {formatEur(oneTimeCents)}€?
                            </h3>
                        </div>
                        <div className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
                            <p>
                                El precio del curso es <strong className="text-on-surface">{formatEur(coursePrice)}€</strong>.
                                Con esta invitación, el estudiante tendrá <strong className="text-on-surface">acceso completo a todo el curso</strong>{' '}
                                pagando <strong className="text-on-surface">{formatEur(oneTimeCents)}€</strong> en un único pago:{' '}
                                {formatEur(Math.abs(coursePrice - oneTimeCents))}€ {oneTimeCents < coursePrice ? 'menos' : 'más'} que el precio normal.
                            </p>
                            <p>
                                {oneTimeCents < coursePrice
                                    ? 'No se le cobrará ninguna diferencia más adelante.'
                                    : 'Es más que el precio del curso: revisa que el importe sea correcto.'}
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                            <button
                                onClick={() => setConfirmPrice(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white/5 text-on-surface hover:bg-white/10 transition-colors"
                            >
                                Revisar importe
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmPrice(false)
                                    handleCreate()
                                }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                            >
                                Sí, generar por {formatEur(oneTimeCents)}€
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
