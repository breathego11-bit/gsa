import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCourseApproval } from '@/lib/courseApproval'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { lesson_id, data } = await req.json()
        if (!lesson_id || !data) {
            return NextResponse.json({ error: 'lesson_id and data are required' }, { status: 400 })
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lesson_id },
            select: { type: true, form_schema: true, module: { select: { course_id: true } } },
        })

        if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        if (lesson.type !== 'FORM') {
            return NextResponse.json({ error: 'This lesson is not a form' }, { status: 400 })
        }

        // Validate required fields
        const schema = lesson.form_schema as Array<{ id: string; required: boolean }> | null
        if (schema) {
            for (const field of schema) {
                if (field.required && (!data[field.id] || (typeof data[field.id] === 'string' && !data[field.id].trim()))) {
                    return NextResponse.json({ error: `El campo es requerido` }, { status: 400 })
                }
            }
        }

        // Check enrollment
        const enrollment = await prisma.enrollment.findUnique({
            where: { user_id_course_id: { user_id: session.user.id, course_id: lesson.module.course_id } },
        })
        if (!enrollment && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        // Create or update submission
        const submission = await prisma.formSubmission.upsert({
            where: { user_id_lesson_id: { user_id: session.user.id, lesson_id } },
            update: { data },
            create: { user_id: session.user.id, lesson_id, data },
        })

        // Mark lesson as completed
        await prisma.lessonProgress.upsert({
            where: { user_id_lesson_id: { user_id: session.user.id, lesson_id } },
            update: { completed: true, completed_at: new Date() },
            create: { user_id: session.user.id, lesson_id, completed: true, completed_at: new Date() },
        })

        await checkCourseApproval(session.user.id, lesson.module.course_id)

        return NextResponse.json(submission, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
