import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SalesDashboardClient } from './SalesDashboardClient'

export default async function SalesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (!session.user.closer_enabled && session.user.role !== 'ADMIN') {
        redirect('/dashboard')
    }
    return <SalesDashboardClient />
}
