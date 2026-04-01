import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCourseApproval } from '@/lib/courseApproval'

interface ExamQuestion {
    id: string
    text: string
    options: string[]
    correctOptions: number[]
    points?: number
    explanation?: string
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { lesson_id, answers } = await req.json()
        if (!lesson_id || !answers) {
            return NextResponse.json({ error: 'lesson_id and answers are required' }, { status: 400 })
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lesson_id },
            select: {
                type: true,
                exam_schema: true,
                passing_score: true,
                max_attempts: true,
                module: { select: { course_id: true } },
            },
        })

        if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        if (lesson.type !== 'EXAM') {
            return NextResponse.json({ error: 'This lesson is not an exam' }, { status: 400 })
        }

        // Check enrollment
        const enrollment = await prisma.enrollment.findUnique({
            where: { user_id_course_id: { user_id: session.user.id, course_id: lesson.module.course_id } },
        })
        if (!enrollment && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
        }

        // Check attempt limit
        if (lesson.max_attempts != null) {
            const attemptCount = await prisma.examAttempt.count({
                where: { user_id: session.user.id, lesson_id },
            })
            if (attemptCount >= lesson.max_attempts) {
                return NextResponse.json({ error: 'Has alcanzado el número máximo de intentos' }, { status: 400 })
            }
        }

        // Grade the exam using weighted points
        const questions = lesson.exam_schema as ExamQuestion[]
        let correctCount = 0
        let earnedPoints = 0
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

        const gradedAnswers = answers.map((answer: { questionId: string; selectedOptions: number[] }) => {
            const question = questions.find((q) => q.id === answer.questionId)
            if (!question) return { ...answer, correct: false, points: 0, earnedPoints: 0 }

            const isCorrect =
                answer.selectedOptions.length === question.correctOptions.length &&
                answer.selectedOptions.every((opt: number) => question.correctOptions.includes(opt))

            const qPoints = question.points || 1
            if (isCorrect) {
                correctCount++
                earnedPoints += qPoints
            }

            return {
                ...answer,
                correct: isCorrect,
                correctOptions: question.correctOptions,
                explanation: question.explanation,
                points: qPoints,
                earnedPoints: isCorrect ? qPoints : 0,
            }
        })

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
        const passingScore = lesson.passing_score ?? 70
        const passed = score >= passingScore

        // Save attempt
        const attempt = await prisma.examAttempt.create({
            data: {
                user_id: session.user.id,
                lesson_id,
                answers,
                score,
                passed,
            },
        })

        // If passed, mark lesson as completed
        if (passed) {
            await prisma.lessonProgress.upsert({
                where: { user_id_lesson_id: { user_id: session.user.id, lesson_id } },
                update: { completed: true, completed_at: new Date(), score, passed: true },
                create: { user_id: session.user.id, lesson_id, completed: true, completed_at: new Date(), score, passed: true },
            })

            await checkCourseApproval(session.user.id, lesson.module.course_id)
        }

        return NextResponse.json({
            attemptId: attempt.id,
            score,
            passed,
            passingScore,
            correctCount,
            totalQuestions: questions.length,
            earnedPoints,
            totalPoints,
            gradedAnswers,
        })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
