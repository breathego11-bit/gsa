import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { MainContent } from '@/components/layout/MainContent'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'
import { Watermark } from '@/components/layout/Watermark'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const closerEnabled = session.user.closer_enabled ?? false
    const closerType = session.user.closer_type ?? null
    const isCloser = closerEnabled && closerType !== null

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [salesCount, user] = await Promise.all([
        isCloser
            ? prisma.sale.count({
                  where: {
                      closer_id: session.user.id,
                      sale_date: { gte: monthStart, lte: monthEnd },
                  },
              })
            : Promise.resolve(0),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, last_name: true, email: true, profile_image: true },
        }),
    ])

    if (!user) redirect('/api/auth/clear-session')

    const badges = isCloser ? { salesCount } : {}

    return (
        <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            <AnimatedBackground />
            <Watermark />
            <div className="hidden lg:flex shrink-0 relative z-10">
                <Sidebar
                    role="STUDENT"
                    closerEnabled={closerEnabled}
                    closerType={closerType}
                    user={user}
                    badges={badges}
                />
            </div>
            <MobileNav
                role="STUDENT"
                closerEnabled={closerEnabled}
                closerType={closerType}
                user={user}
                badges={badges}
            />
            <MainContent
                wrapperClassName="p-6 md:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto"
                fullBleedPaths={['/dashboard/method', '/dashboard/sales']}
            >
                {children}
            </MainContent>
        </div>
    )
}
