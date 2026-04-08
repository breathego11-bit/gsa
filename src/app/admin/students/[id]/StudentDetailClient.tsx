'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
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
}

interface PaymentInfo {
    id: string
    payment_type: string
    amount_total: number
    currency: string
    status: string
    installments_paid: number
    installments_total: number
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

const paymentTypeLabels: Record<string, string> = {
    one_time: 'Pago Completo',
    installment: 'Plan de Cuotas',
}

export function StudentDetailClient({ student, courses, payments }: Props) {
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
                <p className="section-subtitle mb-6">Estado de la suscripción y pagos realizados</p>

                <Card>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-raised)' }}>
                                <MaterialIcon name="payments" size="text-xl" className="text-secondary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Estado de acceso</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStatusLabels[student.payment_status]?.color || paymentStatusLabels.none.color}`}>
                                    {paymentStatusLabels[student.payment_status]?.label || 'Sin pago'}
                                </span>
                            </div>
                        </div>
                        {payments.length > 0 && (() => {
                            const totalPaid = payments.reduce((sum, p) => {
                                if (p.status === 'failed') return sum
                                if (p.payment_type === 'one_time' && p.status === 'completed') return sum + p.amount_total
                                if (p.payment_type === 'installment') return sum + (p.installments_paid * Math.round(p.amount_total / p.installments_total))
                                return sum
                            }, 0)
                            return (
                                <div className="text-right">
                                    <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                                        {formatAmount(totalPaid, payments[0].currency)}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total pagado</p>
                                </div>
                            )
                        })()}
                    </div>

                    {payments.length === 0 ? (
                        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                            Este estudiante no ha realizado pagos.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((p) => {
                                const perInstallment = Math.round(p.amount_total / p.installments_total)
                                const amountPaid = p.payment_type === 'installment'
                                    ? p.installments_paid * perInstallment
                                    : (p.status === 'completed' ? p.amount_total : 0)

                                return (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between p-4 rounded-xl"
                                        style={{ background: 'var(--bg-raised)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MaterialIcon
                                                name={p.payment_type === 'one_time' ? 'credit_card' : 'event_repeat'}
                                                size="text-lg"
                                                className={p.status === 'completed' ? 'text-emerald-400' : p.status === 'failed' ? 'text-red-400' : 'text-blue-400'}
                                            />
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {paymentTypeLabels[p.payment_type] || p.payment_type}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatDate(p.created_at)}
                                                    {p.payment_type === 'installment' && ` • Cuota ${p.installments_paid}/${p.installments_total}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {formatAmount(amountPaid, p.currency)}
                                                {p.payment_type === 'installment' && (
                                                    <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                                                        {' '}/ {formatAmount(p.amount_total, p.currency)}
                                                    </span>
                                                )}
                                            </p>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                p.status === 'completed' ? 'text-emerald-400'
                                                    : p.status === 'failed' ? 'text-red-400'
                                                        : 'text-blue-400'
                                            }`}>
                                                {p.status === 'completed' ? 'Completado' : p.status === 'failed' ? 'Fallido' : p.payment_type === 'installment' ? `${p.installments_paid} de ${p.installments_total} cuotas` : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
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
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                            Curso
                                        </th>
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                                            Inscripcion
                                        </th>
                                        <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                            Progreso
                                        </th>
                                        <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                            Estado
                                        </th>
                                        <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                                            Examen Final
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map((course) => (
                                        <tr key={course.enrollmentId} className="table-row-base">
                                            {/* Course name */}
                                            <td className="py-4 pr-4">
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {course.courseTitle}
                                                </p>
                                                {course.instructorName && (
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                                        {course.instructorName}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Enrollment date */}
                                            <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {formatDate(course.enrolledAt)}
                                            </td>

                                            {/* Progress bar */}
                                            <td className="py-4 pr-4 min-w-[160px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${course.progressPercent}%`,
                                                                background: course.approved
                                                                    ? 'rgb(16, 185, 129)'
                                                                    : course.progressPercent > 0
                                                                        ? 'var(--blue-accent)'
                                                                        : 'transparent',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold w-10 text-right" style={{ color: 'var(--text-primary)' }}>
                                                        {course.progressPercent}%
                                                    </span>
                                                </div>
                                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                    {course.completedLessons}/{course.totalLessons} lecciones
                                                </p>
                                            </td>

                                            {/* Status badge */}
                                            <td className="py-4 pr-4 text-center">
                                                {course.approved ? (
                                                    <Badge variant="success">Aprobado</Badge>
                                                ) : course.progressPercent > 0 ? (
                                                    <Badge variant="info">En progreso</Badge>
                                                ) : (
                                                    <Badge variant="draft">No iniciado</Badge>
                                                )}
                                            </td>

                                            {/* Final exam */}
                                            <td className="py-4 text-center hidden sm:table-cell">
                                                {!course.hasFinalExam ? (
                                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
                                                ) : course.finalExamPassed === true ? (
                                                    <Badge variant="success">Aprobado {course.finalExamScore}%</Badge>
                                                ) : course.finalExamPassed === false ? (
                                                    <Badge variant="warning">Reprobado {course.finalExamScore}%</Badge>
                                                ) : (
                                                    <Badge variant="draft">Pendiente</Badge>
                                                )}
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
