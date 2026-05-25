'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Mail,
    Phone,
    Calendar,
    Layers,
    Zap,
    Edit2,
    Trash2,
    Package as PackageIcon,
    Camera,
    Maximize2,
    CheckCircle2,
    Check,
    X,
    Clock,
    Plus,
    AlertTriangle,
    RotateCcw,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SaleEditModal } from '@/components/sales/SaleEditModal'
import type { SaleDTO, InstallmentDTO } from '@/lib/sales'

interface Props {
    sale: SaleDTO
    backHref?: string
}

function fmt(cents: number) {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

function formatDate(iso: string, long = false): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (long) return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeFromNow(iso: string): string {
    const d = new Date(iso)
    const days = Math.floor((d.getTime() - Date.now()) / 86400000)
    if (days === 0) return 'hoy'
    if (days === 1) return 'mañana'
    if (days === -1) return 'ayer'
    if (days > 0) return `en ${days} días`
    return `hace ${-days} días`
}

function relativeFromPast(iso: string): string {
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (days < 1) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`
    if (days < 365) return `Hace ${Math.floor(days / 30)} meses`
    return `Hace ${Math.floor(days / 365)} años`
}

function initials(first: string, last: string): string {
    return `${first.charAt(0) ?? ''}${last.charAt(0) ?? ''}`.toUpperCase() || '??'
}

export function SaleDetailClient({ sale: initialSale, backHref = '/dashboard/sales' }: Props) {
    const router = useRouter()
    const [sale, setSale] = useState<SaleDTO>(initialSale)
    const [imgModal, setImgModal] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const totalCobrado = sale.cash_collected
    const pctCobrado = sale.total_amount > 0 ? totalCobrado / sale.total_amount : 0
    const cuotasCobradas = sale.installments.filter((c) => c.collected).length
    const proximaCuota = sale.installments.find((c) => !c.collected)
    const fullName = `${sale.customer_first_name} ${sale.customer_last_name}`.trim()
    const ini = initials(sale.customer_first_name, sale.customer_last_name)

    async function toggleInstallment(inst: InstallmentDTO) {
        setTogglingId(inst.id)
        try {
            const action = inst.collected ? 'uncollect' : 'collect'
            const res = await fetch(`/api/sales/${sale.id}/installments/${inst.id}/${action}`, {
                method: 'POST',
            })
            if (!res.ok) return
            // Update local state
            setSale((prev) => {
                const newInstallments = prev.installments.map((i) =>
                    i.id === inst.id
                        ? {
                              ...i,
                              collected: !i.collected,
                              collected_at: !i.collected ? new Date().toISOString() : null,
                          }
                        : i,
                )
                const newCashCollected = newInstallments.filter((i) => i.collected).reduce((s, i) => s + i.amount, 0)
                return { ...prev, installments: newInstallments, cash_collected: newCashCollected }
            })
        } finally {
            setTogglingId(null)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
            if (res.ok) {
                router.push(backHref)
                router.refresh()
            }
        } finally {
            setDeleting(false)
            setConfirmDelete(false)
        }
    }

    // Activity timeline computed from sale + installments
    const activity = useMemo(() => {
        const events: Array<{ type: 'created' | 'collected'; date: string; label: string }> = []
        events.push({ type: 'created', date: sale.created_at, label: 'Venta registrada' })
        for (const inst of sale.installments) {
            if (inst.collected && inst.collected_at) {
                events.push({
                    type: 'collected',
                    date: inst.collected_at,
                    label: `Cuota #${inst.order} cobrada`,
                })
            }
        }
        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [sale])

    return (
        <div className="px-6 md:px-8 py-7 pb-24 lg:pb-12 max-w-[1440px] mx-auto flex flex-col gap-5">
            {/* Back link */}
            <Link
                href={backHref}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-fit"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: '#9ca3b8',
                    background: 'rgba(27,31,43,0.4)',
                    border: '1px solid rgba(129,140,248,0.12)',
                    letterSpacing: 0.3,
                }}
            >
                <ArrowLeft size={14} />
                Volver a ventas
            </Link>

            {/* Header */}
            <header
                className="flex items-start justify-between gap-5 flex-wrap p-5 rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(27,31,43,0.55) 0%, rgba(14,19,30,0.55) 100%)',
                    border: '1px solid rgba(129,140,248,0.14)',
                }}
            >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                        className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-semibold text-white"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            boxShadow: '0 12px 30px -10px rgba(56,189,248,0.5)',
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            letterSpacing: 0.5,
                        }}
                    >
                        {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div
                            className="inline-flex items-center gap-2 mb-1"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#38bdf8',
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}
                            />
                            <span>VENTA · {sale.id.slice(0, 14).toUpperCase()}</span>
                        </div>
                        <h1
                            className="text-3xl font-semibold m-0 mb-1.5"
                            style={{ color: '#dee2f2', letterSpacing: -1.2, lineHeight: 1.1 }}
                        >
                            {fullName}
                        </h1>
                        <div
                            className="flex items-center gap-2.5 flex-wrap mb-3"
                            style={{ fontSize: 13, color: '#9ca3b8' }}
                        >
                            <a
                                href={`mailto:${sale.customer_email}`}
                                className="inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors"
                                style={{ color: '#9ca3b8', textDecoration: 'none' }}
                            >
                                <Mail size={13} />
                                {sale.customer_email}
                            </a>
                            <span className="w-1 h-1 rounded-full" style={{ background: '#5a6178' }} />
                            <a
                                href={`tel:${sale.customer_phone}`}
                                className="inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors"
                                style={{ color: '#9ca3b8', textDecoration: 'none' }}
                            >
                                <Phone size={13} />
                                {sale.customer_phone}
                            </a>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Chip icon={sale.payment_type === 'SINGLE' ? <Zap size={11} /> : <Layers size={11} />}>
                                {sale.payment_type === 'SINGLE' ? 'Pago único' : `${sale.installments.length} cuotas`}
                            </Chip>
                            <Chip icon={<Calendar size={11} />}>{formatDate(sale.sale_date, true)}</Chip>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs cursor-pointer"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#dee2f2',
                        }}
                    >
                        <Edit2 size={14} />
                        Editar
                    </button>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs cursor-pointer"
                        style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#f87171',
                        }}
                    >
                        <Trash2 size={14} />
                        Eliminar
                    </button>
                </div>
            </header>

            {/* Grid */}
            <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
                {/* Left column */}
                <div className="flex flex-col gap-5 min-w-0">
                    {/* Package card */}
                    <section
                        className="p-6 rounded-2xl relative overflow-hidden"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.06) 100%), linear-gradient(180deg, rgba(27,31,43,0.7), rgba(14,19,30,0.7))',
                            border: '1px solid rgba(56,189,248,0.2)',
                        }}
                    >
                        <div
                            className="inline-flex items-center gap-1.5 mb-3"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#38bdf8',
                            }}
                        >
                            <PackageIcon size={11} />
                            PAQUETE CONTRATADO
                        </div>
                        <h2
                            className="text-2xl font-semibold m-0 mb-2.5"
                            style={{ color: '#dee2f2', letterSpacing: -0.7, lineHeight: 1.15 }}
                        >
                            {sale.package_name}
                        </h2>
                        {sale.package_description && (
                            <p className="text-sm m-0 mb-4" style={{ color: '#9ca3b8', lineHeight: 1.6 }}>
                                {sale.package_description}
                            </p>
                        )}
                        <div
                            className="flex items-stretch gap-3.5 flex-wrap pt-4"
                            style={{ borderTop: '1px dashed rgba(129,140,248,0.18)' }}
                        >
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div
                                    className="text-[9.5px] uppercase tracking-[1.2px]"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        color: '#7a8094',
                                    }}
                                >
                                    MONTO TOTAL
                                </div>
                                <div
                                    className="text-[28px] font-semibold"
                                    style={{
                                        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        letterSpacing: -1,
                                    }}
                                >
                                    {fmt(sale.total_amount)}
                                </div>
                            </div>
                            <div className="w-px self-stretch" style={{ background: 'rgba(129,140,248,0.18)' }} />
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div
                                    className="text-[9.5px] uppercase tracking-[1.2px]"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        color: '#7a8094',
                                    }}
                                >
                                    TIPO DE PAGO
                                </div>
                                <div
                                    className="text-base font-semibold"
                                    style={{ color: '#dee2f2', letterSpacing: -0.3 }}
                                >
                                    {sale.payment_type === 'SINGLE' ? 'Pago único' : `${sale.installments.length} cuotas`}
                                </div>
                            </div>
                            <div className="w-px self-stretch" style={{ background: 'rgba(129,140,248,0.18)' }} />
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div
                                    className="text-[9.5px] uppercase tracking-[1.2px]"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        color: '#7a8094',
                                    }}
                                >
                                    COBRADO
                                </div>
                                <div
                                    className="text-base font-semibold"
                                    style={{ color: '#34d399', letterSpacing: -0.3 }}
                                >
                                    {fmt(totalCobrado)}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Cuotas */}
                    <section
                        className="p-5 rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5) 0%, rgba(14,19,30,0.5) 100%)',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div className="flex justify-between items-start gap-4 flex-wrap mb-3.5">
                            <div>
                                <div
                                    className="inline-flex items-center gap-1.5 mb-1"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        fontSize: 10.5,
                                        letterSpacing: 1.3,
                                        color: '#38bdf8',
                                    }}
                                >
                                    <Layers size={11} />
                                    PLAN DE COBRO · {cuotasCobradas}/{sale.installments.length}
                                </div>
                                <h2
                                    className="text-lg font-semibold m-0"
                                    style={{ color: '#dee2f2', letterSpacing: -0.5 }}
                                >
                                    {sale.payment_type === 'SINGLE' ? 'Pago' : 'Cuotas'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-0.5">
                                    <div
                                        className="text-[9.5px] uppercase tracking-[1px]"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            color: '#7a8094',
                                        }}
                                    >
                                        COBRADO
                                    </div>
                                    <div
                                        className="text-base font-semibold"
                                        style={{ color: '#dee2f2', letterSpacing: -0.3 }}
                                    >
                                        {fmt(totalCobrado)}
                                    </div>
                                </div>
                                <div className="w-px h-7" style={{ background: 'rgba(129,140,248,0.18)' }} />
                                <div className="flex flex-col gap-0.5">
                                    <div
                                        className="text-[9.5px] uppercase tracking-[1px]"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            color: '#7a8094',
                                        }}
                                    >
                                        RESTANTE
                                    </div>
                                    <div
                                        className="text-base font-semibold"
                                        style={{ color: '#9ca3b8', letterSpacing: -0.3 }}
                                    >
                                        {fmt(sale.total_amount - totalCobrado)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                            <div
                                className="relative h-2 rounded"
                                style={{ background: 'rgba(129,140,248,0.08)' }}
                            >
                                <div
                                    className="h-full rounded transition-all"
                                    style={{
                                        width: `${pctCobrado * 100}%`,
                                        background: 'linear-gradient(90deg, #34d399, #38bdf8, #818cf8)',
                                        boxShadow: '0 0 12px rgba(56,189,248,0.4)',
                                    }}
                                />
                                {sale.installments.map((c, i) => {
                                    const left = ((i + 1) / sale.installments.length) * 100
                                    return (
                                        <div
                                            key={c.id}
                                            className="absolute top-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all"
                                            style={{
                                                left: `${left}%`,
                                                background: c.collected ? '#34d399' : 'rgba(129,140,248,0.3)',
                                                boxShadow: c.collected ? '0 0 8px #34d399' : 'none',
                                            }}
                                        />
                                    )
                                })}
                            </div>
                            <div
                                className="flex justify-between mt-2 text-[11.5px]"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    letterSpacing: 0.3,
                                }}
                            >
                                <span style={{ color: '#34d399' }}>{Math.round(pctCobrado * 100)}% cobrado</span>
                                {proximaCuota && proximaCuota.due_date && (
                                    <span style={{ color: '#9ca3b8' }}>
                                        Próxima: cuota #{proximaCuota.order} · {formatDate(proximaCuota.due_date)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex flex-col gap-2">
                            {sale.installments.map((c) => (
                                <InstallmentRow
                                    key={c.id}
                                    cuota={c}
                                    total={sale.installments.length}
                                    onToggle={() => toggleInstallment(c)}
                                    busy={togglingId === c.id}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right aside */}
                <aside className="flex flex-col gap-5 min-w-0">
                    {/* Captura */}
                    <section
                        className="p-4 rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div
                                className="inline-flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    fontSize: 10.5,
                                    letterSpacing: 1.3,
                                    color: '#38bdf8',
                                }}
                            >
                                <Camera size={11} />
                                EVIDENCIA DE CIERRE
                            </div>
                            <button
                                onClick={() => setImgModal(true)}
                                aria-label="Ampliar"
                                className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
                                style={{
                                    background: 'rgba(8,13,24,0.5)',
                                    border: '1px solid rgba(129,140,248,0.18)',
                                    color: '#9ca3b8',
                                }}
                            >
                                <Maximize2 size={12} />
                            </button>
                        </div>
                        <button
                            onClick={() => setImgModal(true)}
                            className="relative w-full rounded-xl overflow-hidden cursor-pointer block"
                            style={{ aspectRatio: '4/3', background: 'rgba(8,13,24,0.5)', padding: 0, border: 'none' }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={sale.screenshot_url}
                                alt="Captura del pago"
                                className="w-full h-full object-cover block"
                            />
                        </button>
                        <div
                            className="inline-flex items-center gap-1.5 mt-2.5"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 11,
                                color: '#7a8094',
                                letterSpacing: 0.3,
                            }}
                        >
                            <CheckCircle2 size={11} />
                            Subida el {formatDate(sale.created_at)}
                        </div>
                    </section>

                    {/* Timeline */}
                    <section
                        className="p-5 rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div
                            className="inline-flex items-center gap-1.5"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#38bdf8',
                            }}
                        >
                            <Clock size={11} />
                            ACTIVIDAD
                        </div>
                        <div className="mt-3.5 flex flex-col">
                            {activity.map((ev, i) => (
                                <TimelineItem
                                    key={i}
                                    icon={ev.type === 'created' ? <Plus size={11} /> : <Check size={11} />}
                                    tone={ev.type === 'created' ? 'indigo' : 'green'}
                                    label={ev.label}
                                    when={relativeFromPast(ev.date)}
                                    last={i === activity.length - 1}
                                />
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            {/* Image modal */}
            {imgModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    style={{ background: 'rgba(8,13,24,0.85)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setImgModal(false)}
                >
                    <button
                        onClick={() => setImgModal(false)}
                        aria-label="Cerrar"
                        className="absolute top-5 right-5 w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{
                            background: 'rgba(27,31,43,0.7)',
                            border: '1px solid rgba(129,140,248,0.25)',
                            color: '#dee2f2',
                        }}
                    >
                        <X size={18} />
                    </button>
                    <div
                        className="max-w-[90%] max-h-[85vh] flex flex-col gap-3 items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={sale.screenshot_url}
                            alt="Captura del pago"
                            className="max-w-full max-h-[78vh] rounded-xl"
                            style={{
                                boxShadow: '0 30px 80px -20px rgba(56,189,248,0.3)',
                                border: '1px solid rgba(129,140,248,0.25)',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {confirmDelete && (
                <Modal
                    open={confirmDelete}
                    onClose={() => !deleting && setConfirmDelete(false)}
                    title="Eliminar venta"
                    size="sm"
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(239,68,68,0.14)', color: '#f87171' }}
                            >
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    ¿Seguro que quieres eliminar la venta de <strong>{fullName}</strong>? Esta acción
                                    no se puede deshacer y borrará también el plan de cobro.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                                className="px-3.5 py-2 rounded-lg text-xs disabled:opacity-50"
                                style={{
                                    background: 'rgba(27,31,43,0.6)',
                                    border: '1px solid rgba(129,140,248,0.18)',
                                    color: '#dee2f2',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#fff',
                                    boxShadow: '0 8px 20px -8px rgba(239,68,68,0.6)',
                                }}
                            >
                                {deleting ? 'Eliminando…' : 'Eliminar venta'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit modal */}
            <SaleEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                sale={sale}
                onUpdated={(updated) => setSale(updated)}
            />
        </div>
    )
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px]"
            style={{
                background: 'rgba(8,13,24,0.5)',
                border: '1px solid rgba(129,140,248,0.18)',
                color: '#c4c5d5',
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                letterSpacing: 0.3,
            }}
        >
            {icon}
            {children}
        </span>
    )
}

function InstallmentRow({
    cuota,
    total,
    onToggle,
    busy,
}: {
    cuota: InstallmentDTO
    total: number
    onToggle: () => void
    busy: boolean
}) {
    const isCobrada = cuota.collected
    const isVencida = !isCobrada && cuota.due_date && new Date(cuota.due_date) < new Date()

    return (
        <div
            className="grid items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all"
            style={{
                gridTemplateColumns: '40px minmax(0, 1fr) 90px auto',
                background: isCobrada
                    ? 'linear-gradient(90deg, rgba(52,211,153,0.05), rgba(8,13,24,0.4))'
                    : 'rgba(8,13,24,0.4)',
                border: `1px solid ${isCobrada ? 'rgba(52,211,153,0.18)' : 'rgba(129,140,248,0.1)'}`,
            }}
        >
            <div className="flex justify-center">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={
                        isCobrada
                            ? {
                                  background: 'linear-gradient(135deg, #34d399, #38bdf8)',
                                  border: '1px solid transparent',
                                  color: '#fff',
                                  boxShadow: '0 0 16px rgba(52,211,153,0.4)',
                              }
                            : {
                                  background: 'rgba(129,140,248,0.08)',
                                  border: '1px solid rgba(129,140,248,0.18)',
                                  color: '#9ca3b8',
                              }
                    }
                >
                    {isCobrada ? (
                        <Check size={13} />
                    ) : (
                        <span
                            className="text-[11px] font-semibold"
                            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                        >
                            #{cuota.order}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2" style={{ color: '#dee2f2' }}>
                    Cuota {cuota.order} de {total}
                    {isVencida && (
                        <span
                            className="text-[9.5px] tracking-[1px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                background: 'rgba(239,68,68,0.15)',
                                color: '#f87171',
                            }}
                        >
                            VENCIDA
                        </span>
                    )}
                </div>
                <div
                    className="inline-flex items-center gap-1.5 text-[11.5px]"
                    style={{ color: '#7a8094' }}
                >
                    {isCobrada && cuota.collected_at ? (
                        <>
                            <CheckCircle2 size={11} />
                            Cobrada el {formatDate(cuota.collected_at, true)}
                        </>
                    ) : cuota.due_date ? (
                        <>
                            <Calendar size={11} />
                            Vence {formatDate(cuota.due_date, true)}
                            <span className="opacity-50">·</span>
                            <span>{relativeFromNow(cuota.due_date)}</span>
                        </>
                    ) : (
                        <span>Pendiente</span>
                    )}
                </div>
            </div>

            <div
                className="text-base font-semibold text-right"
                style={{ color: '#dee2f2', letterSpacing: -0.3, minWidth: 80 }}
            >
                {fmt(cuota.amount)}
            </div>

            <button
                onClick={onToggle}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap"
                style={
                    isCobrada
                        ? {
                              background: 'transparent',
                              border: '1px solid rgba(129,140,248,0.18)',
                              color: '#9ca3b8',
                          }
                        : {
                              background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.12))',
                              border: '1px solid rgba(56,189,248,0.3)',
                              color: '#38bdf8',
                          }
                }
            >
                {busy ? (
                    '…'
                ) : isCobrada ? (
                    <>
                        <RotateCcw size={12} />
                        <span>Marcar pendiente</span>
                    </>
                ) : (
                    <>
                        <Check size={12} />
                        <span>Marcar cobrada</span>
                    </>
                )}
            </button>
        </div>
    )
}

function TimelineItem({
    icon,
    tone,
    label,
    when,
    last,
}: {
    icon: React.ReactNode
    tone: 'green' | 'cyan' | 'indigo'
    label: string
    when: string
    last: boolean
}) {
    const tones = {
        green: { bg: 'rgba(52,211,153,0.14)', fg: '#34d399' },
        cyan: { bg: 'rgba(56,189,248,0.14)', fg: '#38bdf8' },
        indigo: { bg: 'rgba(129,140,248,0.14)', fg: '#818cf8' },
    }[tone]

    return (
        <div className="flex gap-3 relative">
            <div className="flex flex-col items-center shrink-0 w-6">
                <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.fg}40` }}
                >
                    {icon}
                </div>
                {!last && <div className="flex-1 w-px min-h-[14px]" style={{ background: 'rgba(129,140,248,0.18)' }} />}
            </div>
            <div className="pb-3.5 flex-1 min-w-0">
                <div className="text-[12.5px]" style={{ color: '#dee2f2', lineHeight: 1.4 }}>
                    {label}
                </div>
                <div
                    className="mt-0.5 text-[10.5px]"
                    style={{
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        color: '#7a8094',
                        letterSpacing: 0.3,
                    }}
                >
                    {when}
                </div>
            </div>
        </div>
    )
}
