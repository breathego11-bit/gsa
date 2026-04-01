import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/profile/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            last_name: true,
            username: true,
            email: true,
            phone: true,
            profile_image: true,
            bio: true,
            title: true,
            location: true,
            role: true,
            created_at: true,
        },
    })

    if (!user) redirect('/login')

    // Fetch instructor-specific metrics
    const [publishedCourses, totalStudents, totalLessons, mostPopularCourse] = await Promise.all([
        prisma.course.count({ where: { published: true } }),
        prisma.enrollment.groupBy({
            by: ['user_id'],
            _count: true,
        }).then((groups) => groups.length),
        prisma.lesson.count(),
        prisma.course.findFirst({
            where: { published: true },
            orderBy: { enrollments: { _count: 'desc' } },
            select: { title: true, _count: { select: { enrollments: true } } },
        }),
    ])

    return (
        <ProfileClient
            user={user}
            stats={{ enrollmentCount: 0, completedLessons: 0 }}
            adminStats={{
                publishedCourses,
                totalStudents,
                totalLessons,
                mostPopularCourse: mostPopularCourse
                    ? { title: mostPopularCourse.title, enrollments: mostPopularCourse._count.enrollments }
                    : null,
            }}
        />
    )
}
