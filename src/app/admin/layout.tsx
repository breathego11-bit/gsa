import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { MainContent } from '@/components/layout/MainContent'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'
import { Watermark } from '@/components/layout/Watermark'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/auth')

    // Fetch sidebar data: badges (counts) + current user info
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [studentsCount, invitationsPending, monthCashAgg, leadsNew, mySalesCount, user] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.invitation.count({ where: { used: false } }),
        prisma.saleInstallment.aggregate({
            where: {
                collected: true,
                collected_at: { gte: monthStart, lte: monthEnd },
            },
            _sum: { amount: true },
        }),
        prisma.lead.count({ where: { status: 'NUEVO' } }),
        // Admin's own sales this month → badge for "Mis ventas"
        prisma.sale.count({
            where: {
                closer_id: session.user.id,
                sale_date: { gte: monthStart, lte: monthEnd },
            },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, last_name: true, email: true, profile_image: true },
        }),
    ])

    if (!user) redirect('/api/auth/clear-session')

    const badges = {
        studentsCount,
        invitationsPending,
        monthCashCents: monthCashAgg._sum.amount ?? 0,
        leadsNew,
        salesCount: mySalesCount,
    }

    return (
        <div className="flex h-[100svh] lg:h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            <AnimatedBackground />
            <Watermark />
            <div className="hidden lg:flex shrink-0 relative z-10">
                <Sidebar role="ADMIN" user={user} badges={badges} />
            </div>
            <MobileNav role="ADMIN" user={user} badges={badges} />
            <MainContent
                wrapperClassName="p-4 sm:p-6 md:p-8 pb-28 lg:pb-8 max-w-7xl mx-auto"
                fullBleedPaths={['/admin/method', '/admin/sales', '/admin/my-sales', '/admin/settings', '/admin/coach$']}
            >
                {children}
            </MainContent>
        </div>
    )
}
