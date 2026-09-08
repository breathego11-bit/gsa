import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import { revokeToken } from '@/lib/calendar/google'
import { decryptToken } from '@/lib/calendar/crypto'
import { transferAllMeetings } from '@/lib/calendar/transfer'

export const dynamic = 'force-dynamic'

/**
 * Desconecta el Google Calendar de un miembro.
 *
 * Cada uno desconecta el suyo; un ADMIN puede desconectar el de otro (caso "se fue del equipo")
 * pasando `user_id`.
 *
 * Body (todo opcional): { user_id?: string, transfer_to?: string }
 *
 * ⚠️ El ORDEN es lo importante de este endpoint. Mover un evento entre calendarios exige los
 * tokens de las dos partes, así que la transferencia va ANTES de soltar la conexión. Si se
 * desconectara primero, las reuniones futuras quedarían huérfanas: sin tokens del origen ya no se
 * pueden ni leer ni cancelar, y el lead se quedaría invitado a una reunión que nadie va a atender.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: Record<string, unknown> = {}
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        /* sin body = desconectar el propio, sin transferir */
    }

    const targetUserId = typeof body.user_id === 'string' && body.user_id ? body.user_id : session.user.id
    const transferTo = typeof body.transfer_to === 'string' && body.transfer_to ? body.transfer_to : null

    // Desconectar a OTRO miembro es cosa de admins.
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo un admin puede desconectar el calendario de otro' }, { status: 403 })
    }
    if (transferTo === targetUserId) {
        return NextResponse.json({ error: 'No se pueden transferir las reuniones al mismo miembro' }, { status: 400 })
    }

    const conn = await prisma.calendarConnection.findUnique({
        where: { user_id_provider: { user_id: targetUserId, provider: 'GOOGLE' } },
        select: { id: true, refresh_token: true },
    })
    if (!conn) return NextResponse.json({ error: 'No hay ninguna conexión que desconectar' }, { status: 404 })

    // 1. Transferir PRIMERO, mientras los tokens del origen siguen vivos.
    let transferred = 0
    let pastReassigned = 0
    let warnings: { leadId: string; warning: string }[] = []
    if (transferTo) {
        const { results, pastReassigned: past } = await transferAllMeetings(targetUserId, transferTo)
        const failed = results.filter((r) => !r.ok)
        if (failed.length > 0) {
            /*
             * Abortar sin desconectar: con la conexión viva todavía se puede reintentar.
             *
             * El mensaje dice lo que de verdad ha pasado. Las transferencias que sí salieron ya
             * están hechas y no se revierten (deshacerlas implicaría volver a mover eventos y
             * mandar más correos al lead), así que anunciar "no se ha cambiado nada" sería
             * mentira. Reintentar es seguro: los ya movidos ya no están asignados al origen.
             */
            const moved = results.filter((r) => r.movedEvent).length
            return NextResponse.json(
                {
                    error:
                        `Se movieron ${moved} de ${results.length} reuniones. ` +
                        `${failed.length} fallaron, así que NO se ha desconectado el calendario: ` +
                        `revisa el error y vuelve a intentarlo.`,
                    moved,
                    failed: failed.map((f) => ({ leadId: f.leadId, error: f.error })),
                },
                { status: 409 },
            )
        }
        transferred = results.filter((r) => r.movedEvent).length
        pastReassigned = past
        /*
         * Un lead puede salir `ok:true` y aun así traer un aviso — el caso típico es que el
         * calendario de origen ya no estuviera conectado, así que se reasignó en el CRM pero su
         * evento sigue vivo en un calendario al que ya no llegamos. Sin propagarlo, el admin
         * desconectaba creyendo que estaba todo movido.
         */
        warnings = results
            .filter((r) => r.ok && r.error)
            .map((r) => ({ leadId: r.leadId, warning: r.error as string }))
    }

    // 2. Revocar en Google. Best-effort: si falla, se sigue borrando en local — dejar la fila por
    //    un error de red sería peor, porque el usuario creería que desconectó y seguiría en el pool.
    try {
        await revokeToken(decryptToken(conn.refresh_token))
    } catch (err) {
        console.error('[google] no se pudo revocar el token al desconectar:', err)
    }

    // 3. Borrar la conexión y sacar al miembro del round-robin.
    await prisma.$transaction([
        prisma.calendarConnection.delete({ where: { id: conn.id } }),
        prisma.user.update({ where: { id: targetUserId }, data: { lead_booking_enabled: false } }),
    ])

    return NextResponse.json({ ok: true, transferred, pastReassigned, warnings })
}
