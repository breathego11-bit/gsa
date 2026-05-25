'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ChevronRight,
    Mail,
    Phone,
    Calendar,
    Edit2,
    Lock,
    LockOpen,
    TrendingUp,
    Settings as SettingsIcon,
    Zap,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    PlayCircle,
    Check,
    Plus,
    Clock,
    X,
    ArrowRight,
} from 'lucide-react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { CourseEnrollmentProgress } from '@/types'

interface StudentInfo {
    id: string
    name: string
    last_name: string
    username: string
    email: string
    phone: string | null
    profile_image: string | null
    created_at: string
    payment_status: string
    blocked: boolean
    closer_enabled: boolean
}

interface StatsDTO {
    programName: string | null
    startedAt: string
    progressGlobal: number     // 0..1
    completedLessons: number
    totalLessons: number
    salesCount: number
    lastConnectionAt: string | null
}

export type TimelineTone = 'cyan' | 'green' | 'indigo'
export type TimelineEventDTO = {
    type: 'enrollment' | 'lesson' | 'payment' | 'sale'
    tone: TimelineTone
    label: string
    date: string  // ISO
}

interface PaymentInfo {
    id: string
    payment_type: string
    amount: number
    currency: string
    status: string
    installment_number: number | null
    installment_plan_id: string | null
    due_date: string | null
    created_at: string
}

interface Props {
    student: StudentInfo
    stats: StatsDTO
    timeline: TimelineEventDTO[]
    courses: CourseEnrollmentProgress[]
    payments: PaymentInfo[]
}

function formatDate(iso: string, long = false): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (long) return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeFromNow(iso: string): string {
    const d = new Date(iso)
    const mins = Math.floor((Date.now() - d.getTime()) / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `hace ${days}d`
    const months = Math.floor(days / 30)
    return `hace ${months}m`
}

function formatAmount(cents: number, currency: string) {
    return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: currency.toUpperCase() })
}

