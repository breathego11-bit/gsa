import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions)

    // Parallel data fetching
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [
        totalStudents,
        monthlyEnrollments,
        totalProgress,
        completedProgress,
        courses,
    ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.enrollment.findMany({
            where: { created_at: { gte: oneMonthAgo } },
            include: { course: { select: { price: true } } },
        }),
        prisma.lessonProgress.count(),
        prisma.lessonProgress.count({ where: { completed: true } }),
        prisma.course.findMany({
            include: {
                instructor: { select: { name: true, last_name: true } },
                _count: { select: { modules: true, enrollments: true } },
                modules: { include: { _count: { select: { lessons: true } } } },
            },
            orderBy: { created_at: 'desc' },
        }),
    ])

    const monthlyRevenue = monthlyEnrollments.reduce((sum, e) => sum + (e.course.price || 0), 0)
    const avgCompletion = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0
    const maxEnrollments = Math.max(...courses.map((c) => c._count.enrollments), 1)

    return (
        <div className="space-y-12">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-on-surface">
                        Inteligencia de la Academia
                    </h1>
                    <p className="text-on-surface-variant mt-2">
                        Información en tiempo real sobre el rendimiento de tu academia.
                    </p>
                </div>
                <Link
                    href="/admin/courses"
                    className="bg-gradient-to-r from-primary-container to-secondary-container text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all w-fit"
                >
                    <MaterialIcon name="add" size="text-lg" />
                    Crear Nuevo Curso
                </Link>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Students */}
                <div className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5">
                        groups
                    </span>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <MaterialIcon name="groups" size="text-xl" className="text-blue-400" />
                            </div>
                            <span className="text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                +14% este mes
                            </span>
                        </div>
                        <p className="text-5xl font-black text-on-surface tracking-tighter">
                            {totalStudents.toLocaleString()}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2">
                            Total Estudiantes
                        </p>
                    </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5">
                        payments
                    </span>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <MaterialIcon name="payments" size="text-xl" className="text-emerald-400" />
                            </div>
                            {monthlyRevenue > 0 && (
                                <span className="text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                    +{monthlyEnrollments.length} inscripciones
                                </span>
                            )}
                        </div>
                        <p className="text-5xl font-black text-on-surface tracking-tighter">
                            ${monthlyRevenue.toLocaleString()}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2">
                            Ingresos Mensuales
                        </p>
                    </div>
                </div>

                {/* Avg Completion */}
                <div className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden border border-primary/30">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5">
                        verified
                    </span>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <MaterialIcon name="verified" size="text-xl" className="text-primary" />
                            </div>
                        </div>
                        <p className="text-5xl font-black text-on-surface tracking-tighter">
                            {avgCompletion}%
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2">
                            Completación Promedio
                        </p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">
                            Promedio industria: 44%
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Course Management Table ─────────────────── */}
            <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-white/5">
                {/* Table header */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
                    <div>
                        <h3 className="text-xl font-bold text-on-surface">Gestión de Cursos</h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                            {courses.length} cursos {courses.filter((c) => c.published).length > 0 && `(${courses.filter((c) => c.published).length} activos)`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant/15">
                            <MaterialIcon name="search" size="text-sm" className="text-on-surface-variant" />
                            <input
                                className="bg-transparent border-none text-sm focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 w-40 outline-none ml-2"
                                placeholder="Buscar curso..."
                                type="text"
                            />
                        </div>
                        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <MaterialIcon name="filter_list" size="text-xl" className="text-on-surface-variant" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                {courses.length === 0 ? (
                    <div className="p-16 text-center">
                        <MaterialIcon name="school" size="text-5xl" className="text-on-surface-variant/30 mb-4" />
                        <p className="text-on-surface-variant">No hay cursos creados aún</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Curso
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Instructor
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Inscritos
                                    </th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => {
                                    const totalLessons = course.modules.reduce((sum, m) => sum + m._count.lessons, 0)
                                    const initials = course.instructor
                                        ? `${course.instructor.name[0]}${course.instructor.last_name[0]}`
                                        : '?'
                                    const enrollPercent = Math.round((course._count.enrollments / maxEnrollments) * 100)

                                    return (
                                        <tr key={course.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            {/* Course */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
                                                        {course.thumbnail ? (
                                                            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <MaterialIcon name="school" size="text-lg" className="text-on-surface-variant/40" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-on-surface text-sm line-clamp-1">{course.title}</p>
                                                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                                                            {course._count.modules} Módulos • {totalLessons} Lecciones
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Instructor */}
                                            <td className="px-6 py-4">
                                                {course.instructor ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                                            {initials}
                                                        </div>
                                                        <span className="text-sm text-on-surface-variant">
                                                            {course.instructor.name} {course.instructor.last_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-on-surface-variant/50">Sin asignar</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                {course.published ? (
                                                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                        Publicado
                                                    </span>
                                                ) : (
                                                    <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                        Borrador
                                                    </span>
                                                )}
                                            </td>

                                            {/* Enrolled */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <span className="text-sm font-bold text-on-surface">
                                                        {course._count.enrollments.toLocaleString()}
                                                    </span>
                                                    <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-secondary rounded-full"
                                                            style={{ width: `${enrollPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href="/admin/courses"
                                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                    >
                                                        <MaterialIcon name="edit" size="text-sm" className="text-on-surface-variant" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
