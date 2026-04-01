import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const {
            module_id, title, description, video_url, thumbnail, order, duration,
            type, content, form_schema, exam_schema, passing_score, max_attempts, is_final_exam,
        } = await req.json()
        if (!module_id || !title) {
            return NextResponse.json({ error: 'module_id and title are required' }, { status: 400 })
        }

        // If marking as final exam, unset any existing final exam in the same course
        if (is_final_exam) {
            const mod = await prisma.module.findUnique({ where: { id: module_id }, select: { course_id: true } })
            if (mod) {
                await prisma.lesson.updateMany({
                    where: { module: { course_id: mod.course_id }, is_final_exam: true },
                    data: { is_final_exam: false },
                })
            }
        }

        const lesson = await prisma.lesson.create({
            data: {
                module_id,
                title,
                description: description || null,
                type: type || 'VIDEO',
                video_url: video_url || null,
                thumbnail: thumbnail || null,
                content: content || null,
                form_schema: form_schema || undefined,
                exam_schema: exam_schema || undefined,
                passing_score: passing_score != null ? Number(passing_score) : null,
                max_attempts: max_attempts != null ? Number(max_attempts) : null,
                is_final_exam: is_final_exam || false,
                order: order ?? 1,
                duration: duration ? Number(duration) : null,
            },
        })
        return NextResponse.json(lesson, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
