import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const setting = await prisma.coachSetting.findUnique({ where: { id: 'singleton' } })
    return NextResponse.json({ extra_instructions: setting?.extra_instructions ?? '' })
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { extra_instructions?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
    }

    const value = (body.extra_instructions ?? '').slice(0, 20000)

    const setting = await prisma.coachSetting.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', extra_instructions: value, updated_by: session.user.id },
        update: { extra_instructions: value, updated_by: session.user.id },
    })

    return NextResponse.json({ extra_instructions: setting.extra_instructions ?? '' })
}
