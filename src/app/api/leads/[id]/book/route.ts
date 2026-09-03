import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { leadsAuthOk } from '@/lib/leads/auth'
import { freeMembersAt } from '@/lib/calendar/availability'
import { clientForConnection } from '@/lib/calendar/tokens'
import { createEvent, deleteEvent } from '@/lib/calendar/google'
import { pickAssignee, type Candidate } from '@/lib/calendar/assignment'
import { toRfc3339InZone } from '@/lib/calendar/tz'

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
 * Paso B (nuevo): reserva un slot. Elige miembro por round-robin entre los libres,
 * crea el evento de Google (con Meet, invitando al lead) en SU calendario, y guarda la
 * cita en el Lead. Auth x-api-key.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const expected = process.env.LEADS_API_KEY
    if (!expected) return NextResponse.json({ error: 'LEADS_API_KEY no configurado' }, { status: 500 })
    if (!leadsAuthOk(req, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const startAt = typeof body.start_at === 'string' ? body.start_at.trim() : ''
    const tz = typeof body.tz_iana === 'string' ? body.tz_iana.trim() : ''
    const durationRaw = typeof body.duration === 'number' ? body.duration : DEFAULT_DURATION
    const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.floor(durationRaw) : DEFAULT_DURATION

    if (!startAt) return NextResponse.json({ error: 'Missing start_at' }, { status: 400 })
    const startUTC = new Date(startAt)
    if (Number.isNaN(startUTC.getTime())) return NextResponse.json({ error: 'Invalid start_at' }, { status: 400 })
    if (!tz || !isValidTz(tz)) return NextResponse.json({ error: 'Invalid tz_iana' }, { status: 400 })
    if (startUTC.getTime() < Date.now()) return NextResponse.json({ error: 'start_at in the past' }, { status: 400 })

    // Cargar lead
    const lead = await prisma.lead.findUnique({
        where: { id },
        select: {
            id: true,
            full_name: true,
            email: true,
            whatsapp: true,
            objectives: true,
            google_event_id: true,
            meeting_at: true,
            meeting_link: true,
            assigned_to: true,
            assignee: { select: { id: true, name: true, last_name: true } },
        },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Idempotencia: ya tiene cita → devolver la existente sin crear otra
    if (lead.google_event_id) {
        return NextResponse.json({
            assignee: lead.assignee
                ? { id: lead.assignee.id, name: `${lead.assignee.name} ${lead.assignee.last_name}`.trim() }
                : null,
            meeting_at: lead.meeting_at,
            meeting_link: lead.meeting_link,
            google_event_id: lead.google_event_id,
            // No se creó nada en ESTA llamada: quien mida conversiones no debe contar otra.
            event_confirmed: false,
            already_booked: true,
        })
    }

    // Miembros realmente libres ahora (re-chequeo en vivo)
    const { free, hadError } = await freeMembersAt(startUTC, duration)
    if (free.length === 0) {
        // 0 libres por fallo de calendario ≠ slot ocupado: no mentir "carrera".
        return hadError
            ? NextResponse.json({ error: 'calendar_error' }, { status: 503 })
            : NextResponse.json({ error: 'slot_taken' }, { status: 409 })
    }

    // Construir candidatos (carga + última asignación) para el round-robin
    const now = new Date()
    const candidates = await Promise.all(
        free.map(async (conn): Promise<Candidate & { connId: string; calendarId: string }> => {
            const [futureMeetings, lastLead] = await Promise.all([
                prisma.lead.count({ where: { assigned_to: conn.user.id, meeting_at: { gte: now } } }),
                prisma.lead.findFirst({
                    where: { assigned_to: conn.user.id, assigned_at: { not: null } },
                    orderBy: { assigned_at: 'desc' },
                    select: { assigned_at: true },
                }),
            ])
            return {
                userId: conn.user.id,
                name: `${conn.user.name} ${conn.user.last_name}`.trim(),
                futureMeetings,
                lastAssignedAt: lastLead?.assigned_at ?? null,
                connId: conn.id,
                calendarId: conn.calendar_id,
            }
        }),
    )

    const chosen = pickAssignee(candidates)
    if (!chosen) return NextResponse.json({ error: 'slot_taken' }, { status: 409 })
    const chosenConn = free.find((c) => c.id === chosen.connId)!

    // Crear el evento en el calendario del asignado
    const endRfc = toRfc3339InZone(new Date(startUTC.getTime() + duration * 60_000), tz)
    let event
    try {
        const client = await clientForConnection(chosenConn)
        event = await createEvent(client, {
            calendarId: chosenConn.calendar_id,
            summary: `Proceso de admisión - ${lead.full_name} - ${chosen.name}`,
            description: `Lead desde landing GSA.\nWhatsApp: ${lead.whatsapp}\nObjetivos: ${lead.objectives}`,
            startDateTime: startAt,
            endDateTime: endRfc,
            timeZone: tz,
            attendeeEmail: lead.email,
            requestId: `gsa-${id}-${startUTC.getTime()}`,
        })
    } catch {
        return NextResponse.json({ error: 'calendar_error' }, { status: 502 })
    }

    // Reclamo ATÓMICO del lead: updateMany solo escribe si nadie agendó mientras tanto
    // (where google_event_id = null). Cierra la ventana de carrera read-then-write.
    const claim = await prisma.lead.updateMany({
        where: { id, google_event_id: null },
        data: {
            meeting_at: startUTC,
            meeting_tz_iana: tz,
            google_event_id: event.id || null,
            google_event_url: event.htmlLink || null,
            meeting_link: event.hangoutLink || null,
            assigned_to: chosen.userId,
            assigned_at: new Date(),
            status: 'AGENDADO',
        },
    })

    if (claim.count === 0) {
        // Otra reserva concurrente ganó → borrar el evento huérfano que creamos (best-effort)
        if (event.id) {
            try {
                const client = await clientForConnection(chosenConn)
                await deleteEvent(client, chosenConn.calendar_id, event.id)
            } catch {
                /* best-effort: el invite huérfano es un costo aceptable si el borrado falla */
            }
        }
        const existing = await prisma.lead.findUnique({
            where: { id },
            select: {
                meeting_at: true,
                meeting_link: true,
                status: true,
                assignee: { select: { id: true, name: true, last_name: true } },
            },
        })
        return NextResponse.json({
            assignee: existing?.assignee
                ? { id: existing.assignee.id, name: `${existing.assignee.name} ${existing.assignee.last_name}`.trim() }
                : null,
            meeting_at: existing?.meeting_at ?? null,
            meeting_link: existing?.meeting_link ?? null,
            status: existing?.status ?? 'AGENDADO',
            event_confirmed: false,
            already_booked: true,
        })
    }

    const saved = await prisma.lead.findUnique({ where: { id }, select: { meeting_at: true, meeting_link: true } })
    /*
     * `event_confirmed` es la señal de que Google creó el evento EN ESTA llamada. La landing
     * la usa para disparar la conversión `Schedule` de Meta solo ante una reserva real:
     * ni el camino idempotente ni una carrera perdida deben contar como conversión nueva.
     */
    return NextResponse.json({
        assignee: { id: chosen.userId, name: chosen.name },
        meeting_at: saved?.meeting_at ?? startUTC,
        meeting_link: saved?.meeting_link ?? event.hangoutLink ?? null,
        google_event_id: event.id ?? null,
        event_confirmed: true,
        status: 'AGENDADO',
    })
}
