import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCourseApproval } from '@/lib/courseApproval'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { lesson_id, completed } = await req.json()
        if (!lesson_id) return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 })

        // Check lesson type — FORM and EXAM must use their specific endpoints
        const lesson = await prisma.lesson.findUnique({
            where: { id: lesson_id },
            select: { type: true, module: { select: { course_id: true } } },
        })
        if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

        // Verify enrollment
        if (session.user.role !== 'ADMIN') {
            const enrollment = await prisma.enrollment.findUnique({
                where: { user_id_course_id: { user_id: session.user.id, course_id: lesson.module.course_id } },
            })
            if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        if (lesson.type === 'FORM' || lesson.type === 'EXAM') {
            return NextResponse.json(
                { error: 'Este tipo de lección se completa a través de su formulario o examen' },
                { status: 400 },
            )
        }

        const progress = await prisma.lessonProgress.upsert({
            where: {
                user_id_lesson_id: { user_id: session.user.id, lesson_id },
            },
            update: {
                completed: Boolean(completed),
                completed_at: completed ? new Date() : null,
            },
            create: {
                user_id: session.user.id,
                lesson_id,
                completed: Boolean(completed),
                completed_at: completed ? new Date() : null,
            },
        })

        // Check course approval after completing a lesson
        if (completed) {
            await checkCourseApproval(session.user.id, lesson.module.course_id)
        }

        return NextResponse.json(progress)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