function initials(first: string, last: string): string {
    return `${first.charAt(0) ?? ''}${last.charAt(0) ?? ''}`.toUpperCase() || '??'
}

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
    none: { label: 'Sin pago', color: 'bg-surface-variant text-on-surface-variant' },
    active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400' },
    past_due: { label: 'Pago pendiente', color: 'bg-amber-500/20 text-amber-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

type ToastTone = 'success' | 'danger' | 'neutral'
interface ToastState {
    tone: ToastTone
    icon: React.ReactNode
    title: string
    body: string
}

type ConfirmKind = 'closer-on' | 'closer-off' | 'delete-student'

export function StudentDetailClient({ student, stats, timeline, courses, payments }: Props) {
    const router = useRouter()

    const [blocked, setBlocked] = useState(student.blocked)
    const [closerEnabled, setCloserEnabled] = useState(student.closer_enabled)
    const [busyToggle, setBusyToggle] = useState<'block' | 'closer' | 'delete' | null>(null)

    const [toast, setToast] = useState<ToastState | null>(null)
    const [confirm, setConfirm] = useState<ConfirmKind | null>(null)

    const fullName = `${student.name} ${student.last_name}`.trim()
    const ini = initials(student.name, student.last_name)

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 4200)
        return () => clearTimeout(t)
    }, [toast])

    // Escape closes confirm
    useEffect(() => {
        if (!confirm) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setConfirm(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [confirm])

    const showToast = (cfg: ToastState) => setToast(cfg)

    async function toggleBlock() {
        if (busyToggle) return
        const next = !blocked
        setBusyToggle('block')
        try {
            const res = await fetch(`/api/admin/students/${student.id}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocked: next }),
            })
            if (res.ok) {
                setBlocked(next)
                showToast(
                    next
                        ? {
                              tone: 'danger',
                              icon: <Lock size={15} />,
                              title: 'Estudiante bloqueado',
                              body: `${fullName} no podrá acceder a la plataforma.`,
                          }
                        : {
                              tone: 'success',
                              icon: <LockOpen size={15} />,
                              title: 'Acceso restaurado',
                              body: `${fullName} puede volver a entrar a sus contenidos.`,
                          },
                )
            }
        } finally {
            setBusyToggle(null)
        }
    }

    async function applyCloserChange(next: boolean) {
        setBusyToggle('closer')
        try {
            const res = await fetch(`/api/admin/students/${student.id}/closer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ closer_enabled: next }),
            })
            if (res.ok) {
                setCloserEnabled(next)
                showToast(
                    next
                        ? {
                              tone: 'success',
                              icon: <TrendingUp size={15} />,
                              title: 'Módulo de ventas activado',
                              body: `${fullName} ya puede acceder al CRM y registrar sus ventas.`,
                          }
                        : {
                              tone: 'neutral',
                              icon: <Lock size={15} />,
                              title: 'Módulo de ventas desactivado',
                              body: `${fullName} ya no podrá acceder al CRM.`,
                          },
                )
            }
        } finally {
            setBusyToggle(null)
            setConfirm(null)
        }
    }

    async function applyDelete() {
        setBusyToggle('delete')
        try {
            const res = await fetch(`/api/admin/students/${student.id}`, { method: 'DELETE' })
            if (res.ok) {
                setConfirm(null)
                router.push('/admin/students')
                router.refresh()
            }
        } finally {
            setBusyToggle(null)
        }
    }

    const totalPaid = payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

    const programLabel = stats.programName ?? 'Sin programa'
    const lastConnectionLabel = stats.lastConnectionAt ? relativeFromNow(stats.lastConnectionAt) : '—'
    const moduleLabel =
        stats.totalLessons > 0
            ? `${stats.completedLessons}/${stats.totalLessons}`
            : '0/0'
    const progressPct = Math.round(stats.progressGlobal * 100)

    const timelineRendered = useMemo(() => {
        if (timeline.length === 0) {
            return (
                <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                    Sin actividad reciente.
                </p>
            )
        }
        return (
            <div className="mt-3.5 flex flex-col">
                {timeline.map((ev, i) => (
                    <TimelineRow key={i} event={ev} last={i === timeline.length - 1} />
                ))}
            </div>
        )
    }, [timeline])

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div
                className="inline-flex items-center gap-2 text-xs"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    letterSpacing: 0.3,
                    color: '#5a6178',
                }}
            >
                <Link href="/admin" style={{ color: '#9ca3b8', textDecoration: 'none' }}>
                    Admin
                </Link>
                <ChevronRight size={11} />
                <Link href="/admin/students" style={{ color: '#9ca3b8', textDecoration: 'none' }}>
                    Estudiantes
                </Link>
                <ChevronRight size={11} />
                <span style={{ color: '#dee2f2' }}>{fullName}</span>
            </div>

            {/* Header */}
            <header
                className="flex items-start justify-between gap-5 flex-wrap p-5 rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(27,31,43,0.55), rgba(14,19,30,0.55))',
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
                            overflow: 'hidden',
                        }}
                    >
                        {student.profile_image ? (
                            <img src={student.profile_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            ini
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div
                            className="inline-flex items-center gap-2 mb-1"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#fbbf24',
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}
                            />
                            <span>ESTUDIANTE · @{student.username}</span>
                        </div>
                        <h1
                            className="text-3xl font-semibold m-0 mb-2 inline-flex items-center gap-2.5 flex-wrap"
                            style={{ color: '#dee2f2', letterSpacing: -1.1, lineHeight: 1.1 }}
                        >
                            {fullName}
                            {blocked && (
                                <span
                                    className="text-[10px] px-2 py-0.5 rounded font-semibold"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#f87171',
                                        border: '1px solid rgba(239,68,68,0.35)',
                                        letterSpacing: 1.3,
                                    }}
                                >
                                    BLOQUEADO
                                </span>
                            )}
                            {closerEnabled && (
                                <span
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        background: 'rgba(56,189,248,0.15)',
                                        color: '#38bdf8',
                                        border: '1px solid rgba(56,189,248,0.35)',
                                        letterSpacing: 1.3,
                                    }}
                                >
                                    <TrendingUp size={10} /> CLOSER
                                </span>
                            )}
                        </h1>
                        <div
                            className="flex items-center gap-2.5 flex-wrap text-sm"
                            style={{ color: '#9ca3b8' }}
                        >
                            <a
                                href={`mailto:${student.email}`}
                                className="inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors"
                                style={{ color: '#9ca3b8', textDecoration: 'none' }}
                            >
                                <Mail size={13} />
                                {student.email}
                            </a>
                            {student.phone && (
                                <>
                                    <span className="w-1 h-1 rounded-full" style={{ background: '#5a6178' }} />
                                    <a
                                        href={`tel:${student.phone}`}
                                        className="inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors"
                                        style={{ color: '#9ca3b8', textDecoration: 'none' }}
                                    >
                                        <Phone size={13} />
                                        {student.phone}
                                    </a>
                                </>
                            )}
                            <span className="w-1 h-1 rounded-full" style={{ background: '#5a6178' }} />
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar size={13} />
                                Inicio {formatDate(stats.startedAt)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <a
                        href={`mailto:${student.email}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#dee2f2',
                            textDecoration: 'none',
                        }}
                    >
                        <Mail size={14} />
                        Enviar email
                    </a>
                    <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs opacity-60 cursor-not-allowed"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#dee2f2',
                        }}
                        title="Próximamente"
                    >
                        <Edit2 size={14} />
                        Editar
                    </button>
                </div>
            </header>

            {/* Grid principal */}
            <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' }}>
                {/* Main column */}
                <div className="flex flex-col gap-5 min-w-0">
                    {/* Stats card */}
                    <section
                        className="p-5 rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div
                            className="inline-flex items-center gap-1.5 mb-3.5"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#38bdf8',
                            }}
                        >
                            <TrendingUp size={11} />
                            PROGRESO · {programLabel}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-4">
                            <Stat label="LECCIONES" value={moduleLabel} accent />
                            <Stat label="VENTAS" value={String(stats.salesCount)} highlight={closerEnabled} />
                            <Stat label="ÚLTIMA CONEXIÓN" value={lastConnectionLabel} />
                        </div>
                        <div
                            className="h-1.5 rounded overflow-hidden"
                            style={{ background: 'rgba(129,140,248,0.08)' }}
                        >
                            <div
                                className="h-full rounded transition-all"
                                style={{
                                    width: `${progressPct}%`,
                                    background: 'linear-gradient(90deg, #34d399, #38bdf8, #818cf8)',
                                    boxShadow: '0 0 12px rgba(56,189,248,0.4)',
                                }}
                            />
                        </div>
                        <div
                            className="flex justify-between mt-2 text-[11.5px]"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                color: '#9ca3b8',
                                letterSpacing: 0.3,
                            }}
                        >
                            <span>Progreso del programa</span>
                            <span style={{ color: '#dee2f2' }}>{progressPct}%</span>
                        </div>
                    </section>

                    {/* Info card with toggles */}
                    <section
                        className="p-5 rounded-2xl"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div
                            className="inline-flex items-center gap-1.5 mb-1"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#38bdf8',
                            }}
                        >
                            <SettingsIcon size={11} />
                            INFORMACIÓN Y PERMISOS
                        </div>
                        <h2 className="text-lg font-semibold m-0 mb-3.5" style={{ color: '#dee2f2', letterSpacing: -0.5 }}>
                            Información del estudiante
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                            <InfoField label="Programa" value={programLabel} />
                            <InfoField label="Fecha de inicio" value={formatDate(stats.startedAt, true)} />
                            <InfoField
                                label="Estado de pago"
                                value={
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            paymentStatusLabels[student.payment_status]?.color ??
                                            paymentStatusLabels.none.color
                                        }`}
                                    >
                                        {paymentStatusLabels[student.payment_status]?.label ?? 'Sin pago'}
                                    </span>
                                }
                            />
                            <InfoField
                                label="Estado"
                                value={
                                    <span className="inline-flex items-center gap-1.5">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                background: blocked ? '#f87171' : '#34d399',
                                                boxShadow: `0 0 8px ${blocked ? '#f87171' : '#34d399'}`,
                                            }}
                                        />
                                        <span style={{ color: '#dee2f2' }}>{blocked ? 'Bloqueado' : 'Activo'}</span>
                                    </span>
                                }
                            />
                        </div>

                        <div className="h-px mb-4" style={{ background: 'rgba(129,140,248,0.12)' }} />

                        <div
                            className="inline-flex items-center gap-1.5 mb-2.5"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                fontSize: 9.5,
                                letterSpacing: 1.4,
                                color: '#7a8094',
                            }}
                        >
                            <Zap size={11} />
                            <span>PERMISOS Y ACCESOS</span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <ToggleRow
                                icon={<Lock size={16} />}
                                iconTone={blocked ? 'red' : 'gray'}
                                label="Bloqueado"
                                helper="Restringe el acceso del alumno a la plataforma. No podrá entrar al campus, las lecciones ni la comunidad."
                                checked={blocked}
                                disabled={busyToggle === 'block'}
                                activeColor="#f87171"
                                onChange={toggleBlock}
                            />

                            <ToggleRow
                                icon={<TrendingUp size={16} />}
                                iconTone={closerEnabled ? 'cyan' : 'gray'}
                                label="Closer"
                                helper="Permite al alumno acceder al CRM de ventas, registrar sus cierres y gestionar el plan de cobro de cada cliente."
                                checked={closerEnabled}
                                disabled={busyToggle === 'closer'}
                                activeColor="#38bdf8"
                                badge="NUEVO"
                                onChange={() => setConfirm(closerEnabled ? 'closer-off' : 'closer-on')}
                            />
                        </div>

                        {closerEnabled && (
                            <div
                                className="mt-3.5 p-3.5 rounded-xl flex items-start gap-3"
                                style={{
                                    background:
                                        'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(129,140,248,0.05))',
                                    border: '1px solid rgba(56,189,248,0.25)',
                                }}
                            >
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{
                                        background: 'rgba(56,189,248,0.18)',
                                        border: '1px solid rgba(56,189,248,0.4)',
                                        color: '#38bdf8',
                                    }}
                                >
                                    <CheckCircle2 size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold mb-1" style={{ color: '#dee2f2' }}>
                                        CRM de ventas habilitado
                                    </div>
                                    <div
                                        className="text-[12.5px] mb-2"
                                        style={{ color: '#9ca3b8', lineHeight: 1.5 }}
                                    >
                                        El alumno verá una nueva sección{' '}
                                        <strong style={{ color: '#38bdf8' }}>&quot;Ventas&quot;</strong> en su sidebar y podrá
                                        registrar nuevas ventas, gestionar cuotas y subir capturas como evidencia.
                                    </div>
                                    <Link
                                        href="/dashboard/sales"
                                        className="inline-flex items-center gap-1.5 text-[11.5px]"
                                        style={{
                                            color: '#38bdf8',
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            letterSpacing: 0.3,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Ver cómo lo verá el alumno
                                        <ArrowRight size={11} />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Side column */}
                <aside className="flex flex-col gap-5 min-w-0">
                    {/* Activity timeline */}
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
                            ACTIVIDAD RECIENTE
                        </div>
                        {timelineRendered}
                    </section>

                    {/* Danger zone */}
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
                                color: '#f87171',
                            }}
                        >
                            <AlertTriangle size={11} />
                            ZONA DE PELIGRO
                        </div>
                        <p className="text-[12.5px] mt-3" style={{ color: '#9ca3b8', lineHeight: 1.5 }}>
                            Eliminar al estudiante borra su acceso, su progreso y todas sus ventas registradas. Esta
                            acción no se puede deshacer.
                        </p>
                        <button
                            onClick={() => setConfirm('delete-student')}
                            disabled={busyToggle === 'delete'}
                            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171',
                            }}
                        >
                            <Trash2 size={13} />
                            <span>Eliminar estudiante</span>
                        </button>
                    </section>
                </aside>
            </div>

            {/* Sección Pagos (existente, preservada) */}
            <div>
                <h2 className="section-title mb-1">Información de Pago</h2>
                <p className="section-subtitle mb-5">Pagos realizados por el estudiante</p>

                <div
                    className="p-5 rounded-2xl"
                    style={{
                        background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                        border: '1px solid rgba(129,140,248,0.14)',
                    }}
                >
                    {payments.length > 0 ? (
                        <>
                            <div className="flex items-center justify-end mb-4">
                                <div className="text-right">
                                    <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                                        {formatAmount(totalPaid, payments[0].currency)}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        Total pagado
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between p-4 rounded-xl"
                                        style={{ background: 'var(--bg-raised)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MaterialIcon
                                                name={p.payment_type === 'one_time' ? 'credit_card' : 'event_repeat'}
                                                size="text-lg"
                                                className={
                                                    p.status === 'completed'
                                                        ? 'text-emerald-400'
                                                        : p.status === 'failed'
                                                            ? 'text-red-400'
                                                            : 'text-amber-400'
                                                }
                                            />
                                            <div>
                                                <p
                                                    className="text-sm font-semibold"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {p.payment_type === 'one_time'
                                                        ? 'Pago Completo'
                                                        : `Cuota ${p.installment_number}`}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {p.status === 'completed'
                                                        ? formatDate(p.created_at)
                                                        : p.due_date
                                                            ? `Vence: ${formatDate(p.due_date)}`
                                                            : formatDate(p.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className="text-sm font-bold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {formatAmount(p.amount, p.currency)}
                                            </p>
                                            <span
                                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    p.status === 'completed'
                                                        ? 'text-emerald-400'
                                                        : p.status === 'failed'
                                                            ? 'text-red-400'
                                                            : 'text-amber-400'
                                                }`}
                                            >
                                                {p.status === 'completed'
                                                    ? 'Pagado'
                                                    : p.status === 'failed'
                                                        ? 'Fallido'
                                                        : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                            Este estudiante no ha realizado pagos.
                        </p>
                    )}
                </div>
            </div>

            {/* Sección Tabla de cursos (existente, preservada) */}
            <div>
                <h2 className="section-title mb-1">Progreso por curso</h2>
                <p className="section-subtitle mb-5">Detalle del avance en cada curso inscrito</p>

                <div
                    className="p-5 rounded-2xl"
                    style={{
                        background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                        border: '1px solid rgba(129,140,248,0.14)',
                    }}
                >
                    {courses.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <MaterialIcon
                                name="school"
                                size="text-4xl"
                                className="text-on-surface-variant mb-3"
                            />
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Este estudiante no tiene inscripciones.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th
                                            className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Curso
                                        </th>
                                        <th
                                            className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Inscripción
                                        </th>
                                        <th
                                            className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Progreso
                                        </th>
                                        <th
                                            className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map((c) => (
                                        <tr key={c.courseId} className="table-row-base">
                                            <td className="py-4 pr-4">
                                                <Link
                                                    href={`/admin/courses/${c.courseId}/builder`}
                                                    className="font-medium hover:underline"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {c.courseTitle}
                                                </Link>
                                                {c.instructorName && (
                                                    <p
                                                        className="text-xs mt-0.5"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {c.instructorName}
                                                    </p>
                                                )}
                                            </td>
                                            <td
                                                className="py-4 pr-4 hidden md:table-cell text-xs"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {formatDate(c.enrolledAt)}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-24 h-2 rounded-full overflow-hidden"
                                                        style={{ background: 'var(--bg-raised)' }}
                                                    >
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${c.progressPercent}%`,
                                                                background:
                                                                    c.progressPercent >= 100
                                                                        ? 'var(--green-accent, #10b981)'
                                                                        : 'var(--blue-accent, #3b82f6)',
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{ color: 'var(--text-primary)' }}
                                                    >
                                                        {c.progressPercent}%
                                                    </span>
                                                </div>
                                                <p
                                                    className="text-[10px] mt-1"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    {c.completedLessons}/{c.totalLessons} lecciones
                                                </p>
                                            </td>
                                            <td className="py-4 text-center hidden sm:table-cell">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        c.approved
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : c.progressPercent > 0
                                                                ? 'bg-blue-500/20 text-blue-400'
                                                                : 'bg-surface-variant text-on-surface-variant'
                                                    }`}
                                                >
                                                    {c.approved
                                                        ? 'Aprobado'
                                                        : c.progressPercent > 0
                                                            ? 'En progreso'
                                                            : 'No iniciado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    role="status"
                    className="fixed z-50 flex items-start gap-3 p-3.5 rounded-2xl"
                    style={{
                        bottom: 24,
                        right: 24,
                        width: 380,
                        maxWidth: 'calc(100vw - 48px)',
                        background:
                            'linear-gradient(180deg, rgba(27,31,43,0.98), rgba(14,19,30,0.98))',
                        border: '1px solid rgba(129,140,248,0.25)',
                        boxShadow: '0 20px 50px -10px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                            background:
                                toast.tone === 'success'
                                    ? 'rgba(52,211,153,0.14)'
                                    : toast.tone === 'danger'
                                        ? 'rgba(239,68,68,0.14)'
                                        : 'rgba(129,140,248,0.14)',
                            border: `1px solid ${
                                toast.tone === 'success'
                                    ? 'rgba(52,211,153,0.4)'
                                    : toast.tone === 'danger'
                                        ? 'rgba(239,68,68,0.4)'
                                        : 'rgba(129,140,248,0.4)'
                            }`,
                            color:
                                toast.tone === 'success'
                                    ? '#34d399'
                                    : toast.tone === 'danger'
                                        ? '#f87171'
                                        : '#818cf8',
                        }}
                    >
                        {toast.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: '#dee2f2' }}>
                            {toast.title}
                        </div>
                        <div className="text-xs" style={{ color: '#9ca3b8', lineHeight: 1.4 }}>
                            {toast.body}
                        </div>
                    </div>
                    <button
                        onClick={() => setToast(null)}
                        aria-label="Cerrar"
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: 'transparent', border: 'none', color: '#7a8094' }}
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Confirm dialogs */}
            {confirm === 'closer-on' && (
                <ConfirmDialog
                    icon={<TrendingUp size={20} />}
                    tone="cyan"
                    title="Activar el módulo de ventas"
                    body={
                        <>
                            Vas a darle acceso al CRM a <strong style={{ color: '#dee2f2' }}>{fullName}</strong>. Verá
                            una nueva sección &quot;Ventas&quot; en su panel y podrá registrar cierres con sus clientes.
                        </>
                    }
                    confirmLabel="Activar módulo"
                    busy={busyToggle === 'closer'}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => applyCloserChange(true)}
                />
            )}
            {confirm === 'closer-off' && (
                <ConfirmDialog
                    icon={<AlertTriangle size={20} />}
                    tone="amber"
                    title="Desactivar el módulo de ventas"
                    body={
                        <>
                            <strong style={{ color: '#dee2f2' }}>{fullName}</strong> dejará de ver el CRM de ventas.
                            Sus ventas registradas se conservan, pero no podrá editarlas ni añadir nuevas.
                        </>
                    }
                    confirmLabel="Desactivar"
                    busy={busyToggle === 'closer'}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => applyCloserChange(false)}
                />
            )}
            {confirm === 'delete-student' && (
                <ConfirmDialog
                    icon={<AlertTriangle size={20} />}
                    tone="red"
                    title="Eliminar este estudiante"
                    body={
                        <>
                            ¿Seguro que quieres eliminar a <strong style={{ color: '#dee2f2' }}>{fullName}</strong>?
                            Esta acción borra su acceso, sus inscripciones, su progreso, sus pagos y sus ventas
                            registradas. <strong>No se puede deshacer.</strong>
                        </>
                    }
                    confirmLabel="Eliminar estudiante"
                    busy={busyToggle === 'delete'}
                    onCancel={() => setConfirm(null)}
                    onConfirm={applyDelete}
                />
            )}
        </div>
    )
}

/* ── Local components ──────────────────────────────────────── */

function Stat({
    label,
    value,
    accent,
    highlight,
}: {
    label: string
    value: string
    accent?: boolean
    highlight?: boolean
}) {
    return (
        <div className="flex flex-col gap-1">
            <div
                className="text-[9.5px] uppercase tracking-[1.1px]"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#7a8094' }}
            >
                {label}
            </div>
            <div
                className="text-lg font-semibold"
                style={
                    accent
                        ? {
                              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              letterSpacing: -0.4,
                          }
                        : highlight
                            ? { color: '#38bdf8', letterSpacing: -0.4 }
                            : { color: '#dee2f2', letterSpacing: -0.4 }
                }
            >
                {value}
            </div>
        </div>
    )
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <div
                className="text-[10px] uppercase tracking-[1.1px]"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#7a8094' }}
            >
                {label}
            </div>
            <div className="text-[13.5px]" style={{ color: '#dee2f2' }}>
                {value}
            </div>
        </div>
    )
}

function Switch({
    checked,
    onChange,
    activeColor = '#38bdf8',
    disabled,
}: {
    checked: boolean
    onChange: () => void
    activeColor?: string
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={onChange}
            className="relative shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
                width: 44,
                height: 24,
                padding: 1,
                marginTop: 6,
                borderRadius: 999,
                border: `1px solid ${checked ? `${activeColor}80` : 'rgba(129,140,248,0.25)'}`,
                background: checked
                    ? `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)`
                    : 'rgba(8,13,24,0.6)',
                boxShadow: checked
                    ? `0 0 14px ${activeColor}55, inset 0 1px 0 rgba(255,255,255,0.15)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            <span
                className="absolute top-0.5 left-0.5 transition-transform"
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: checked ? '#fff' : '#7a8094',
                    transform: checked ? 'translateX(20px)' : 'translateX(0)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    transition: 'transform .25s cubic-bezier(.4,0,.2,1), background .15s',
                }}
            />
        </button>
    )
}

