import { getServerSession } from 'next-auth'
import { Users, Wallet, Landmark, GraduationCap } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPeriodRange, type PeriodPreset } from '@/lib/sales-period'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardKpi } from '@/components/dashboard/DashboardKpi'
import { DashboardChartCard } from '@/components/dashboard/DashboardChartCard'
import { CoursesTable, type CourseRowData } from '@/components/dashboard/CoursesTable'
import { RecentSalesCard, type RecentSaleItem } from '@/components/dashboard/RecentSalesCard'
import { TopClosersCard, type TopCloserItem } from '@/components/dashboard/TopClosersCard'

export const dynamic = 'force-dynamic'

type DashboardPeriod = Extract<PeriodPreset, 'today' | 'week' | 'month' | 'year'>

// TODO: mover a SiteSettings.monthly_revenue_target
const MONTHLY_REVENUE_TARGET_EUR = 30_000

const COURSE_PALETTE = ['#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f472b6', '#facc15']
const INSTRUCTOR_PALETTE = ['#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f472b6']

function sumCompletedCents(payments: { amount: number; status: string }[]): number {
    return payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)
}

function formatTrend(current: number, previous: number): string {
    if (previous === 0) {
        if (current === 0) return '0%'
        return '+100%'
    }
    const pct = ((current - previous) / previous) * 100
    const rounded = Math.round(pct)
    return `${rounded >= 0 ? '+' : ''}${rounded}%`
}

function parsePeriod(value: string | string[] | undefined): DashboardPeriod {
    const v = Array.isArray(value) ? value[0] : value
    if (v === 'today' || v === 'week' || v === 'year') return v
    return 'month'
}

function pickColor(palette: string[], seed: string): string {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    return palette[h % palette.length]
}

function instructorRole(role: string): string {
    return role === 'ADMIN' ? 'Admin GSA' : 'Instructor'
}

function initialsOf(name: string, lastName: string): string {
    const a = name?.[0] ?? ''
    const b = lastName?.[0] ?? ''
    return (a + b).toUpperCase() || '·'
}

interface PageProps {
    searchParams: Promise<{ period?: string | string[] }>
}

