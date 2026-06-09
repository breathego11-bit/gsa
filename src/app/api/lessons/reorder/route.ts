import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Batch-reorder lessons (and optionally move them between modules of the same course).
 *
 * Body: { updates: Array<{ lesson_id: string, module_id: string, order: number }> }
 *
 * Each update sets a lesson's module_id and order. Both reorder-within-module
 * and cross-module move are handled by the same shape.
 *
 * Validation:
 *   - Only ADMIN.
 *   - All lessons must currently exist and belong to modules in the same course.
 *   - All target module_ids must also belong to that same course.
 *   - We don't enforce that the full module's lessons are present in `updates`
 *     to keep this flexible — but the caller (UI) sends complete sets per
 *     affected module so the final orders are dense.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { updates } = await req.json() as {
            updates?: Array<{ lesson_id: string; module_id: string; order: number }>
        }
        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const lessonIds = updates.map((u) => u.lesson_id)
        const targetModuleIds = [...new Set(updates.map((u) => u.module_id))]

        // Fetch involved lessons + modules in one shot to validate course coherence.
        const [lessons, targetModules] = await Promise.all([
            prisma.lesson.findMany({
                where: { id: { in: lessonIds } },
                select: { id: true, module: { select: { course_id: true } } },
            }),
            prisma.module.findMany({
                where: { id: { in: targetModuleIds } },
                select: { id: true, course_id: true },
            }),
        ])

        if (lessons.length !== lessonIds.length) {
            return NextResponse.json({ error: 'Alguna lección no existe' }, { status: 400 })
        }
        if (targetModules.length !== targetModuleIds.length) {
            return NextResponse.json({ error: 'Algún módulo destino no existe' }, { status: 400 })
        }

        const courseIds = new Set([
            ...lessons.map((l) => l.module.course_id),
            ...targetModules.map((m) => m.course_id),
        ])
        if (courseIds.size !== 1) {
            return NextResponse.json(
                { error: 'Todas las lecciones y módulos deben pertenecer al mismo curso' },
                { status: 400 },
            )
        }

        // Two-pass like in modules/reorder to avoid potential order conflicts.
        await prisma.$transaction([
            ...updates.map((u, i) =>
                prisma.lesson.update({
                    where: { id: u.lesson_id },
                    data: { module_id: u.module_id, order: -(i + 1) },
                }),
            ),
            ...updates.map((u) =>
                prisma.lesson.update({
                    where: { id: u.lesson_id },
                    data: { order: u.order },
                }),
            ),
        ])

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[POST /api/lessons/reorder]', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
