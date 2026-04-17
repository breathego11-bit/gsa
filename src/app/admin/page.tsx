import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { GrowthCharts } from '@/components/charts/GrowthCharts'

export const dynamic = 'force-dynamic'

function calcRevenue(payments: { amount: number; status: string }[]) {
    return payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
}

export default async function AdminDashboard() {
    await getServerSession(authOptions)

    const now = new Date()
    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const oneYearAgo = new Date(now)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const [
        totalStudents,
        totalInstructors,
        monthlyPayments,
        yearlyPayments,
        totalProgress,
        completedProgress,
        courses,
        // Data for growth chart: students and payments per month (last 6 months)
        allStudents,
        allPayments,
    ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.payment.findMany({
            where: { created_at: { gte: oneMonthAgo } },
            select: { amount: true, status: true },
        }),
        prisma.payment.findMany({
            where: { created_at: { gte: oneYearAgo } },
            select: { amount: true, status: true },
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
        // For growth chart
        prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { created_at: true },
            orderBy: { created_at: 'asc' },
        }),
        prisma.payment.findMany({
            where: { status: { not: 'failed' } },
            select: { amount: true, status: true, created_at: true },
        }),
    ])

    const monthlyRevenue = Math.round(calcRevenue(monthlyPayments) / 100)
    const yearlyRevenue = Math.round(calcRevenue(yearlyPayments) / 100)
    const avgCompletion = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0
    const maxEnrollments = Math.max(...courses.map((c: any) => c._count.enrollments), 1)

    // Build chart data: last 6 months
    const chartMonths: { label: string; students: number; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now)
        d.setMonth(d.getMonth() - i)
        const year = d.getFullYear()
        const month = d.getMonth()
        const label = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')

        const studentsInMonth = allStudents.filter((s: any) => {
            const c = new Date(s.created_at)
            return c.getFullYear() === year && c.getMonth() === month
        }).length

        const revenueInMonth = Math.round(calcRevenue(allPayments.filter((p: any) => {
            const c = new Date(p.created_at)
            return c.getFullYear() === year && c.getMonth() === month
        })) / 100)

        chartMonths.push({ label, students: studentsInMonth, revenue: revenueInMonth })
    }


    return (
        <div className="space-y-8 lg:space-y-12">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-on-surface">
                        Dashboard
                    </h1>
                    <p className="text-on-surface-variant mt-1 text-sm lg:text-base">
                        Información en tiempo real sobre el rendimiento de tu academia.
                    </p>
                </div>
                <Link
                    href="/admin/courses"
                    className="hidden md:flex bg-gradient-to-r from-primary-container to-secondary-container text-white px-6 py-3 rounded-xl font-bold text-sm items-center gap-2 hover:shadow-lg active:scale-95 transition-all w-fit"
                >
                    <MaterialIcon name="add" size="text-lg" />
                    Crear Nuevo Curso
                </Link>
            </div>

            {/* ── KPI Cards ───────────────────────────────── */}
            <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-6 px-6 py-2 lg:mx-0 lg:px-0 lg:py-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
                {/* Total Students */}
                <div className="min-w-[200px] lg:min-w-0 bg-surface-container-low rounded-2xl p-5 lg:p-8 border border-outline-variant/15 flex flex-col justify-between h-36 lg:h-auto relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5 hidden lg:block">groups</span>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-on-surface-variant font-medium text-sm lg:hidden">Estudiantes</span>
                        <span className="material-symbols-outlined text-secondary lg:hidden">group</span>
                        <div className="hidden lg:flex w-10 h-10 rounded-xl bg-blue-500/10 items-center justify-center">
                            <MaterialIcon name="groups" size="text-xl" className="text-blue-400" />
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <div className="text-2xl lg:text-4xl font-bold lg:font-black text-on-surface lg:tracking-tighter">
                            {totalStudents.toLocaleString()}
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden lg:block">Total Estudiantes</p>
                    </div>
                </div>

                {/* Monthly Revenue */}
                <div className="min-w-[200px] lg:min-w-0 bg-surface-container-low rounded-2xl p-5 lg:p-8 border border-outline-variant/15 flex flex-col justify-between h-36 lg:h-auto relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5 hidden lg:block">payments</span>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-on-surface-variant font-medium text-sm lg:hidden">Mensual</span>
                        <span className="material-symbols-outlined text-secondary lg:hidden">payments</span>
                        <div className="hidden lg:flex w-10 h-10 rounded-xl bg-emerald-500/10 items-center justify-center">
                            <MaterialIcon name="payments" size="text-xl" className="text-emerald-400" />
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <div className="text-2xl lg:text-4xl font-bold lg:font-black text-on-surface lg:tracking-tighter">
                            {monthlyRevenue.toLocaleString('es-ES')}€
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden lg:block">Ingresos Mensuales</p>
                    </div>
                </div>

                {/* Yearly Revenue */}
                <div className="min-w-[200px] lg:min-w-0 bg-surface-container-low rounded-2xl p-5 lg:p-8 border border-outline-variant/15 flex flex-col justify-between h-36 lg:h-auto relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5 hidden lg:block">account_balance</span>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-on-surface-variant font-medium text-sm lg:hidden">Anual</span>
                        <span className="material-symbols-outlined text-secondary lg:hidden">account_balance</span>
                        <div className="hidden lg:flex w-10 h-10 rounded-xl bg-purple-500/10 items-center justify-center">
                            <MaterialIcon name="account_balance" size="text-xl" className="text-purple-400" />
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <div className="text-2xl lg:text-4xl font-bold lg:font-black text-on-surface lg:tracking-tighter">
                            {yearlyRevenue.toLocaleString('es-ES')}€
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden lg:block">Ingresos Anuales</p>
                    </div>
                </div>

                {/* Instructors */}
                <div className="min-w-[200px] lg:min-w-0 bg-surface-container-low rounded-2xl p-5 lg:p-8 border border-outline-variant/15 lg:border-primary/30 flex flex-col justify-between h-36 lg:h-auto relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-on-surface-variant/5 hidden lg:block">school</span>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-on-surface-variant font-medium text-sm lg:hidden">Instructores</span>
                        <span className="material-symbols-outlined text-secondary lg:hidden">school</span>
                        <div className="hidden lg:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                            <MaterialIcon name="school" size="text-xl" className="text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <div className="text-2xl lg:text-4xl font-bold lg:font-black text-on-surface lg:tracking-tighter">
                            {totalInstructors}
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden lg:block">Instructores</p>
                    </div>
                </div>
            </div>

            {/* ── Growth Charts ───────────────────────────── */}
            <GrowthCharts
                data={chartMonths}
                totalStudents={chartMonths.reduce((s, m) => s + m.students, 0)}
                totalRevenue={chartMonths.reduce((s, m) => s + m.revenue, 0)}
            />

            {/* ── Course Section ──────────────────────────── */}
            {/* Mobile: card list / Desktop: table */}

            {/* Mobile header */}
            <div className="lg:hidden space-y-4">
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-secondary mb-1 block">Resumen</span>
                        <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Cursos Activos</h2>
                    </div>
                    <Link
                        href="/admin/courses"
                        className="bg-surface-container-high p-3 rounded-xl border border-outline-variant/15 text-on-surface-variant active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined">add</span>
                    </Link>
                </div>
            </div>

            {/* Mobile: Course Cards */}
            <div className="lg:hidden space-y-4">
                {courses.length === 0 ? (
                    <div className="py-16 text-center">
                        <MaterialIcon name="school" size="text-5xl" className="text-on-surface-variant/30 mb-4" />
                        <p className="text-on-surface-variant">No hay cursos creados aún</p>
                    </div>
                ) : (
                    courses.map((course) => {
                        const totalLessons = course.modules.reduce((sum, m) => sum + m._count.lessons, 0)
                        const enrollPercent = Math.round((course._count.enrollments / maxEnrollments) * 100)

                        return (
                            <Link
                                key={course.id}
                                href={`/admin/courses/${course.id}/builder`}
                                className="block bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10 active:scale-[0.98] transition-transform"
                            >
                                {/* Thumbnail */}
                                <div className="relative h-44 w-full">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary-container/30 to-secondary-container/30 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">school</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        {course.published ? (
                                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md">
                                                Publicado
                                            </span>
                                        ) : (
                                            <span className="bg-surface-container-highest/60 text-on-surface-variant text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md">
                                                Borrador
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-surface-container-low to-transparent" />
                                </div>
                                {/* Info */}
                                <div className="p-5 space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-on-surface">{course.title}</h3>
                                        <p className="text-sm text-on-surface-variant">
                                            {course.instructor
                                                ? `${course.instructor.name} ${course.instructor.last_name}`
                                                : 'Sin instructor'}
                                            {' • '}{course._count.modules} Módulos • {totalLessons} Lecciones
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-sm">group</span>
                                            <span className="text-xs font-medium text-on-surface">
                                                {course._count.enrollments.toLocaleString()} Estudiantes
                                            </span>
                                        </div>
                                        <div className="w-24 bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary-container h-full rounded-full"
                                                style={{ width: `${enrollPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>

            {/* Desktop: Table (unchanged) */}
            <div className="hidden lg:block bg-surface-container-low rounded-2xl overflow-hidden border border-white/5">
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
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Curso</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Instructor</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Estado</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Inscritos</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Acciones</th>
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
                                            <td className="px-6 py-4">
                                                {course.published ? (
                                                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Publicado</span>
                                                ) : (
                                                    <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Borrador</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <span className="text-sm font-bold text-on-surface">{course._count.enrollments.toLocaleString()}</span>
                                                    <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                                                        <div className="h-full bg-secondary rounded-full" style={{ width: `${enrollPercent}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/admin/courses/${course.id}/builder`} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
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
