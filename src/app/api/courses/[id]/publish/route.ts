import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    try {
        const { published } = await req.json()
        const course = await prisma.course.update({
            where: { id },
            data: { published: Boolean(published) },
        })
        return NextResponse.json(course)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
