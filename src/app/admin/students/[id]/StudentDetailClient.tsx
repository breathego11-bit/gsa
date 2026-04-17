'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
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
    courses: CourseEnrollmentProgress[]
    payments: PaymentInfo[]
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function formatAmount(cents: number, currency: string) {
    return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: currency.toUpperCase() })
}

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
    none: { label: 'Sin pago', color: 'bg-surface-variant text-on-surface-variant' },
    active: { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-400' },
    past_due: { label: 'Pago pendiente', color: 'bg-amber-500/20 text-amber-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

export function StudentDetailClient({ student, courses, payments }: Props) {
    const [blocked, setBlocked] = useState(student.blocked)
    const [blocking, setBlocking] = useState(false)

    async function toggleBlock() {
        setBlocking(true)
        try {
            const res = await fetch(`/api/admin/students/${student.id}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocked: !blocked }),
            })
            if (res.ok) setBlocked(!blocked)
        } finally {
            setBlocking(false)
        }
    }

    const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

    return (
        <div className="space-y-8">
            {/* Back link */}
            <Link
                href="/admin/students"
                className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
            >
                <ArrowLeft size={16} />
                Volver a Estudiantes
            </Link>

            {/* Student header */}
            <Card>
                <div className="flex items-center gap-6">
                    <div
                        className="w-16 h-16 rounded-2xl overflow-hidden border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}
                    >
                        {student.profile_image ? (
                            <img src={student.profile_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <MaterialIcon name="person" size="text-2xl" className="text-on-surface-variant" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            {student.name} {student.last_name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-1.5">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {student.email}
                            </span>
                            <span
                                className="font-mono text-xs px-2 py-0.5 rounded-lg"
                                style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
                            >
                                @{student.username}
                            </span>
                            {student.phone && (
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {student.phone}
                                </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Registrado el {formatDate(student.created_at)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                            {courses.length}
                        </p>
                        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>
                            {courses.length === 1 ? 'Curso' : 'Cursos'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Payment info */}
            <div>
                <h2 className="section-title mb-1">Información de Pago</h2>
                <p className="section-subtitle mb-6">Estado de acceso y pagos realizados</p>

                <Card>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-raised)' }}>
                                <MaterialIcon name="payments" size="text-xl" className="text-secondary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Estado de acceso</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStatusLabels[student.payment_status]?.color || paymentStatusLabels.none.color}`}>
                                        {paymentStatusLabels[student.payment_status]?.label || 'Sin pago'}
                                    </span>
                                    {blocked && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400">
                                            Bloqueado
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {payments.length > 0 && (
                                <div className="text-right">
                                    <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                                        {formatAmount(totalPaid, payments[0].currency)}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total pagado</p>
                                </div>
                            )}
                            <button
                                onClick={toggleBlock}
                                disabled={blocking}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                                    blocked
                                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                        : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                }`}
                            >
                                {blocking ? '...' : blocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                        </div>
                    </div>

                    {payments.length === 0 ? (
                        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                            Este estudiante no ha realizado pagos.
                        </p>
                    ) : (
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
                                            className={p.status === 'completed' ? 'text-emerald-400' : p.status === 'failed' ? 'text-red-400' : 'text-amber-400'}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {p.payment_type === 'one_time' ? 'Pago Completo' : `Cuota ${p.installment_number}`}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {p.status === 'completed' ? formatDate(p.created_at) : p.due_date ? `Vence: ${formatDate(p.due_date)}` : formatDate(p.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {formatAmount(p.amount, p.currency)}
                                        </p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                            p.status === 'completed' ? 'text-emerald-400'
                                                : p.status === 'failed' ? 'text-red-400'
                                                    : 'text-amber-400'
                                        }`}>
                                            {p.status === 'completed' ? 'Pagado' : p.status === 'failed' ? 'Fallido' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Course progress table */}
            <div>
                <h2 className="section-title mb-1">Progreso por curso</h2>
                <p className="section-subtitle mb-6">
                    Detalle del avance en cada curso inscrito
                </p>

                <Card>
                    {courses.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <MaterialIcon name="school" size="text-4xl" className="text-on-surface-variant mb-3" />
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Este estudiante no tiene inscripciones.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Curso</th>
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Inscripción</th>
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Progreso</th>
                                        <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map((c) => (
                                        <tr key={c.courseId} className="table-row-base">
                                            <td className="py-4 pr-4">
                                                <Link href={`/admin/courses/${c.courseId}/builder`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                                                    {c.courseTitle}
                                                </Link>
                                                {c.instructorName && (
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                        {c.instructorName}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {formatDate(c.enrolledAt)}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${c.progressPercent}%`,
                                                                background: c.progressPercent >= 100 ? 'var(--green-accent, #10b981)' : 'var(--blue-accent, #3b82f6)',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        {c.progressPercent}%
                                                    </span>
                                                </div>
                                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                    {c.completedLessons}/{c.totalLessons} lecciones
                                                </p>
                                            </td>
                                            <td className="py-4 text-center hidden sm:table-cell">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    c.approved ? 'bg-emerald-500/20 text-emerald-400'
                                                        : c.progressPercent > 0 ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-surface-variant text-on-surface-variant'
                                                }`}>
                                                    {c.approved ? 'Aprobado' : c.progressPercent > 0 ? 'En progreso' : 'No iniciado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
