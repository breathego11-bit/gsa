import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import { transferLeadMeeting } from '@/lib/calendar/transfer'

export const dynamic = 'force-dynamic'

/**
 * Reasigna un lead a otro miembro moviendo también su reunión de Google.
 *
 * Es lo que `PATCH /api/leads/[id]` NO hace: aquel cambia `assigned_to` en el CRM y deja el evento
 * en el calendario de la persona anterior, con lo que el lead conserva un Meet que apunta a una
 * reunión que ya no le corresponde. Ese sigue existiendo para corregir la ficha; este es el que
 * traspasa la reunión de verdad.
 *
 * Body: { to_user_id }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const to = typeof body.to_user_id === 'string' ? body.to_user_id : ''
    if (!to) return NextResponse.json({ error: 'to_user_id es obligatorio' }, { status: 400 })

    /*
     * Mismo control que en `/leads/transfer` y `/google/disconnect`: uno mueve lo suyo, un ADMIN
     * mueve lo de cualquiera. Sin esto, cualquier closer podía quitarle un lead a otro y llevarse
     * su reunión al propio calendario.
     */
    if (session.user.role !== 'ADMIN') {
        const lead = await prisma.lead.findUnique({ where: { id }, select: { assigned_to: true } })
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        if (lead.assigned_to !== session.user.id) {
            return NextResponse.json({ error: 'Solo un admin puede reasignar el lead de otro' }, { status: 403 })
        }
    }

    const result = await transferLeadMeeting(id, to)
    return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