function ToggleRow({
    icon,
    iconTone,
    label,
    helper,
    checked,
    onChange,
    activeColor,
    badge,
    disabled,
}: {
    icon: React.ReactNode
    iconTone: 'gray' | 'red' | 'cyan'
    label: string
    helper: string
    checked: boolean
    onChange: () => void
    activeColor: string
    badge?: string
    disabled?: boolean
}) {
    const tones = {
        gray: { bg: 'rgba(129,140,248,0.08)', fg: '#9ca3b8', border: 'rgba(129,140,248,0.18)' },
        red: { bg: 'rgba(239,68,68,0.12)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' },
        cyan: { bg: 'rgba(56,189,248,0.12)', fg: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    } as const
    const tone = tones[iconTone]

    return (
        <div
            className="grid items-start gap-3.5 px-4 py-3.5 rounded-xl transition-all"
            style={{
                gridTemplateColumns: 'auto 1fr auto',
                background: checked
                    ? 'linear-gradient(180deg, rgba(56,189,248,0.04), rgba(8,13,24,0.4))'
                    : 'rgba(8,13,24,0.4)',
                border: `1px solid ${checked ? `${activeColor}40` : 'rgba(129,140,248,0.12)'}`,
            }}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}
            >
                {icon}
            </div>
            <div className="flex flex-col gap-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: '#dee2f2', letterSpacing: -0.2 }}>
                        {label}
                    </span>
                    {badge && (
                        <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                background:
                                    'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(129,140,248,0.18))',
                                border: '1px solid rgba(56,189,248,0.4)',
                                color: '#dee2f2',
                                letterSpacing: 1.3,
                            }}
                        >
                            {badge}
                        </span>
                    )}
                    {checked && (
                        <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                color: activeColor,
                                border: `1px solid ${activeColor}50`,
                                background: `${activeColor}14`,
                                letterSpacing: 1.3,
                            }}
                        >
                            ACTIVO
                        </span>
                    )}
                </div>
                <div className="text-[12.5px]" style={{ color: '#9ca3b8', lineHeight: 1.5 }}>
                    {helper}
                </div>
            </div>
            <Switch checked={checked} onChange={onChange} activeColor={activeColor} disabled={disabled} />
        </div>
    )
}

