import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SaleDetailClient } from '@/app/dashboard/sales/[id]/SaleDetailClient'
import type { SaleDTO } from '@/lib/sales'

export default async function AdminSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (session.user.role !== 'ADMIN') redirect('/dashboard')

    const { id } = await params
    const sale = await prisma.sale.findUnique({
        where: { id },
        include: { installments: true },
    })
    if (!sale) notFound()

    const cash_collected = sale.installments
        .filter((i) => i.collected)
        .reduce((sum, i) => sum + i.amount, 0)

    const dto: SaleDTO = {
        id: sale.id,
        closer_id: sale.closer_id,
        customer_first_name: sale.customer_first_name,
        customer_last_name: sale.customer_last_name,
        customer_email: sale.customer_email,
        customer_phone: sale.customer_phone,
        package_name: sale.package_name,
        package_description: sale.package_description,
        total_amount: sale.total_amount,
        payment_type: sale.payment_type,
        screenshot_url: sale.screenshot_url,
        sale_date: sale.sale_date.toISOString(),
        created_at: sale.created_at.toISOString(),
        updated_at: sale.updated_at.toISOString(),
        installments: sale.installments
            .sort((a, b) => a.order - b.order)
            .map((i) => ({
                id: i.id,
                order: i.order,
                amount: i.amount,
                due_date: i.due_date?.toISOString() ?? null,
                collected: i.collected,
                collected_at: i.collected_at?.toISOString() ?? null,
            })),
        cash_collected,
    }

    return <SaleDetailClient sale={dto} backHref="/admin/sales" />
}
