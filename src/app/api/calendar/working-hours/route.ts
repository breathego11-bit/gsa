import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCRM } from '@/lib/access'
import { validateWorkingHours } from '@/lib/calendar/working-hours'

export const dynamic = 'force-dynamic'

/**
 * Guarda el horario de atención del propio miembro: en qué tramos pueden aplica y VSL ofrecerle
 * reuniones. Los dos embudos piden la disponibilidad al mismo motor, así que esto los cambia a la vez.
 *
 * Body: { working_hours: WorkingHours | null }
 *
 * `null` = volver al horario por defecto. Se guarda NULL y no una copia del default a propósito:
 * así, si algún día cambia el default del sistema, quien no se haya personalizado lo hereda.
 */
export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!('working_hours' in body)) {
        return NextResponse.json({ error: 'Falta working_hours' }, { status: 400 })
    }

    if (body.working_hours === null) {
        await prisma.user.update({ where: { id: session.user.id }, data: { working_hours: Prisma.DbNull } })
        return NextResponse.json({ ok: true, working_hours: null })
    }

    // Se valida otra vez aunque el editor ya lo haga: un PUT a mano podría guardar un horario que
    // rompiera el motor de huecos (tramos solapados, horas imposibles).
    const result = validateWorkingHours(body.working_hours)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    await prisma.user.update({
        where: { id: session.user.id },
        data: { working_hours: result.value as unknown as Prisma.InputJsonValue },
    })
    return NextResponse.json({ ok: true, working_hours: result.value })
}
