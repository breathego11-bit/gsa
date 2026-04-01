import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { course_id, title, order } = await req.json()
        if (!course_id || !title) {
            return NextResponse.json({ error: 'course_id and title are required' }, { status: 400 })
        }

        const module = await prisma.module.create({
            data: { course_id, title, order: order ?? 1 },
        })
        return NextResponse.json(module, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
