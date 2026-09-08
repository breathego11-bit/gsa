import { prisma } from '@/lib/prisma'
import { clientForConnection } from '@/lib/calendar/tokens'
import { createEvent, deleteEvent, getEvent } from '@/lib/calendar/google'
import { canAccessCRM } from '@/lib/access'

/**
 * Traspaso de una reunión agendada de un miembro a otro.
 *
 * Google no permite cambiar el organizador de un evento entre cuentas que no comparten dominio de
 * Workspace (`events.move` exige eso, y aquí son Gmail personales), así que "mover" es en realidad
 * recrear en el calendario destino y cancelar en el origen. El lead recibe una cancelación y una
 * invitación nueva con otro enlace de Meet: es el precio de que la reunión acabe en el calendario
 * correcto.
 */

export interface TransferResult {
    leadId: string
    ok: boolean
    /** true si además del CRM se movió el evento de Google. */
    movedEvent: boolean
    error?: string
}

/** Conexión activa de un miembro, con lo necesario para operar su calendario. */
async function activeConnection(userId: string) {
    return prisma.calendarConnection.findFirst({
        where: { user_id: userId, provider: 'GOOGLE', status: 'active' },
        select: {
            id: true,
            calendar_id: true,
            refresh_token: true,
            access_token: true,
            token_expiry: true,
        },
    })
}

/**
 * Transfiere un lead (y su reunión, si la tiene) a otro miembro.
 *
 * Un lead sin `google_event_id` solo cambia de asignado: no hay nada que mover.
 */
export async function transferLeadMeeting(leadId: string, toUserId: string): Promise<TransferResult> {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
            id: true,
            email: true,
            full_name: true,
            google_event_id: true,
            assigned_to: true,
            meeting_at: true,
            status: true,
        },
    })
    if (!lead) return { leadId, ok: false, movedEvent: false, error: 'Lead no encontrado' }

    /*
     * El destinatario tiene que existir Y poder trabajar el CRM. Comprobar solo que la fila existe
     * dejaba pasar el id de cualquier alumno: se le podían entregar leads a alguien que ni siquiera
     * ve la sección. Y sin la comprobación de existencia, un id inventado revienta con un P2003 de
     * Prisma (500 opaco) y, en el traspaso en bloque, lo haría DESPUÉS de mover eventos.
     */
    const target = await prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true, name: true, last_name: true, role: true, closer_enabled: true, closer_type: true, payment_status: true },
    })
    if (!target) return { leadId, ok: false, movedEvent: false, error: 'El destinatario no existe' }
    if (!canAccessCRM(target)) {
        return { leadId, ok: false, movedEvent: false, error: 'El destinatario no tiene acceso al CRM' }
    }

    /*
     * Sin evento no hay nada que mover: basta con reasignar en el CRM.
     *
     * Un lead DESCARTADO entra por aquí aunque conserve `google_event_id`: recrear la reunión de
     * alguien a quien ya se descartó le mandaría una invitación nueva a una llamada que nadie va a
     * atender. Se reasigna en el CRM y su evento se deja como está.
     */
    if (!lead.google_event_id || !lead.assigned_to || lead.status === 'DESCARTADO') {
        try {
            await prisma.lead.update({
                where: { id: leadId },
                data: { assigned_to: toUserId, assigned_at: new Date() },
            })
        } catch (err) {
            console.error(`[transfer] no se pudo reasignar el lead ${leadId}:`, err)
            return { leadId, ok: false, movedEvent: false, error: 'No se pudo reasignar el lead' }
        }
        return { leadId, ok: true, movedEvent: false }
    }

    const [fromConn, toConn] = await Promise.all([
        activeConnection(lead.assigned_to),
        activeConnection(toUserId),
    ])

    if (!toConn) {
        return {
            leadId,
            ok: false,
            movedEvent: false,
            error: 'El destinatario no tiene Google Calendar conectado',
        }
    }
    if (!fromConn) {
        /*
         * El origen ya no tiene tokens (desconectó antes de transferir). No se puede leer ni
         * cancelar su evento, así que lo único honesto es reasignar en el CRM y decirlo: el evento
         * viejo sigue vivo en su calendario y hay que cancelarlo a mano.
         */
        try {
            await prisma.lead.update({
                where: { id: leadId },
                data: { assigned_to: toUserId, assigned_at: new Date() },
            })
        } catch (err) {
            console.error(`[transfer] no se pudo reasignar el lead ${leadId}:`, err)
            return { leadId, ok: false, movedEvent: false, error: 'No se pudo reasignar el lead' }
        }
        return {
            leadId,
            ok: true,
            movedEvent: false,
            error: 'Reasignado en el CRM, pero el calendario de origen ya no está conectado: su evento sigue ahí y hay que cancelarlo a mano',
        }
    }

    try {
        const fromClient = await clientForConnection(fromConn)
        const original = await getEvent(fromClient, fromConn.calendar_id, lead.google_event_id)
        if (!original) {
            return {
                leadId,
                ok: false,
                movedEvent: false,
                error: 'No se pudo leer el evento original en Google',
            }
        }

        /*
         * El título del evento lo genera el booking como "Proceso de admisión - <lead> - <closer>".
         * Copiarlo tal cual dejaba el nombre del closer SALIENTE en la invitación nueva que recibe
         * el lead, así que se reconstruye con el que entra.
         */
        const newOwner = `${target.name} ${target.last_name}`.trim()
        const summary = /^Proceso de admisión - /.test(original.summary)
            ? `Proceso de admisión - ${lead.full_name} - ${newOwner}`
            : original.summary

        // Crear ANTES de borrar: si la creación falla, el lead conserva su reunión.
        const toClient = await clientForConnection(toConn)
        const created = await createEvent(toClient, {
            calendarId: toConn.calendar_id,
            summary,
            description: original.description,
            startDateTime: original.startDateTime,
            endDateTime: original.endDateTime,
            timeZone: original.timeZone,
            /*
             * El invitado es el LEAD, tomado de la base, no `attendees[0]` del evento original.
             * Esa lista incluye también al organizador saliente: si se copiaba a ciegas, el evento
             * nuevo invitaba al miembro que se va y el lead —cuya reunión original se acaba de
             * cancelar con sendUpdates:'all'— se quedaba fuera de su propia llamada.
             */
            attendeeEmail: lead.email,
            requestId: `gsa-transfer-${leadId}-${Date.now()}`,
        })

        /*
         * ORDEN: crear → guardar en la base → borrar el original.
         *
         * Guardar antes de borrar es lo que hace la operación reintentable. Si se borraba primero y
         * fallaba el update, la base seguía apuntando a un evento ya inexistente: el reintento hacía
         * `getEvent` sobre un id borrado y fallaba para siempre, dejando la desconexión bloqueada
         * sin salida. Con este orden, un fallo del update deja como mucho un evento duplicado —el
         * viejo sigue vivo y la base sigue siendo coherente con él, así que reintentar funciona.
         */
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                assigned_to: toUserId,
                assigned_at: new Date(),
                google_event_id: created.id || null,
                google_event_url: created.htmlLink || null,
                meeting_link: created.hangoutLink || null,
            },
        })

        try {
            await deleteEvent(fromClient, fromConn.calendar_id, lead.google_event_id)
        } catch (err) {
            // Un evento duplicado es mucho menos grave que perder la reunión: se registra y se sigue.
            console.error(`[transfer] no se pudo borrar el evento original del lead ${leadId}:`, err)
        }

        return { leadId, ok: true, movedEvent: true }
    } catch (err) {
        console.error(`[transfer] fallo transfiriendo el lead ${leadId}:`, err)
        return {
            leadId,
            ok: false,
            movedEvent: false,
            error: 'Google rechazó la operación. El lead se queda como estaba.',
        }
    }
}

