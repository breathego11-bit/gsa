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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const closerEnabled = session.user.closer_enabled ?? false
    const closerType = session.user.closer_type ?? null
    const isCloser = closerEnabled && closerType !== null

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [salesCount, leadsNew, leadsAssigned, me] = await Promise.all([
        isCloser
            ? prisma.sale.count({
                  where: {
                      closer_id: session.user.id,
                      sale_date: { gte: monthStart, lte: monthEnd },
                  },
              })
            : Promise.resolve(0),
        // Leads propios sin contactar: el badge de "Mis leads".
        isCloser
            ? prisma.lead.count({ where: { assigned_to: session.user.id, status: 'NUEVO' } })
            : Promise.resolve(0),
        // Cualquier lead asignado: aunque le retiren la autorización, los que ya tiene siguen siendo suyos.
        isCloser ? prisma.lead.count({ where: { assigned_to: session.user.id } }) : Promise.resolve(0),
        // Cacheado por petición: la página y la tarjeta de conexión lo vuelven a pedir sin otra consulta.
        getAccessProfile(session.user.id),
    ])

    if (!me) redirect('/api/auth/clear-session')

    // Al menú (componente de cliente) solo le llega lo que pinta; los campos de permisos se quedan aquí.
    const user = { name: me.name, last_name: me.last_name, email: me.email, profile_image: me.profile_image }

    const badges = isCloser
        ? { salesCount, leadsNew, leadsAccess: showsOwnLeads(isLeadAuthorized(me), leadsAssigned) }
        : {}

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
                wrapperClassName="p-4 sm:p-6 md:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto"
                fullBleedPaths={['/dashboard/method', '/dashboard/sales', '/dashboard/coach']}
            >
                {children}
            </MainContent>
        </div>
    )
}
