import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lessonId } = await params

    try {
        // Verify enrollment
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { module: { select: { course_id: true } } },
        })
        if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

        if (session.user.role !== 'ADMIN') {
            const enrollment = await prisma.enrollment.findUnique({
                where: { user_id_course_id: { user_id: session.user.id, course_id: lesson.module.course_id } },
            })
            if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        const note = await prisma.lessonNote.findUnique({
            where: {
                user_id_lesson_id: { user_id: session.user.id, lesson_id: lessonId },
            },
        })
        return NextResponse.json({ content: note?.content ?? '' })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lessonId } = await params

    try {
        // Verify enrollment
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { module: { select: { course_id: true } } },
        })
        if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

        if (session.user.role !== 'ADMIN') {
            const enrollment = await prisma.enrollment.findUnique({
                where: { user_id_course_id: { user_id: session.user.id, course_id: lesson.module.course_id } },
            })
            if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        const { content } = await req.json()
        const note = await prisma.lessonNote.upsert({
            where: {
                user_id_lesson_id: { user_id: session.user.id, lesson_id: lessonId },
            },
            update: { content: content ?? '' },
            create: {
                user_id: session.user.id,
                lesson_id: lessonId,
                content: content ?? '',
            },
        })
        return NextResponse.json(note)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
