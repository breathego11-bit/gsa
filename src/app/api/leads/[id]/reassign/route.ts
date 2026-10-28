import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
 * Solo admins: ver el comentario del control de acceso.
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
     * Reasignar es cosa del admin, igual que en `PATCH /api/leads/[id]`. Antes un closer podía mover
     * sus propios leads a cualquiera con acceso al CRM, incluido alguien que el admin dejó fuera del
     * reparto. Un closer solo pasa sus reuniones al desconectar su calendario, y solo a alguien del
     * reparto (`/google/disconnect`).
     */
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo un admin puede reasignar un lead' }, { status: 403 })
    }

    const result = await transferLeadMeeting(id, to)
    return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
