import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCloser } from '@/lib/access'
import { countFutureMeetings } from '@/lib/calendar/transfer'

/**
 * Interruptor "Recibe leads" de un closer: autoriza o retira su entrada al reparto de reuniones.
 *
 * Conectar el calendario ya no basta para que a un closer le lleguen leads (ver `pool.ts`): lo
 * decide un admin desde aquí. Retirarlo solo corta los leads **nuevos**; las reuniones que ya
 * tiene siguen siendo suyas y se mueven con "Reasignar" en cada lead.
 *
 * Body: { enabled: boolean }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as { enabled?: unknown }
    if (typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { id },
        select: { role: true, payment_status: true, closer_enabled: true, closer_type: true },
    })
    if (!user) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    // Los admins entran y salen del reparto conectando y desconectando su calendario.
    if (user.role === 'ADMIN') {
        return NextResponse.json({ error: 'Los admins entran al reparto al conectar su calendario' }, { status: 400 })
    }
    if (body.enabled && !isCloser(user)) {
        return NextResponse.json({ error: 'Primero actívalo como closer' }, { status: 400 })
    }

    const [, connection, futureMeetings] = await Promise.all([
        prisma.user.update({ where: { id }, data: { lead_booking_enabled: body.enabled } }),
        prisma.calendarConnection.findUnique({
            where: { user_id_provider: { user_id: id, provider: 'GOOGLE' } },
            select: { status: true },
        }),
        countFutureMeetings(id),
    ])

    return NextResponse.json({
        lead_booking_enabled: body.enabled,
        calendar_status: connection?.status ?? null,
        future_meetings: futureMeetings,
    })
}
