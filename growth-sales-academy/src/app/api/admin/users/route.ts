import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const roleParam = new URL(req.url).searchParams.get('role')
    const roleFilter: Role = roleParam === 'ADMIN' ? 'ADMIN' : 'STUDENT'

    try {
        const students = await prisma.user.findMany({
            where: { role: roleFilter },
            select: {
                id: true,
                name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                created_at: true,
                _count: { select: { enrollments: true } },
            },
            orderBy: { created_at: 'desc' },
        })
        return NextResponse.json(students)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
