import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import { clientForConnection, markConnectionError } from '@/lib/calendar/tokens'
import { createPlainEvent } from '@/lib/calendar/google'
import { isAuthError } from '@/lib/calendar/availability'
import { zonedWallTimeToUtc, toRfc3339InZone } from '@/lib/calendar/tz'
import { toMinutes } from '@/lib/calendar/working-hours'
import { isValidYmd } from '@/lib/calendar/agenda-model'

export const dynamic = 'force-dynamic'

const MAX_TITLE = 200
const MAX_DESCRIPTION = 2000

/**
 * Crea un evento en el Google Calendar del propio miembro, desde la agenda de GSA.
 *
 * Body: { summary, date: "YYYY-MM-DD", start: "HH:mm", end: "HH:mm", description?, blocks_agenda? }
 *
 * Las horas llegan como hora de pared y se interpretan en la zona de reserva del miembro — la misma
 * en la que la agenda las pinta. Si se interpretaran en la del servidor (UTC), el evento aparecería
 * desplazado cinco horas.
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

    const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const date = body.date
    const start = toMinutes(body.start)
    const end = toMinutes(body.end)
    // Por defecto SÍ bloquea: es lo que espera quien apunta algo en su agenda.
    const blocksAgenda = body.blocks_agenda !== false

    if (!summary) return NextResponse.json({ error: 'Ponle un título al evento.' }, { status: 400 })
    if (summary.length > MAX_TITLE) return NextResponse.json({ error: `El título no puede pasar de ${MAX_TITLE} caracteres.` }, { status: 400 })
    if (description.length > MAX_DESCRIPTION) return NextResponse.json({ error: 'La descripción es demasiado larga.' }, { status: 400 })
    if (!isValidYmd(date)) return NextResponse.json({ error: 'Fecha no válida.' }, { status: 400 })
    if (start === null || end === null || start >= 24 * 60) return NextResponse.json({ error: 'Hora no válida.' }, { status: 400 })
    if (end <= start) return NextResponse.json({ error: 'La hora de fin debe ser posterior a la de inicio.' }, { status: 400 })

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            booking_timezone: true,
            calendars: {
                where: { provider: 'GOOGLE', status: 'active' },
                select: { id: true, calendar_id: true, refresh_token: true, access_token: true, token_expiry: true },
            },
        },
    })
    const conn = user?.calendars[0]
    if (!conn) {
        return NextResponse.json({ error: 'Conecta tu Google Calendar para crear eventos.' }, { status: 409 })
    }

    const tz = user!.booking_timezone || 'America/Bogota'
    const [y, m, d] = (date as string).split('-').map(Number)
    // `end` puede ser 24:00: Date.UTC desborda la hora al día siguiente, que es justo lo correcto.
    const startUtc = zonedWallTimeToUtc(y, m, d, Math.floor(start / 60), start % 60, tz)
    const endUtc = zonedWallTimeToUtc(y, m, d, Math.floor(end / 60), end % 60, tz)

    try {
        const client = await clientForConnection(conn)
        const created = await createPlainEvent(client, {
            calendarId: conn.calendar_id,
            summary,
            description,
            startDateTime: toRfc3339InZone(startUtc, tz),
            endDateTime: toRfc3339InZone(endUtc, tz),
            timeZone: tz,
            blocksAgenda,
        })
        return NextResponse.json(created, { status: 201 })
    } catch (err) {
        if (isAuthError(err)) {
            await markConnectionError(conn.id)
            return NextResponse.json(
                { error: 'Tu conexión con Google Calendar ha caducado. Reconéctala y vuelve a intentarlo.' },
                { status: 409 },
            )
        }
        console.error('[agenda] no se pudo crear el evento en Google:', err)
        return NextResponse.json({ error: 'Google Calendar no aceptó el evento. Inténtalo de nuevo.' }, { status: 502 })
    }
}
