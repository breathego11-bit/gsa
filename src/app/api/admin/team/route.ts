import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: {
            id: true,
            name: true,
            last_name: true,
            email: true,
            profile_image: true,
            title: true,
            created_at: true,
            _count: { select: { instructed_courses: true } },
        },
        orderBy: { created_at: 'asc' },
    })

    return NextResponse.json(admins)
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, last_name, username, email, password } = await req.json()

    if (!name || !last_name || !username || !email || !password) {
        return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    })
    if (existing) {
        return NextResponse.json({ error: 'Email o usuario ya existe' }, { status: 409 })
    }

    const hashedPassword = await bcryptjs.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            name,
            last_name,
            username,
            email,
            password: hashedPassword,
            role: 'ADMIN',
            payment_status: 'active',
        },
        select: { id: true, name: true, last_name: true, email: true },
    })

    return NextResponse.json(user, { status: 201 })
}
