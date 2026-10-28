import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { MainContent } from '@/components/layout/MainContent'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'
import { Watermark } from '@/components/layout/Watermark'
import { isLeadAuthorized, showsOwnLeads } from '@/lib/calendar/pool'
import { getAccessProfile } from '@/lib/access-profile'
import { isCloser } from '@/lib/access'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const closerEnabled = session.user.closer_enabled ?? false
    const closerType = session.user.closer_type ?? null
    const closer = isCloser({ closer_enabled: closerEnabled, closer_type: closerType })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [salesCount, leadsByStatus, me] = await Promise.all([
        closer
            ? prisma.sale.count({
                  where: {
                      closer_id: session.user.id,
                      sale_date: { gte: monthStart, lte: monthEnd },
                  },
              })
            : Promise.resolve(0),
        // Sus leads por estado, en una sola consulta: de aquí salen los sin contactar (badge) y el
        // total (aunque le retiren la autorización, los que ya tiene siguen siendo suyos).
        closer
            ? prisma.lead.groupBy({ by: ['status'], where: { assigned_to: session.user.id }, _count: { _all: true } })
            : Promise.resolve([]),
        // Cacheado por petición: la página y la tarjeta de conexión lo vuelven a pedir sin otra consulta.
        getAccessProfile(session.user.id),
    ])

    if (!me) redirect('/api/auth/clear-session')

    // Al menú (componente de cliente) solo le llega lo que pinta; los campos de permisos se quedan aquí.
    const user = { name: me.name, last_name: me.last_name, email: me.email, profile_image: me.profile_image }

    const leadsNew = leadsByStatus.find((g) => g.status === 'NUEVO')?._count._all ?? 0
    const leadsAssigned = leadsByStatus.reduce((sum, g) => sum + g._count._all, 0)
    const badges = closer ? { salesCount, leadsNew } : {}
    const caps = { leads: closer && showsOwnLeads(isLeadAuthorized(me), leadsAssigned) }

    return (
        <div className="flex h-[100svh] lg:h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            <AnimatedBackground />
            <Watermark />
            {/* z-30 > z-10 de <main>: al expandirse por hover el sidebar se superpone al
              contenido, y a igual z-index ganaría main por ir despues en el DOM. */}
            <div className="hidden lg:flex shrink-0 relative z-30">
                <Sidebar
                    role="STUDENT"
                    closerEnabled={closerEnabled}
                    closerType={closerType}
                    user={user}
                    badges={badges}
                    caps={caps}
                />
            </div>
            <MobileNav
                role="STUDENT"
                closerEnabled={closerEnabled}
                closerType={closerType}
                user={user}
                badges={badges}
                caps={caps}
            />
            <MainContent
                wrapperClassName="p-4 sm:p-6 md:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto"
                fullBleedPaths={['/dashboard/method', '/dashboard/sales', '/dashboard/coach']}
            >
                {children}
            </MainContent>
        </div>
    )
}
