import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lessonId } = await params

    try {
        const attempts = await prisma.examAttempt.findMany({
            where: { user_id: session.user.id, lesson_id: lessonId },
            orderBy: { created_at: 'desc' },
            select: { id: true, score: true, passed: true, created_at: true },
        })

        const bestScore = attempts.length > 0
            ? Math.max(...attempts.map((a) => a.score))
            : null

        const hasPassed = attempts.some((a) => a.passed)

        return NextResponse.json({
            attempts,
            attemptCount: attempts.length,
            bestScore,
            hasPassed,
        })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
