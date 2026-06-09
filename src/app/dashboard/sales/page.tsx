import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCRM } from '@/lib/access'
import { SalesDashboardClient } from './SalesDashboardClient'

export default async function SalesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (!canAccessCRM(session.user)) {
        redirect('/dashboard')
    }
    return <SalesDashboardClient />
}
