import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { PricingConfig } from '@/lib/stripe'
import { getCommissionTiers } from '@/lib/commission'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/auth')

    const [settings, tiers, user, publishedCourses, totalStudents, totalLessons, mostPopularCourse] =
        await Promise.all([
            prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
            getCommissionTiers(),
            prisma.user.findUnique({
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
            }),
            prisma.course.count({ where: { published: true } }),
            prisma.enrollment
                .groupBy({ by: ['user_id'], _count: true })
                .then((groups) => groups.length),
            prisma.lesson.count(),
            prisma.course.findFirst({
                where: { published: true },
                orderBy: { enrollments: { _count: 'desc' } },
                select: { title: true, _count: { select: { enrollments: true } } },
            }),
        ])

    if (!user) redirect('/api/auth/clear-session')

    const pricing: PricingConfig = (settings?.pricing as unknown as PricingConfig) ?? {
        totalPrice: 188800,
        firstInstallment: 188800,
        installmentCount: 1,
    }

    return (
        <SettingsClient
            initialPricing={pricing}
            initialTiers={tiers}
            user={user}
            adminStats={{
                publishedCourses,
                totalStudents,
                totalLessons,
                mostPopularCourse: mostPopularCourse
                    ? {
                          title: mostPopularCourse.title,
                          enrollments: mostPopularCourse._count.enrollments,
                      }
                    : null,
            }}
        />
    )
}
