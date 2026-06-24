import { NextRequest, NextResponse } from 'next/server'
import { leadsAuthOk } from '@/lib/leads/auth'
import { computeAvailability } from '@/lib/calendar/availability'
import { localParts } from '@/lib/calendar/tz'

export const dynamic = 'force-dynamic'

const DEFAULT_DURATION = 45
const DEFAULT_DAYS = 14

function isValidTz(tz: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return true
    } catch {
        return false
    }
}

/**
 * Disponibilidad real para la landing (auth x-api-key).
 * Un slot se ofrece si ≥1 miembro bookable está libre. Devuelve RFC3339 en la zona del lead.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.LEADS_API_KEY
    if (!expected) return NextResponse.json({ error: 'LEADS_API_KEY no configurado' }, { status: 500 })
    if (!leadsAuthOk(req, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const tz = sp.get('tz_iana') || 'America/Bogota'
    if (!isValidTz(tz)) return NextResponse.json({ error: 'Invalid tz_iana' }, { status: 400 })

    const fromParam = sp.get('from')
    const from =
        fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
            ? fromParam
            : (() => {
                  const p = localParts(new Date(), tz)
                  return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
              })()

    const daysRaw = parseInt(sp.get('days') ?? String(DEFAULT_DAYS), 10)
    const durationRaw = parseInt(sp.get('duration') ?? String(DEFAULT_DURATION), 10)
    const days = Number.isFinite(daysRaw) ? daysRaw : DEFAULT_DAYS
    const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : DEFAULT_DURATION

    const slots = await computeAvailability({ fromDate: from, days, leadTz: tz, durationMin: duration })
    return NextResponse.json({ tz_iana: tz, slots })
}
