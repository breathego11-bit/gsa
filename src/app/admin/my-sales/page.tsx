import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SalesDashboardClient } from '@/app/dashboard/sales/SalesDashboardClient'

export default async function AdminMySalesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (session.user.role !== 'ADMIN') redirect('/dashboard')
    // Reuses the closer personal-CRM UI. It consumes /api/sales, which returns the
    // sales + commission of the session user (here, the admin acting as seller).
    return <SalesDashboardClient />
}
