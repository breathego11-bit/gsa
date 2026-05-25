import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminSalesClient } from './AdminSalesClient'

export default async function AdminSalesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (session.user.role !== 'ADMIN') redirect('/dashboard')
    return <AdminSalesClient />
}
