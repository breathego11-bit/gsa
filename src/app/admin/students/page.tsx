import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default async function AdminStudentsPage() {
    const students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: {
            id: true,
            name: true,
            last_name: true,
            username: true,
            email: true,
            phone: true,
            payment_status: true,
            blocked: true,
            created_at: true,
            profile_image: true,
            _count: { select: { enrollments: true } },
        },
        orderBy: { created_at: 'desc' },
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Estudiantes</h1>
                <p className="section-subtitle">
                    {students.length} {students.length === 1 ? 'estudiante registrado' : 'estudiantes registrados'}
                </p>
            </div>

            <Card>
                {students.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Aún no hay estudiantes registrados.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estudiante</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Usuario</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Teléfono</th>
                                    <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                                    <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cursos</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Registro</th>
                                    <th className="pb-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="table-row-base">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                {/* La foto que sube el alumno: hasta ahora solo se
                                                    veía en su ficha, no en el listado. */}
                                                <div
                                                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden text-[11px] font-semibold text-white"
                                                    style={{
                                                        background: student.profile_image
                                                            ? 'var(--bg-raised)'
                                                            : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                                    }}
                                                >
                                                    {student.profile_image ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={student.profile_image}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        `${student.name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {student.name} {student.last_name}
                                                    </p>
                                                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                                        {student.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 hidden sm:table-cell">
                                            <span className="font-mono text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                                                @{student.username}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {student.phone ?? '—'}
                                        </td>
                                        <td className="py-4 pr-4 text-center hidden sm:table-cell">
                                            {student.blocked ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400">
                                                    Bloqueado
                                                </span>
                                            ) : student.payment_status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                                                    Activo
                                                </span>
                                            ) : student.payment_status === 'complimentary' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">
                                                    Cortesía
                                                </span>
                                            ) : student.payment_status === 'past_due' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">
                                                    Pago pendiente
                                                </span>
                                            ) : student.payment_status === 'cancelled' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400">
                                                    Cancelado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-white/5 text-on-surface-variant">
                                                    Sin pago
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 pr-4 text-center">
                                            <span
                                                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold"
                                                style={{
                                                    background: student._count.enrollments > 0
                                                        ? 'rgba(59,130,246,0.15)'
                                                        : 'var(--bg-raised)',
                                                    color: student._count.enrollments > 0
                                                        ? 'var(--blue-accent)'
                                                        : 'var(--text-secondary)',
                                                }}
                                            >
                                                {student._count.enrollments}
                                            </span>
                                        </td>
                                        <td className="py-4 hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(student.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link
                                                href={`/admin/students/${student.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                                                style={{ color: 'var(--blue-accent)' }}
                                            >
                                                Ver progreso
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
