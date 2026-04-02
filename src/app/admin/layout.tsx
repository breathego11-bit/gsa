import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/login')

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            <div className="hidden lg:flex shrink-0">
                <Sidebar role="ADMIN" />
            </div>
            <MobileNav role="ADMIN" />
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-10 pb-28 lg:pb-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
