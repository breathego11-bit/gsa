import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { closer_enabled } = await req.json() as { closer_enabled: boolean }

    const user = await prisma.user.update({
        where: { id },
        data: { closer_enabled },
        select: { id: true, closer_enabled: true },
    })

    return NextResponse.json(user)
}
