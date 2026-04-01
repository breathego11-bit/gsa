import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const USER_SELECT = {
    id: true,
    name: true,
    last_name: true,
    username: true,
    email: true,
    phone: true,
    profile_image: true,
    bio: true,
    title: true,
    location: true,
    role: true,
    created_at: true,
} as const

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: USER_SELECT,
        })
        if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json(user)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { name, last_name, email, phone, bio, title, location } = body

        const data: Record<string, any> = {}
        if (name !== undefined) data.name = name
        if (last_name !== undefined) data.last_name = last_name
        if (phone !== undefined) data.phone = phone || null
        if (bio !== undefined) data.bio = bio || null
        if (title !== undefined) data.title = title || null
        if (location !== undefined) data.location = location || null

        if (email !== undefined && email !== session.user.email) {
            const existing = await prisma.user.findFirst({
                where: { email, NOT: { id: session.user.id } },
            })
            if (existing) {
                return NextResponse.json({ error: 'Este email ya está en uso' }, { status: 409 })
            }
            data.email = email
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data,
            select: USER_SELECT,
        })
        return NextResponse.json(user)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
