import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Batch-reorder modules within a course.
 *
 * Body: { course_id: string, ordered_ids: string[] }
 *
 * Validation:
 *   - Only ADMIN.
 *   - Every id in ordered_ids must belong to course_id (prevents cross-course
 *     reordering or sneaking a foreign module in).
 *   - The set must match exactly the current modules of the course (no missing,
 *     no extras) so we don't end up with a partial ordering.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { course_id, ordered_ids } = await req.json() as {
            course_id?: string
            ordered_ids?: string[]
        }
        if (!course_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const modules = await prisma.module.findMany({
            where: { course_id },
            select: { id: true },
        })
        const currentIds = new Set(modules.map((m) => m.id))
        const incomingIds = new Set(ordered_ids)

        if (
            currentIds.size !== incomingIds.size ||
            [...currentIds].some((id) => !incomingIds.has(id))
        ) {
            return NextResponse.json(
                { error: 'La lista de módulos no coincide con la del curso' },
                { status: 400 },
            )
        }

        // Two-pass update to avoid the (course_id, order) unique-ish overlap
        // even though we don't have a unique constraint — using negative orders as
        // a temporary buffer is safer for future-proofing if we ever add one.
        await prisma.$transaction([
            ...ordered_ids.map((id, i) =>
                prisma.module.update({ where: { id }, data: { order: -(i + 1) } }),
            ),
            ...ordered_ids.map((id, i) =>
                prisma.module.update({ where: { id }, data: { order: i + 1 } }),
            ),
        ])

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[POST /api/modules/reorder]', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
