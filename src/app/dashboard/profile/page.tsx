import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/profile/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

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

    const enrollmentCount = await prisma.enrollment.count({
        where: { user_id: session.user.id },
    })

    const completedLessons = await prisma.lessonProgress.count({
        where: { user_id: session.user.id, completed: true },
    })

    return (
        <ProfileClient
            user={user}
            stats={{ enrollmentCount, completedLessons }}
        />
    )
}
