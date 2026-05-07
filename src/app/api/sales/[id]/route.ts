import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SaleDTO } from '@/lib/sales'
import type { Sale, SaleInstallment } from '@prisma/client'

function toSaleDTO(s: Sale & { installments: SaleInstallment[] }): SaleDTO {
    const cash_collected = s.installments.filter((i) => i.collected).reduce((sum, i) => sum + i.amount, 0)
    return {
        id: s.id,
        closer_id: s.closer_id,
        customer_first_name: s.customer_first_name,
        customer_last_name: s.customer_last_name,
        customer_email: s.customer_email,
        customer_phone: s.customer_phone,
        package_name: s.package_name,
        package_description: s.package_description,
        total_amount: s.total_amount,
        payment_type: s.payment_type,
        screenshot_url: s.screenshot_url,
        sale_date: s.sale_date.toISOString(),
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
        installments: s.installments
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
}

async function authorize(saleId: string, session: Session | null) {
    if (!session) return { ok: false as const, status: 401, error: 'Unauthorized' }
    const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { installments: true } })
    if (!sale) return { ok: false as const, status: 404, error: 'Not found' }
    const isOwner = sale.closer_id === session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    if (!isOwner && !isAdmin) return { ok: false as const, status: 403, error: 'Forbidden' }
    return { ok: true as const, sale }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    const { id } = await params
    const result = await authorize(id, session)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(toSaleDTO(result.sale))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    const { id } = await params
    const result = await authorize(id, session)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    const body = await req.json()
    const allowedFields: Array<keyof typeof body> = [
        'customer_first_name',
        'customer_last_name',
        'customer_email',
        'customer_phone',
        'package_name',
        'package_description',
        'screenshot_url',
        'sale_date',
    ]
    const data: Record<string, unknown> = {}
    for (const key of allowedFields) {
        if (key in body) data[key as string] = body[key]
    }
    if ('sale_date' in data && typeof data.sale_date === 'string') {
        data.sale_date = new Date(data.sale_date)
    }

    const updated = await prisma.sale.update({
        where: { id },
        data,
        include: { installments: true },
    })
    return NextResponse.json(toSaleDTO(updated))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    const { id } = await params
    const result = await authorize(id, session)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    await prisma.sale.delete({ where: { id } })
    return NextResponse.json({ ok: true })
}
