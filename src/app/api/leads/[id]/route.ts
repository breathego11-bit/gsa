import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import type { LeadStatus, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const LEAD_STATUSES: LeadStatus[] = ['NUEVO', 'CONTACTADO', 'AGENDADO', 'DESCARTADO']
function isLeadStatus(v: unknown): v is LeadStatus {
    return typeof v === 'string' && (LEAD_STATUSES as string[]).includes(v)
}

/**
 * Edición manual del lead desde el CRM (sesión NextAuth + canAccessCRM).
 *
 * Re-enfocado (antes era el Paso B de la landing con x-api-key; eso lo reemplazó
 * `POST /api/leads/[id]/book`). Sirve para cambiar estado y/o reasignar manualmente.
 *
 * Alcance por rol:
 *   - admin  → cualquier lead; puede cambiar estado y reasignar.
 *   - closer → **solo los leads asignados a él**, y solo el estado. Sin esto, dándole la
 *     pantalla de "Mis leads" cualquier closer podría tocar el lead de otro o reasignárselo.
 *
 * Body: { status?: LeadStatus, assigned_to?: string | null }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const isAdmin = session.user.role === 'ADMIN'

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Escalares a propósito (no `assignee: { connect }`): el UPDATE va por `updateMany`, que
    // solo acepta campos planos, y así la condición de dueño viaja en la misma consulta.
    const data: Prisma.LeadUncheckedUpdateManyInput = {}

    if (body.status !== undefined) {
        if (!isLeadStatus(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        data.status = body.status
    }

    if (body.assigned_to !== undefined) {
        // Reasignar mueve también la reunión de Google: es cosa del admin, vía /reassign.
        if (!isAdmin) {
            return NextResponse.json({ error: 'Solo un admin puede reasignar un lead' }, { status: 403 })
        }
        if (body.assigned_to === null || body.assigned_to === '') {
            data.assigned_to = null
            data.assigned_at = null
        } else if (typeof body.assigned_to === 'string') {
            data.assigned_to = body.assigned_to
            data.assigned_at = new Date()
        } else {
            return NextResponse.json({ error: 'Invalid assigned_to' }, { status: 400 })
        }
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    try {
        /*
         * `updateMany` con el dueño en el `where` (y no `update` + comprobación previa) para que la
         * condición viaje en el propio UPDATE: no hay ventana entre leer el lead y escribirlo.
         * A un closer, el lead de otro responde 404 igual que uno inexistente: no se confirma que
         * exista.
         */
        const res = await prisma.lead.updateMany({
            where: isAdmin ? { id } : { id, assigned_to: session.user.id },
            data,
        })
        if (res.count === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        const lead = await prisma.lead.findUnique({
            where: { id },
            select: { id: true, status: true, assigned_to: true },
        })
        return NextResponse.json(lead)
    } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : undefined
        if (code === 'P2025') return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        if (code === 'P2003') return NextResponse.json({ error: 'Invalid assigned_to (no such user)' }, { status: 400 })
        throw e
    }
}
