import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { leadsAuthOk } from '@/lib/leads/auth'
import { isSituation, isUrgency, isInvestment } from '@/lib/leads/options'
import { toLeadAttribution } from '@/lib/leads/attribution'

export const dynamic = 'force-dynamic'

/**
 * Ingestión de leads desde la landing — paso A del flujo two-step.
 *
 * Crea un Lead en estado NUEVO con los datos de contacto + cualificación.
 * La cita (Google Calendar) se adjunta luego con PATCH /api/leads/[id].
 *
 * Auth: header `x-api-key: <LEADS_API_KEY>` (o `Authorization: Bearer <LEADS_API_KEY>`).
 * Las opciones de cualificación deben llegar como CÓDIGO de enum (ver src/lib/leads/options.ts).
 */
export async function POST(req: NextRequest) {
    const expected = process.env.LEADS_API_KEY
    if (!expected) {
        return NextResponse.json({ error: 'LEADS_API_KEY no configurado en el servidor' }, { status: 500 })
    }
    if (!leadsAuthOk(req, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Honeypot anti-spam: si viene relleno es un bot → respondemos 200 sin guardar (no lo alertamos).
    if (typeof body.website === 'string' && body.website.trim() !== '') {
        return NextResponse.json({ ok: true }, { status: 200 })
    }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

    const full_name = str(body.full_name)
    const whatsapp = str(body.whatsapp)
    const email = str(body.email)
    const instagram = str(body.instagram)
    const country = str(body.country)
    const desired_change = str(body.desired_change)
    const objectives = str(body.objectives)
    const cafe_vision = str(body.cafe_vision)
    const situation = body.situation
    const urgency = body.urgency
    const investment = body.investment

    // Requeridos de contacto
    if (!full_name || !whatsapp || !email || !instagram || !country) {
        return NextResponse.json({ error: 'Missing contact fields' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    // Requeridos de cualificación (texto libre)
    if (!desired_change || !objectives || !cafe_vision) {
        return NextResponse.json({ error: 'Missing qualification fields' }, { status: 400 })
    }
    // Opción única → debe ser un código de enum válido
    if (!isSituation(situation)) {
        return NextResponse.json({ error: 'Invalid situation' }, { status: 400 })
    }
    if (!isUrgency(urgency)) {
        return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
    }
    if (!isInvestment(investment)) {
        return NextResponse.json({ error: 'Invalid investment' }, { status: 400 })
    }

    // submitted_at: epoch ms del cliente (opcional)
    let submitted_at: Date | null = null
    if (typeof body.submitted_at === 'number' && Number.isFinite(body.submitted_at)) {
        const d = new Date(body.submitted_at)
        if (!Number.isNaN(d.getTime())) submitted_at = d
    }

    const source = str(body.source) || 'landing-survey'

    // Atribución de campaña: opcional y con lista blanca. Si falta o es inválida, el lead
    // se crea igual — nunca debe poder tumbar la captura.
    const attribution = toLeadAttribution(body.attribution)

    const lead = await prisma.lead.create({
        data: {
            full_name,
            whatsapp,
            email,
            instagram,
            country,
            situation,
            desired_change,
            objectives,
            cafe_vision,
            urgency,
            investment,
            submitted_at,
            source,
            ...attribution,
        },
        select: { id: true, status: true },
    })

    return NextResponse.json({ id: lead.id, status: lead.status }, { status: 201 })
}
