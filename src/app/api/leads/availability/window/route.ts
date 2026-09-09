import { NextRequest, NextResponse } from 'next/server'
import { leadsAuthOk } from '@/lib/leads/auth'
import { computeBookingWindow } from '@/lib/calendar/booking-window'

export const dynamic = 'force-dynamic'

const DEFAULT_DURATION = 30

function isValidTz(tz: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return true
    } catch {
        return false
    }
}

/**
 * Ventana de agendamiento abierta para el lead (auth x-api-key).
 *
 * Devuelve de una sola vez los días reservables Y sus horas, en lugar de obligar al calendario a
 * pedir día a día: con la regla de los 3 días, el cliente necesita saber de antemano qué días
 * tienen hueco para poder deshabilitar el resto.
 *
 * `/api/leads/availability` sigue existiendo para consultar un día suelto.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.LEADS_API_KEY
    if (!expected) return NextResponse.json({ error: 'LEADS_API_KEY no configurado' }, { status: 500 })
    if (!leadsAuthOk(req, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const tz = sp.get('tz_iana') || 'America/Bogota'
    if (!isValidTz(tz)) return NextResponse.json({ error: 'Invalid tz_iana' }, { status: 400 })

    const durationRaw = parseInt(sp.get('duration') ?? String(DEFAULT_DURATION), 10)
    const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : DEFAULT_DURATION

    const window = await computeBookingWindow({ leadTz: tz, durationMin: duration })
    return NextResponse.json(window)
}
