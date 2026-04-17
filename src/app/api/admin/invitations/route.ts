import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const invitations = await prisma.invitation.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            redeemer: { select: { name: true, last_name: true, email: true } },
        },
    })

    return NextResponse.json(invitations)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { paymentType, amountPaid, pendingInstallments } = await req.json() as {
        paymentType: 'one_time' | 'installment'
        amountPaid: number // cents
        pendingInstallments?: { amount: number; dueDate: string }[]
    }

    if (!paymentType || !amountPaid || amountPaid <= 0) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const installmentsData = paymentType === 'installment' && pendingInstallments?.length
        ? pendingInstallments.map((inst, i) => ({
            number: i + 2, // starts at 2 (cuota 1 is the amount already paid)
            amount: inst.amount,
            dueDate: inst.dueDate,
        }))
        : null

    const invitation = await prisma.invitation.create({
        data: {
            created_by: session.user.id,
            payment_type: paymentType,
            amount_paid: amountPaid,
            installments: installmentsData as any,
        },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
        id: invitation.id,
        link: `${appUrl}/register?invite=${invitation.id}`,
    }, { status: 201 })
}
