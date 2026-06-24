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
 * Edición manual del lead por un admin del CRM (sesión NextAuth + canAccessCRM).
 *
 * Re-enfocado (antes era el Paso B de la landing con x-api-key; eso lo reemplazó
 * `POST /api/leads/[id]/book`). Sirve para cambiar estado y/o reasignar manualmente.
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

    const data: Prisma.LeadUpdateInput = {}

    if (body.status !== undefined) {
        if (!isLeadStatus(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        data.status = body.status
    }

    if (body.assigned_to !== undefined) {
        if (body.assigned_to === null || body.assigned_to === '') {
            data.assignee = { disconnect: true }
            data.assigned_at = null
        } else if (typeof body.assigned_to === 'string') {
            data.assignee = { connect: { id: body.assigned_to } }
            data.assigned_at = new Date()
        } else {
            return NextResponse.json({ error: 'Invalid assigned_to' }, { status: 400 })
        }
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    try {
        const lead = await prisma.lead.update({
            where: { id },
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
