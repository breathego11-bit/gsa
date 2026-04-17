import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/login')

    return (
        <div className="flex h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            <AnimatedBackground />
            <div className="hidden lg:flex shrink-0 relative z-10">
                <Sidebar role="ADMIN" />
            </div>
            <MobileNav role="ADMIN" />
            <main className="flex-1 overflow-y-auto relative z-10">
                <div className="p-6 md:p-8 pb-28 lg:pb-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