/**
 * Transfiere en bloque los leads de un miembro a otro.
 *
 * Por defecto solo las reuniones FUTURAS: recrear en otro calendario una reunión que ya ocurrió no
 * aporta nada y dispara correos de invitación a destiempo. Los leads pasados sí cambian de asignado
 * —para que el registro quede coherente— pero su evento no se toca.
 */
export async function transferAllMeetings(
    fromUserId: string,
    toUserId: string,
): Promise<{ results: TransferResult[]; pastReassigned: number }> {
    const now = new Date()

    // Los descartados no cuentan como reunión futura: su evento no se recrea (ver
    // `transferLeadMeeting`), así que se tratan con el resto en el updateMany de abajo.
    const future = await prisma.lead.findMany({
        where: { assigned_to: fromUserId, meeting_at: { gte: now }, status: { not: 'DESCARTADO' } },
        select: { id: true },
        orderBy: { meeting_at: 'asc' },
    })

    const results: TransferResult[] = []
    for (const lead of future) {
        // En serie a propósito: en paralelo, varias creaciones simultáneas contra la API de
        // Calendar se topan con el rate limit por usuario y fallan en cascada.
        results.push(await transferLeadMeeting(lead.id, toUserId))
    }

    /*
     * Si alguna reunión falló, NO se arrastra el resto de la cartera. Quien llama va a abortar la
     * desconexión para poder reintentar, y mover aquí los leads pasados dejaría al miembro sin sus
     * leads pero con la conexión puesta: un estado a medias más difícil de deshacer.
     */
    if (results.some((r) => !r.ok)) {
        return { results, pastReassigned: 0 }
    }

    // Leads sin reunión futura (o descartados): solo cambian de dueño en el CRM.
    const past = await prisma.lead.updateMany({
        where: {
            assigned_to: fromUserId,
            OR: [{ meeting_at: null }, { meeting_at: { lt: now } }, { status: 'DESCARTADO' }],
        },
        data: { assigned_to: toUserId, assigned_at: new Date() },
    })

    return { results, pastReassigned: past.count }
}

/** Cuántas reuniones futuras tiene asignadas un miembro (para avisar antes de desconectar). */
export function countFutureMeetings(userId: string): Promise<number> {
    return prisma.lead.count({
        where: { assigned_to: userId, meeting_at: { gte: new Date() }, status: { not: 'DESCARTADO' } },
    })
}
