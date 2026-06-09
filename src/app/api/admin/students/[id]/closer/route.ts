import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CloserType } from '@prisma/client'

const VALID_CLOSER_TYPES: CloserType[] = ['CRM_ONLY', 'CRM_AND_COURSES']

/**
 * Toggle a student's closer role and/or change their closer type.
 *
 * Body: { closer_enabled: boolean, closer_type?: CloserType }
 *
 * Rules:
 *  - When closer_enabled = false → closer_type is forced to null.
 *  - When closer_enabled = true → closer_type is required.
 *    Defaults to 'CRM_AND_COURSES' when not provided (admin enabling a closer
 *    without choosing type means "promote to full closer" — matches backfill semantics).
 *  - When body only contains closer_type (without flipping enabled): updates the type
 *    while preserving closer_enabled = true. Used by the type selector when the toggle
 *    is already on.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json() as {
        closer_enabled?: boolean
        closer_type?: CloserType | null
    }

    if (typeof body.closer_enabled !== 'boolean' && body.closer_type === undefined) {
        return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    let closerEnabled: boolean
    let closerType: CloserType | null

    if (body.closer_enabled === false) {
        // Disabling — always clear the type.
        closerEnabled = false
        closerType = null
    } else if (body.closer_enabled === true) {
        closerEnabled = true
        closerType =
            body.closer_type && VALID_CLOSER_TYPES.includes(body.closer_type)
                ? body.closer_type
                : 'CRM_AND_COURSES' // sensible default when admin flips on without choosing
    } else {
        // closer_enabled not provided — only updating type.
        // Read current value to keep enabled = true (otherwise the type change makes no sense).
        const current = await prisma.user.findUnique({
            where: { id },
            select: { closer_enabled: true },
        })
        if (!current) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
        if (!current.closer_enabled) {
            return NextResponse.json(
                { error: 'No se puede asignar tipo a un usuario sin closer habilitado' },
                { status: 400 },
            )
        }
        if (!body.closer_type || !VALID_CLOSER_TYPES.includes(body.closer_type)) {
            return NextResponse.json({ error: 'closer_type inválido' }, { status: 400 })
        }
        closerEnabled = true
        closerType = body.closer_type
    }

    const user = await prisma.user.update({
        where: { id },
        data: { closer_enabled: closerEnabled, closer_type: closerType },
        select: { id: true, closer_enabled: true, closer_type: true },
    })

    return NextResponse.json(user)
}
