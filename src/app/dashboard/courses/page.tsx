import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadInstallmentGate, isItemLocked, itemUnlockInstallment } from '@/lib/installments'
import { hasActivePayment } from '@/lib/access'
import { DashboardCoursesClient, type DashboardCourseData } from './DashboardCoursesClient'

export const dynamic = 'force-dynamic'

export default async function DashboardCoursesPage() {
    const session = await getServerSession(authOptions)
    const userId = session!.user.id

    const [courses, enrollments, user] = await Promise.all([
        prisma.course.findMany({
            where: { published: true },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            select: {
                                id: true,
                                duration: true,
                                progress: {
                                    where: { user_id: userId },
                                    select: { completed: true },
                                },
                            },
                        },
                    },
                },
            },
            // Orden del catálogo: define los tramos de desbloqueo por cuotas.
            orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
        }),
        prisma.enrollment.findMany({
            where: { user_id: userId },
            select: { course_id: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, closer_enabled: true, closer_type: true, payment_status: true, blocked: true },
        }),
    ])

    const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id))
    const hasPaid = !!user && hasActivePayment(user) && !user.blocked

    // Gate de cuotas: divide el catálogo en tramos según cuotas pagadas.
    const gate = user
        ? await loadInstallmentGate(userId, user)
        : { applies: false, total: 0, paid: 0 }
    const totalCourses = courses.length

    const coursesData: DashboardCourseData[] = courses.map((course, idx) => {
        const installmentLocked = isItemLocked(idx, totalCourses, gate)
        const unlockAtInstallment = itemUnlockInstallment(idx, totalCourses, gate)
        const allLessons = course.modules.flatMap((m) => m.lessons)
        const lessonCount = allLessons.length
        const totalDurationMinutes = allLessons.reduce(
            (sum, l) => sum + (l.duration ?? 0),
            0,
        )
        const isEnrolled = enrolledCourseIds.has(course.id)

        let progressPercent = 0
        let progressCompleted = 0
        if (isEnrolled && lessonCount > 0) {
            progressCompleted = allLessons.filter((l) => l.progress[0]?.completed).length
            progressPercent = Math.round((progressCompleted / lessonCount) * 100)
        }

        return {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            hero_image: course.hero_image,
            published: course.published,
            created_at: course.created_at.toISOString(),
            tagline: course.tagline,
            tier: course.tier,
            level: course.level,
            duration: course.duration,
            year: course.year,
            hue: course.hue,
            accent: course.accent,
            trajectory: course.trajectory,
            included_items: Array.isArray(course.included_items)
                ? (course.included_items as string[])
                : null,
            modules: course.modules.map((m) => ({
                id: m.id,
                title: m.title,
                order: m.order,
            })),
            moduleCount: course.modules.length,
            lessonCount,
            totalDurationMinutes,
            isEnrolled,
            progressPercent,
            progressCompleted,
            installmentLocked,
            unlockAtInstallment,
        }
    })

    return <DashboardCoursesClient courses={coursesData} hasPaid={hasPaid} />
}
