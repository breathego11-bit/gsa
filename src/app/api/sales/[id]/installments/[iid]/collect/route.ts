import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; iid: string }> },
) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, iid } = await params

    const sale = await prisma.sale.findUnique({ where: { id }, select: { closer_id: true } })
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sale.closer_id !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({})) as { collected_at?: string }
    const collectedAt = body.collected_at ? new Date(body.collected_at) : new Date()

    const updated = await prisma.saleInstallment.update({
        where: { id: iid },
        data: { collected: true, collected_at: collectedAt },
    })

    return NextResponse.json({
        id: updated.id,
        order: updated.order,
        amount: updated.amount,
        collected: updated.collected,
        collected_at: updated.collected_at?.toISOString() ?? null,
        due_date: updated.due_date?.toISOString() ?? null,
    })
}
