import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCommissionTiers, type CommissionTier } from '@/lib/commission'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tiers = await getCommissionTiers()
    return NextResponse.json({ tiers })
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as { tiers?: unknown }
    if (!Array.isArray(body.tiers)) {
        return NextResponse.json({ error: 'tiers must be an array' }, { status: 400 })
    }

    // Validate shape
    const candidates: CommissionTier[] = []
    for (const raw of body.tiers) {
        if (!raw || typeof raw !== 'object') {
            return NextResponse.json({ error: 'Cada tier debe ser un objeto' }, { status: 400 })
        }
        const r = raw as Record<string, unknown>
        const min_amount = Number(r.min_amount)
        const percentage = Number(r.percentage)
        if (!Number.isFinite(min_amount) || min_amount < 0) {
            return NextResponse.json({ error: 'min_amount inválido (debe ser ≥ 0)' }, { status: 400 })
        }
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            return NextResponse.json({ error: 'percentage inválido (0-100)' }, { status: 400 })
        }
        candidates.push({ min_amount: Math.round(min_amount), percentage })
    }

    if (candidates.length === 0) {
        return NextResponse.json({ error: 'Debe haber al menos 1 tier' }, { status: 400 })
    }

    // Sort and validate ascending order + no duplicates
    const sorted = [...candidates].sort((a, b) => a.min_amount - b.min_amount)
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].min_amount === sorted[i - 1].min_amount) {
            return NextResponse.json({ error: 'No puede haber dos tiers con el mismo umbral' }, { status: 400 })
        }
    }

    // Persist (upsert into singleton SiteSettings)
    // Prisma JSON fields require unknown casts for typed objects/arrays
    const tiersJson = sorted as unknown as object
    const existing = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    if (existing) {
        await prisma.siteSettings.update({
            where: { id: 'singleton' },
            data: { commission_tiers: tiersJson },
        })
    } else {
        // SiteSettings requires `pricing`, so use a sensible default if no record
        await prisma.siteSettings.create({
            data: {
                id: 'singleton',
                pricing: { totalPrice: 188800, firstInstallment: 188800, installmentCount: 1, interestRate: 0 },
                commission_tiers: tiersJson,
            },
        })
    }

    return NextResponse.json({ tiers: sorted })
}
