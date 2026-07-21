import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Reordena el catálogo global de cursos. Ese orden define la división por tramos de cuotas
 * (ver spec_installment_gating.md): "el primer curso" = el de menor `order`.
 *
 * Body: { ordered_ids: string[] }  (todos los cursos, en el orden deseado)
 *
 * Validación:
 *   - Solo ADMIN.
 *   - `ordered_ids` debe coincidir exactamente con el set de cursos existentes (sin faltantes
 *     ni extras) para no dejar una ordenación parcial.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { ordered_ids } = (await req.json()) as { ordered_ids?: string[] }
        if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const courses = await prisma.course.findMany({ select: { id: true } })
        const currentIds = new Set(courses.map((c) => c.id))
        const incomingIds = new Set(ordered_ids)

        if (
            currentIds.size !== incomingIds.size ||
            [...currentIds].some((id) => !incomingIds.has(id))
        ) {
            return NextResponse.json(
                { error: 'La lista de cursos no coincide con el catálogo' },
                { status: 400 },
            )
        }

        // Dos pasadas (orden negativo temporal) para evitar solapamientos si algún día se
        // añade una restricción única sobre `order`.
        await prisma.$transaction([
            ...ordered_ids.map((id, i) =>
                prisma.course.update({ where: { id }, data: { order: -(i + 1) } }),
            ),
            ...ordered_ids.map((id, i) =>
                prisma.course.update({ where: { id }, data: { order: i } }),
            ),
        ])

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[POST /api/courses/reorder]', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
