import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPeriodRange, type PeriodPreset } from '@/lib/sales-period'
import { commission, getCommissionTiers, getCloserCashCollected } from '@/lib/commission'
import type { SaleDTO, SalesMetrics, CreateSaleInput } from '@/lib/sales'
import type { Sale, SaleInstallment } from '@prisma/client'

function toSaleDTO(s: Sale & { installments: SaleInstallment[] }): SaleDTO {
    const cash_collected = s.installments.filter((i) => i.collected).reduce((sum, i) => sum + i.amount, 0)
    return {
        id: s.id,
        closer_id: s.closer_id,
        customer_first_name: s.customer_first_name,
        customer_last_name: s.customer_last_name,
        customer_email: s.customer_email,
        customer_phone: s.customer_phone,
        package_name: s.package_name,
        package_description: s.package_description,
        total_amount: s.total_amount,
        payment_type: s.payment_type,
        screenshot_url: s.screenshot_url,
        sale_date: s.sale_date.toISOString(),
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
        installments: s.installments
            .sort((a, b) => a.order - b.order)
            .map((i) => ({
                id: i.id,
                order: i.order,
                amount: i.amount,
                due_date: i.due_date?.toISOString() ?? null,
                collected: i.collected,
                collected_at: i.collected_at?.toISOString() ?? null,
            })),
        cash_collected,
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && !session.user.closer_enabled) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = req.nextUrl
    const preset = (url.searchParams.get('period') as PeriodPreset | null) ?? 'month'
    const customFrom = url.searchParams.get('from')
    const customTo = url.searchParams.get('to')
    const range = getPeriodRange(preset, customFrom, customTo)

    // Sales whose sale_date falls within period (for listing + total_contracted)
    const sales = await prisma.sale.findMany({
        where: {
            closer_id: session.user.id,
            sale_date: { gte: range.from, lte: range.to },
        },
        include: { installments: true },
        orderBy: { sale_date: 'desc' },
    })

    const tiers = await getCommissionTiers()
    // Cash collected uses the period range applied to installment.collected_at
    const cashCollected = await getCloserCashCollected(session.user.id, range.from, range.to)
    const com = commission(cashCollected, tiers)

    const dtos = sales.map(toSaleDTO)
    const total_contracted = dtos.reduce((s, x) => s + x.total_amount, 0)
    const sales_complete = dtos.filter((x) => x.cash_collected >= x.total_amount).length

    const metrics: SalesMetrics = {
        cash_collected: cashCollected,
        total_contracted,
        sales_count: dtos.length,
        sales_complete,
        sales_partial: dtos.length - sales_complete,
        commission: com,
    }

    return NextResponse.json({
        sales: dtos,
        metrics,
        tiers,
        period: {
            preset: range.preset,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
        },
    })
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.closer_enabled && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as CreateSaleInput

    // Basic validation
    if (!body.customer_first_name || !body.customer_last_name || !body.customer_email || !body.customer_phone) {
        return NextResponse.json({ error: 'Missing customer fields' }, { status: 400 })
    }
    if (!body.package_name || !body.screenshot_url || !body.sale_date) {
        return NextResponse.json({ error: 'Missing package or evidence fields' }, { status: 400 })
    }
    if (!Number.isFinite(body.total_amount) || body.total_amount <= 0) {
        return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 })
    }

    const saleDate = new Date(body.sale_date)
    if (Number.isNaN(saleDate.getTime())) {
        return NextResponse.json({ error: 'Invalid sale_date' }, { status: 400 })
    }

    // Build installments
    type InstallmentSeed = { order: number; amount: number; collected: boolean; collected_at: Date | null }
    const installmentsToCreate: InstallmentSeed[] = []

    if (body.payment_type === 'SINGLE') {
        installmentsToCreate.push({
            order: 1,
            amount: body.total_amount,
            collected: true,
            collected_at: saleDate,
        })
    } else {
        const count = body.installment_count ?? 0
        const first = body.first_installment_amount ?? 0
        const rest = body.rest_installment_amount ?? 0
        if (count < 2) return NextResponse.json({ error: 'INSTALLMENTS requires installment_count >= 2' }, { status: 400 })
        if (first <= 0 || rest <= 0) return NextResponse.json({ error: 'Invalid installment amounts' }, { status: 400 })
        installmentsToCreate.push({ order: 1, amount: first, collected: true, collected_at: saleDate })
        for (let i = 2; i <= count; i++) {
            installmentsToCreate.push({ order: i, amount: rest, collected: false, collected_at: null })
        }
    }

    const sale = await prisma.sale.create({
        data: {
            closer_id: session.user.id,
            customer_first_name: body.customer_first_name,
            customer_last_name: body.customer_last_name,
            customer_email: body.customer_email,
            customer_phone: body.customer_phone,
            package_name: body.package_name,
            package_description: body.package_description ?? null,
            total_amount: body.total_amount,
            payment_type: body.payment_type,
            screenshot_url: body.screenshot_url,
            sale_date: saleDate,
            installments: { create: installmentsToCreate },
        },
        include: { installments: true },
    })

    return NextResponse.json(toSaleDTO(sale), { status: 201 })
}
