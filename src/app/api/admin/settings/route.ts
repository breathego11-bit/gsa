import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PricingConfig } from '@/lib/stripe'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    const pricing: PricingConfig = (settings?.pricing as unknown as PricingConfig) ?? {
        totalPrice: 188800,
        firstInstallment: 188800,
        installmentCount: 1,
    }

    return NextResponse.json({ pricing })
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { pricing } = await req.json() as { pricing: PricingConfig }

    if (!pricing.totalPrice || pricing.totalPrice <= 0) {
        return NextResponse.json({ error: 'El precio total debe ser mayor a 0' }, { status: 400 })
    }
    if (!pricing.firstInstallment || pricing.firstInstallment <= 0) {
        return NextResponse.json({ error: 'La primera cuota debe ser mayor a 0' }, { status: 400 })
    }
    if (pricing.firstInstallment > pricing.totalPrice) {
        return NextResponse.json({ error: 'La primera cuota no puede ser mayor al precio total' }, { status: 400 })
    }
    if (!pricing.installmentCount || pricing.installmentCount < 1) {
        return NextResponse.json({ error: 'El número de cuotas debe ser al menos 1' }, { status: 400 })
    }
    if (pricing.installmentCount === 1 && pricing.firstInstallment !== pricing.totalPrice) {
        return NextResponse.json({ error: 'Con 1 cuota, el monto debe ser igual al precio total' }, { status: 400 })
    }

    const updated = await prisma.siteSettings.upsert({
        where: { id: 'singleton' },
        update: { pricing: pricing as any },
        create: { id: 'singleton', pricing: pricing as any },
    })

    return NextResponse.json({ pricing: updated.pricing })
}