function TimelineRow({ event, last }: { event: TimelineEventDTO; last: boolean }) {
    const tones = {
        green: { bg: 'rgba(52,211,153,0.14)', fg: '#34d399' },
        cyan: { bg: 'rgba(56,189,248,0.14)', fg: '#38bdf8' },
        indigo: { bg: 'rgba(129,140,248,0.14)', fg: '#818cf8' },
    }[event.tone]

    const icon = {
        enrollment: <Plus size={11} />,
        lesson: <PlayCircle size={11} />,
        payment: <Check size={11} />,
        sale: <TrendingUp size={11} />,
    }[event.type]

    return (
        <div className="flex gap-3 relative">
            <div className="flex flex-col items-center shrink-0 w-6">
                <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.fg}40` }}
                >
                    {icon}
                </div>
                {!last && (
                    <div
                        className="flex-1 w-px min-h-[14px]"
                        style={{ background: 'rgba(129,140,248,0.18)' }}
                    />
                )}
            </div>
            <div className="pb-3.5 flex-1 min-w-0">
                <div className="text-[12.5px]" style={{ color: '#dee2f2', lineHeight: 1.4 }}>
                    {event.label}
                </div>
                <div
                    className="mt-0.5 text-[10.5px]"
                    style={{
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        color: '#7a8094',
                        letterSpacing: 0.3,
                    }}
                >
                    {relativeFromNow(event.date)}
                </div>
            </div>
        </div>
    )
}

function ConfirmDialog({
    icon,
    tone,
    title,
    body,
    confirmLabel,
    busy,
    onCancel,
    onConfirm,
}: {
    icon: React.ReactNode
    tone: 'cyan' | 'amber' | 'red'
    title: string
    body: React.ReactNode
    confirmLabel: string
    busy?: boolean
    onCancel: () => void
    onConfirm: () => void
}) {
    const t = {
        cyan: {
            bg: 'rgba(56,189,248,0.14)',
            fg: '#38bdf8',
            btn: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        },
        amber: {
            bg: 'rgba(251,191,36,0.14)',
            fg: '#fbbf24',
            btn: 'linear-gradient(135deg, #f59e0b, #d97706)',
        },
        red: { bg: 'rgba(239,68,68,0.14)', fg: '#f87171', btn: '#ef4444' },
    }[tone]

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(8,13,24,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => !busy && onCancel()}
        >
            <div
                className="w-full max-w-md p-7 rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(20,25,38,0.98), rgba(14,19,30,0.98))',
                    border: '1px solid rgba(129,140,248,0.25)',
                    boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3.5"
                    style={{ background: t.bg, color: t.fg, border: `1px solid ${t.fg}40` }}
                >
                    {icon}
                </div>
                <h3
                    className="text-lg font-semibold m-0 mb-2"
                    style={{ color: '#dee2f2', letterSpacing: -0.3 }}
                >
                    {title}
                </h3>
                <div className="text-[13.5px] mb-5" style={{ color: '#9ca3b8', lineHeight: 1.55 }}>
                    {body}
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={busy}
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
                        onClick={onConfirm}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                        style={{
                            background: t.btn,
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 8px 20px -8px rgba(0,0,0,0.5)',
                        }}
                    >
                        {busy ? '…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
