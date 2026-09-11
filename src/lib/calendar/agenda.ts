import { prisma } from '@/lib/prisma'
import { clientForConnection, markConnectionError } from './tokens'
import { listEvents, type AgendaEventRaw } from './google'
import { isAuthError } from './availability'
import {
    addDays,
    buildWeek,
    isValidYmd,
    meetingStatRanges,
    midnightUtc,
    mondayOf,
    summarizeMeetings,
    ymdInZone,
    type AgendaStatus,
    type AgendaWeek,
    type MeetingStats,
} from './agenda-model'

/**
 * Cargador de la agenda (SOLO SERVIDOR): lee la conexión del miembro, pide sus eventos a Google y
 * construye la semana con el modelo puro de `agenda-model.ts`.
 *
 * Los tokens de Google nunca salen del LMS: la rejilla recibe ya los eventos ordenados.
 */

export interface LoadedAgenda {
    status: AgendaStatus
    accountEmail: string | null
    week: AgendaWeek
    workingHours: unknown
}

export async function loadAgenda(userId: string, weekParam: unknown): Promise<LoadedAgenda> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            booking_timezone: true,
            working_hours: true,
            calendars: {
                where: { provider: 'GOOGLE' },
                select: {
                    id: true,
                    status: true,
                    account_email: true,
                    calendar_id: true,
                    refresh_token: true,
                    access_token: true,
                    token_expiry: true,
                },
            },
        },
    })

    const tz = user?.booking_timezone || 'America/Bogota'
    const todayYmd = ymdInZone(new Date(), tz)
    const weekStart = mondayOf(isValidYmd(weekParam) ? weekParam : todayYmd)
    const conn = user?.calendars[0] ?? null

    const empty = (status: AgendaStatus): LoadedAgenda => ({
        status,
        accountEmail: conn?.account_email ?? null,
        workingHours: user?.working_hours ?? null,
        week: buildWeek({
            events: [],
            tz,
            weekStart,
            todayYmd,
            workingHours: user?.working_hours ?? null,
            leadByEventId: new Map(),
        }),
    })

    if (!conn) return empty('not-connected')
    if (conn.status !== 'active') return empty('connection-error')

    let events: AgendaEventRaw[]
    try {
        const client = await clientForConnection(conn)
        events = await listEvents(
            client,
            conn.calendar_id,
            midnightUtc(weekStart, tz).toISOString(),
            midnightUtc(addDays(weekStart, 7), tz).toISOString(),
        )
    } catch (err) {
        if (isAuthError(err)) {
            // Token caducado o revocado (en modo Testing caducan cada 7 días): se marca la
            // conexión para que el pool de reservas deje de contar con ella y se pide reconectar.
            await markConnectionError(conn.id)
            return empty('connection-error')
        }
        console.error('[agenda] no se pudieron leer los eventos de Google:', err)
        return empty('google-error')
    }

    // Reuniones de leads: se enlazan a su ficha del CRM en vez de a Google.
    const ids = events.map((e) => e.id)
    const leads = ids.length
        ? await prisma.lead.findMany({
              where: { google_event_id: { in: ids } },
              select: { id: true, google_event_id: true },
          })
        : []
    const leadByEventId = new Map(leads.map((l) => [l.google_event_id as string, l.id]))

    return {
        status: 'ok',
        accountEmail: conn.account_email,
        workingHours: user?.working_hours ?? null,
        week: buildWeek({ events, tz, weekStart, todayYmd, workingHours: user?.working_hours ?? null, leadByEventId }),
    }
}

/**
 * Reuniones con leads asignadas al miembro: hoy, esta semana y este mes.
 *
 * Sale de la tabla de leads del CRM y no de Google a propósito: así las métricas siguen funcionando
 * aunque la conexión con Google haya caducado (en modo Testing pasa cada 7 días). Los descartados no
 * cuentan — una reunión con un lead descartado no se va a celebrar.
 *
 * Una sola consulta para los tres números: se pide la unión de semana y mes, porque la semana puede
 * empezar en el mes anterior.
 */
export async function loadMeetingStats(userId: string, now: Date = new Date()): Promise<MeetingStats> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { booking_timezone: true } })
    const tz = user?.booking_timezone || 'America/Bogota'
    const ranges = meetingStatRanges(now, tz)

    const from = new Date(Math.min(ranges.week[0].getTime(), ranges.month[0].getTime()))
    const to = new Date(Math.max(ranges.week[1].getTime(), ranges.month[1].getTime()))

    const leads = await prisma.lead.findMany({
        where: { assigned_to: userId, status: { not: 'DESCARTADO' }, meeting_at: { gte: from, lt: to } },
        select: { meeting_at: true, full_name: true },
    })

    return summarizeMeetings(
        leads.map((l) => ({ at: l.meeting_at as Date, name: l.full_name })),
        ranges,
        now,
        tz,
    )
}
