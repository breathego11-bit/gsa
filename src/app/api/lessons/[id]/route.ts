import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteBunnyVideo } from '@/lib/bunny'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    try {
        const lesson = await prisma.lesson.findUnique({
            where: { id },
            include: {
                module: { include: { course: true } },
                progress: { where: { user_id: session.user.id } },
            },
        })
        if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        // Check enrollment (admin always passes)
        if (session.user.role !== 'ADMIN') {
            const enrollment = await prisma.enrollment.findUnique({
                where: {
                    user_id_course_id: {
                        user_id: session.user.id,
                        course_id: lesson.module.course_id,
                    },
                },
            })
            if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        // Get siblings for navigation
        const siblings = await prisma.lesson.findMany({
            where: { module_id: lesson.module_id },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, order: true },
        })

        return NextResponse.json({ ...lesson, siblings })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    try {
        const body = await req.json()
        const lesson = await prisma.lesson.update({ where: { id }, data: body })
        return NextResponse.json(lesson)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    try {
        const lesson = await prisma.lesson.findUnique({ where: { id }, select: { bunny_video_id: true } })
        if (lesson?.bunny_video_id) {
            try { await deleteBunnyVideo(lesson.bunny_video_id) } catch { /* log but don't block deletion */ }
        }
        await prisma.lesson.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
