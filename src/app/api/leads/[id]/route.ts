import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import { decideLeadPatch } from '@/lib/leads/permissions'
import { TEAM_MEMBER_WHERE } from '@/lib/calendar/pool'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * Edición manual del lead desde el CRM (sesión NextAuth + canAccessCRM).
 *
 * Re-enfocado (antes era el Paso B de la landing con x-api-key; eso lo reemplazó
 * `POST /api/leads/[id]/book`). Sirve para cambiar estado y/o reasignar manualmente.
 *
 * Quién puede qué lo decide `decideLeadPatch` (puro y con tests): el admin toca cualquier lead y
 * puede reasignar; el closer solo el estado de los leads asignados a él. Sin esa segunda regla,
 * al darle la pantalla de "Mis leads" cualquier closer podría editar el lead de otro o
 * reasignárselo.
 *
 * Body: { status?: LeadStatus, assigned_to?: string | null }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const decision = decideLeadPatch(
        {
            role: session.user.role,
            closer_enabled: session.user.closer_enabled ?? false,
            closer_type: session.user.closer_type ?? null,
        },
        body,
    )
    if (!decision.ok) {
        return NextResponse.json({ error: decision.error }, { status: decision.code })
    }

    // El responsable tiene que ser del equipo (admin o closer, no bloqueado), igual que en /reassign
    // y en el selector de la ficha. Sin esto valía cualquier usuario existente, incluido un alumno
    // que no ve el CRM: el lead salía de la cola de todos.
    if (decision.assignedTo) {
        const isTeam = await prisma.user.count({ where: { ...TEAM_MEMBER_WHERE, id: decision.assignedTo } })
        if (isTeam === 0) {
            return NextResponse.json({ error: 'El responsable tiene que ser del equipo (admin o closer)' }, { status: 400 })
        }
    }

    const data: Prisma.LeadUncheckedUpdateInput = {}
    if (decision.status !== undefined) data.status = decision.status
    if (decision.assignedTo !== undefined) {
        data.assigned_to = decision.assignedTo
        data.assigned_at = decision.assignedTo === null ? null : new Date()
    }

    try {
        /*
         * Una sola consulta con el dueño dentro del `where`: la condición viaja en el propio UPDATE,
         * así que no hay ventana entre comprobar de quién es el lead y escribirlo. Si no cuadra
         * (o el lead no existe), Prisma lanza P2025 → 404: a un closer, el lead de otro responde
         * igual que uno inexistente y no se confirma que exista.
         */
        const lead = await prisma.lead.update({
            where: decision.onlyOwn ? { id, assigned_to: session.user.id } : { id },
            data,
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