export default async function AdminDashboard({ searchParams }: PageProps) {
    await getServerSession(authOptions)

    const sp = await searchParams
    const period = parsePeriod(sp.period)
    const { from, to } = getPeriodRange(period)
    const span = to.getTime() - from.getTime()
    const prevFrom = new Date(from.getTime() - span - 1)
    const prevTo = new Date(from.getTime() - 1)

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
        totalStudents,
        totalInstructors,
        studentsThisPeriod,
        studentsPrevPeriod,
        paymentsThisPeriod,
        paymentsPrevPeriod,
        paymentsYearly,
        courses,
        allStudents6mo,
        allPayments6mo,
        completedProgress,
        recentSales,
        topClosersInstallments,
    ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({
            where: { role: 'STUDENT', created_at: { gte: from, lte: to } },
        }),
        prisma.user.count({
            where: { role: 'STUDENT', created_at: { gte: prevFrom, lte: prevTo } },
        }),
        prisma.payment.findMany({
            where: { created_at: { gte: from, lte: to } },
            select: { amount: true, status: true },
        }),
        prisma.payment.findMany({
            where: { created_at: { gte: prevFrom, lte: prevTo } },
            select: { amount: true, status: true },
        }),
        prisma.payment.findMany({
            where: { created_at: { gte: yearStart } },
            select: { amount: true, status: true },
        }),
        prisma.course.findMany({
            include: {
                instructors: {
                    orderBy: { order: 'asc' },
                    include: {
                        user: {
                            select: { id: true, name: true, last_name: true, role: true },
                        },
                    },
                },
                _count: { select: { enrollments: true, modules: true } },
                modules: { include: { _count: { select: { lessons: true } } } },
            },
            orderBy: { created_at: 'desc' },
        }),
        prisma.user.findMany({
            where: { role: 'STUDENT', created_at: { gte: sixMonthsAgo } },
            select: { created_at: true },
        }),
        prisma.payment.findMany({
            where: { status: { not: 'failed' }, created_at: { gte: sixMonthsAgo } },
            select: { amount: true, status: true, created_at: true },
        }),
        prisma.lessonProgress.findMany({
            where: { completed: true },
            select: { lesson: { select: { module: { select: { course_id: true } } } } },
        }),
        prisma.sale.findMany({
            where: { sale_date: { gte: from, lte: to } },
            orderBy: { sale_date: 'desc' },
            take: 5,
        }),
        prisma.saleInstallment.findMany({
            where: { collected: true, collected_at: { gte: from, lte: to } },
            include: {
                sale: {
                    select: {
                        id: true,
                        closer_id: true,
                        closer: { select: { name: true, last_name: true } },
                    },
                },
            },
        }),
    ])

    const monthlyRevenueEur = Math.round(sumCompletedCents(paymentsThisPeriod) / 100)
    const prevRevenueEur = Math.round(sumCompletedCents(paymentsPrevPeriod) / 100)
    const yearlyRevenueEur = Math.round(sumCompletedCents(paymentsYearly) / 100)

    const completionByCourse = new Map<string, number>()
    for (const p of completedProgress) {
        const cid = p.lesson?.module?.course_id
        if (cid) completionByCourse.set(cid, (completionByCourse.get(cid) ?? 0) + 1)
    }

    const maxEnrollments = Math.max(...courses.map((c) => c._count.enrollments), 1)

    const courseRows: CourseRowData[] = courses.map((c) => {
        const lecciones = c.modules.reduce((sum, m) => sum + m._count.lessons, 0)
        const enrolled = c._count.enrollments
        const expected = enrolled * lecciones
        const completed = completionByCourse.get(c.id) ?? 0
        const completion = expected > 0 ? Math.round((completed / expected) * 100) : 0
        const revenueEur =
            c.price != null && enrolled > 0 ? Math.round(c.price * enrolled) : c.price != null ? 0 : null

        const firstInstructor = c.instructors[0]?.user
        const instructor = firstInstructor
            ? {
                name: `${firstInstructor.name} ${firstInstructor.last_name}`.trim(),
                role: instructorRole(firstInstructor.role),
                initials: initialsOf(firstInstructor.name, firstInstructor.last_name),
                color: pickColor(INSTRUCTOR_PALETTE, firstInstructor.id),
            }
            : null

        return {
            id: c.id,
            name: c.title,
            modulos: c._count.modules,
            lecciones,
            completion,
            published: c.published,
            inscritos: enrolled,
            enrollmentMax: maxEnrollments,
            revenueEur,
            color: pickColor(COURSE_PALETTE, c.id),
            instructor,
        }
    })

    const chartMonths: string[] = []
    const studentsSeries: { label: string; value: number }[] = []
    const revenueSeries: { label: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const month = d.getMonth()
        const label = d
            .toLocaleDateString('es-ES', { month: 'short' })
            .replace('.', '')
            .toLowerCase()
        chartMonths.push(label)

        const studentsInMonth = allStudents6mo.filter((s) => {
            const c = new Date(s.created_at)
            return c.getFullYear() === year && c.getMonth() === month
        }).length

        const revenueInMonth = Math.round(
            sumCompletedCents(
                allPayments6mo.filter((p) => {
                    const c = new Date(p.created_at)
                    return c.getFullYear() === year && c.getMonth() === month
                }),
            ) / 100,
        )

        studentsSeries.push({ label, value: studentsInMonth })
        revenueSeries.push({ label, value: revenueInMonth })
    }

    const totalStudents6mo = studentsSeries.reduce((s, m) => s + m.value, 0)
    const totalRevenue6mo = revenueSeries.reduce((s, m) => s + m.value, 0)

    const studentsTrend = formatTrend(studentsThisPeriod, studentsPrevPeriod)
    const revenueTrend = formatTrend(monthlyRevenueEur, prevRevenueEur)
    const sub30Label = `vs. período anterior (${prevRevenueEur.toLocaleString('es-ES')} €)`

    const activeCourses = courses.filter((c) => c.published).length

    const recentSalesItems: RecentSaleItem[] = recentSales.map((s) => ({
        id: s.id,
        cliente: `${s.customer_first_name} ${s.customer_last_name}`.trim(),
        packageName: s.package_name,
        amountCents: s.total_amount,
        saleDate: s.sale_date,
    }))

    const closerMap = new Map<
        string,
        { id: string; name: string; cents: number; sales: Set<string> }
    >()
    for (const inst of topClosersInstallments) {
        const closerId = inst.sale.closer_id
        const existing = closerMap.get(closerId)
        const fullName = `${inst.sale.closer.name} ${inst.sale.closer.last_name}`.trim()
        if (existing) {
            existing.cents += inst.amount
            existing.sales.add(inst.sale.id)
        } else {
            closerMap.set(closerId, {
                id: closerId,
                name: fullName,
                cents: inst.amount,
                sales: new Set([inst.sale.id]),
            })
        }
    }
    const topClosers: TopCloserItem[] = [...closerMap.values()]
        .sort((a, b) => b.cents - a.cents)
        .slice(0, 4)
        .map((c) => {
            const [first = '', last = ''] = c.name.split(' ')
            return {
                id: c.id,
                name: c.name || 'Sin nombre',
                initials: initialsOf(first, last),
                cashCollectedCents: c.cents,
                salesCount: c.sales.size,
                color: pickColor(INSTRUCTOR_PALETTE, c.id),
            }
        })

    const monthlyProgressRatio = monthlyRevenueEur / MONTHLY_REVENUE_TARGET_EUR

    return (
        <div className="space-y-6">
            <DashboardHeader period={period} />

            {/* KPIs */}
            <section className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardKpi
                    icon={<Users size={16} />}
                    tint="#38bdf8"
                    label="Total estudiantes"
                    value={totalStudents.toLocaleString('es-ES')}
                    trend={studentsTrend}
                    sub={`${studentsThisPeriod} ${studentsThisPeriod === 1 ? 'nuevo' : 'nuevos'} en período`}
                    spark={studentsSeries.map((p) => p.value)}
                />
                <DashboardKpi
                    icon={<Wallet size={16} />}
                    tint="#34d399"
                    label="Ingresos período"
                    value={`${monthlyRevenueEur.toLocaleString('es-ES')} €`}
                    trend={revenueTrend}
                    sub={sub30Label}
                    progress={{
                        ratio: monthlyProgressRatio,
                        label: `${Math.round(monthlyProgressRatio * 100)}% de €${MONTHLY_REVENUE_TARGET_EUR.toLocaleString('es-ES')} objetivo`,
                    }}
                />
                <DashboardKpi
                    icon={<Landmark size={16} />}
                    tint="#a78bfa"
                    label="Ingresos anuales"
                    value={`${yearlyRevenueEur.toLocaleString('es-ES')} €`}
                    sub={`acumulado ${now.getFullYear()}`}
                />
                <DashboardKpi
                    icon={<GraduationCap size={16} />}
                    tint="#fb923c"
                    label="Cursos activos"
                    value={`${activeCourses} / ${courses.length}`}
                    trend={`${totalInstructors} ${totalInstructors === 1 ? 'instructor' : 'instructores'}`}
                    sub={
                        courses.length - activeCourses > 0
                            ? `${courses.length - activeCourses} en borrador`
                            : 'todos publicados'
                    }
                />
            </section>

            {/* Charts */}
            <section className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
                <DashboardChartCard
                    title="Crecimiento de alumnos"
                    subtitle="Últimos 6 meses · matrícula mensual"
                    data={studentsSeries}
                    color="#38bdf8"
                    headerValue={totalStudents6mo.toLocaleString('es-ES')}
                    headerKey="NUEVOS"
                    headerTrend={`+${studentsSeries[studentsSeries.length - 1]?.value ?? 0}`}
                    valueKind="students"
                />
                <DashboardChartCard
                    title="Crecimiento de ingresos"
                    subtitle="Últimos 6 meses · revenue mensual"
                    data={revenueSeries}
                    color="#34d399"
                    headerValue={`${totalRevenue6mo.toLocaleString('es-ES')} €`}
                    headerKey="TOTAL"
                    valueKind="currency"
                />
            </section>

            {/* Bottom: courses + aside */}
            <section
                className="grid gap-3.5"
                style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
            >
                <div className="grid gap-3.5 lg:[grid-template-columns:minmax(0,2.1fr)_minmax(280px,1fr)]">
                    <CoursesTable courses={courseRows} />
                    <aside className="flex flex-col gap-3.5 min-w-0">
                        <RecentSalesCard sales={recentSalesItems} />
                        <TopClosersCard closers={topClosers} />
                    </aside>
                </div>
            </section>
        </div>
    )
}
