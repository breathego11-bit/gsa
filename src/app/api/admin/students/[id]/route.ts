import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Only student accounts can be deleted from this endpoint' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
