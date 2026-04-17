import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardCoursesClient } from './DashboardCoursesClient'

export const dynamic = 'force-dynamic'

export default async function DashboardCoursesPage() {
    const session = await getServerSession(authOptions)

    const courses = await prisma.course.findMany({
        where: { published: true },
        include: {
            modules: {
                include: {
                    lessons: { select: { id: true, duration: true } },
                },
            },
        },
        orderBy: { created_at: 'desc' },
    })

    const [enrollments, user] = await Promise.all([
        prisma.enrollment.findMany({
            where: { user_id: session!.user.id },
            select: { course_id: true },
        }),
        prisma.user.findUnique({
            where: { id: session!.user.id },
            select: { payment_status: true, blocked: true },
        }),
    ])
    const enrolledCourseIds = enrollments.map((e) => e.course_id)
    const hasPaid = user?.payment_status === 'active' && !user?.blocked

    const coursesData = courses.map((course) => {
        const lessonCount = course.modules.reduce(
            (sum, m) => sum + m.lessons.length,
            0,
        )
        const totalDurationMinutes = course.modules.reduce(
            (sum, m) =>
                sum + m.lessons.reduce((ls, l) => ls + (l.duration || 0), 0),
            0,
        )

        return {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            lessonCount,
            totalDurationMinutes,
            isEnrolled: enrolledCourseIds.includes(course.id),
        }
    })

    return <DashboardCoursesClient courses={coursesData} hasPaid={hasPaid} />
}
