import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCRM } from '@/lib/access'
import { transferAllMeetings } from '@/lib/calendar/transfer'

export const dynamic = 'force-dynamic'

/**
 * Transfiere en bloque los leads de un miembro a otro, moviendo sus reuniones futuras de un
 * calendario de Google al otro.
 *
 * Body: { from_user_id, to_user_id }
 *
 * Cada uno puede mover lo suyo; un ADMIN puede mover lo de cualquiera.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const from = typeof body.from_user_id === 'string' ? body.from_user_id : ''
    const to = typeof body.to_user_id === 'string' ? body.to_user_id : ''

    if (!from || !to) return NextResponse.json({ error: 'from_user_id y to_user_id son obligatorios' }, { status: 400 })
    if (from === to) return NextResponse.json({ error: 'El origen y el destino son el mismo miembro' }, { status: 400 })
    if (from !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo un admin puede transferir las reuniones de otro' }, { status: 403 })
    }

    const { results, pastReassigned } = await transferAllMeetings(from, to)
    const failed = results.filter((r) => !r.ok)

    return NextResponse.json(
        {
            ok: failed.length === 0,
            transferred: results.filter((r) => r.movedEvent).length,
            pastReassigned,
            failed: failed.map((f) => ({ leadId: f.leadId, error: f.error })),
        },
        // 207: parte fue y parte no. Un 200 escondería los fallos y un 500 negaría lo que sí se movió.
        { status: failed.length === 0 ? 200 : 207 },
    )
}
