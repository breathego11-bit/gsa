import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPeriodRange, type PeriodPreset } from '@/lib/sales-period'
import {
    commission,
    getCommissionTiers,
    getClosersCashCollected,
} from '@/lib/commission'

interface CloserDTO {
    id: string
    name: string
    last_name: string
    is_admin: boolean
}

interface AdminSaleDTO {
    id: string
    closer_id: string
    closer_name: string
    closer_last_name: string
    customer_first_name: string
    customer_last_name: string
    customer_email: string
    customer_phone: string
    package_name: string
    total_amount: number
    cash_collected: number
    payment_type: string
    sale_date: string
    created_at: string
}

interface AdminSalesResponse {
    sales: AdminSaleDTO[]
    closers: CloserDTO[]
    metrics: {
        total_cash_collected: number
        total_contracted: number
        total_commissions: number
        sales_count: number
        sales_complete: number
        sales_partial: number
        top_closer:
            | {
                  id: string
                  name: string
                  last_name: string
                  cash_collected: number
                  sales_count: number
              }
            | null
    }
    period: { preset: string; from: string; to: string }
    tiers: { min_amount: number; percentage: number }[]
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = req.nextUrl
    const preset = (url.searchParams.get('period') as PeriodPreset | null) ?? 'month'
    const customFrom = url.searchParams.get('from')
    const customTo = url.searchParams.get('to')
    const range = getPeriodRange(preset, customFrom, customTo)
    const closerFilter = url.searchParams.get('closer_id')
    const search = url.searchParams.get('search')?.trim()

    // 1. Seller list for the dropdown (also used to resolve the "top closer").
    //    - Closers: full list, matches the runtime isCloser() definition (enabled AND type).
    //    - Admins: only those who have registered at least one sale, so they're
    //      filterable and can surface as top seller. Flagged with is_admin for the UI.
    const [enabledClosers, adminSellers] = await Promise.all([
        prisma.user.findMany({
            where: { closer_enabled: true, closer_type: { not: null } },
            select: { id: true, name: true, last_name: true },
            orderBy: [{ name: 'asc' }, { last_name: 'asc' }],
        }),
        prisma.user.findMany({
            where: { role: 'ADMIN', sales: { some: {} } },
            select: { id: true, name: true, last_name: true },
            orderBy: [{ name: 'asc' }, { last_name: 'asc' }],
        }),
    ])

    // Merge + dedupe by id (an admin flagged as closer only appears once, as admin).
    const closersById = new Map<string, CloserDTO>()
    for (const c of enabledClosers) closersById.set(c.id, { ...c, is_admin: false })
    for (const a of adminSellers) closersById.set(a.id, { ...a, is_admin: true })
    const closers: CloserDTO[] = Array.from(closersById.values()).sort(
        (x, y) => x.name.localeCompare(y.name) || x.last_name.localeCompare(y.last_name),
    )

    // 2. Build sale where clause
    const where: Record<string, unknown> = {
        sale_date: { gte: range.from, lte: range.to },
    }
    if (closerFilter && closerFilter !== 'all') {
        where.closer_id = closerFilter
    }
    if (search) {
        where.OR = [
            { customer_first_name: { contains: search, mode: 'insensitive' } },
            { customer_last_name: { contains: search, mode: 'insensitive' } },
            { customer_email: { contains: search, mode: 'insensitive' } },
            { package_name: { contains: search, mode: 'insensitive' } },
            { id: { contains: search } },
        ]
    }

    // 3. Sales in period (filtered)
    const sales = await prisma.sale.findMany({
        where,
        include: {
            installments: { select: { collected: true, amount: true } },
            closer: { select: { id: true, name: true, last_name: true } },
        },
        orderBy: { sale_date: 'desc' },
    })

    const saleDtos: AdminSaleDTO[] = sales.map((s) => ({
        id: s.id,
        closer_id: s.closer_id,
        closer_name: s.closer.name,
        closer_last_name: s.closer.last_name,
        customer_first_name: s.customer_first_name,
        customer_last_name: s.customer_last_name,
        customer_email: s.customer_email,
        customer_phone: s.customer_phone,
        package_name: s.package_name,
        total_amount: s.total_amount,
        cash_collected: s.installments.filter((i) => i.collected).reduce((sum, i) => sum + i.amount, 0),
        payment_type: s.payment_type,
        sale_date: s.sale_date.toISOString(),
        created_at: s.created_at.toISOString(),
    }))

    // 4. Aggregates
    const total_contracted = saleDtos.reduce((s, x) => s + x.total_amount, 0)
    const total_cash_collected = saleDtos.reduce((s, x) => s + x.cash_collected, 0)
    const sales_complete = saleDtos.filter((x) => x.cash_collected >= x.total_amount).length
    const sales_partial = saleDtos.length - sales_complete

    // 5. Per-closer cash collected (uses installment.collected_at, not sale_date)
    //    so that commission is computed correctly per spec (flat al tier).
    //    Scope: only closers who appear in the filtered sales list (or the single filter target).
    const closerIdsInScope = closerFilter && closerFilter !== 'all'
        ? [closerFilter]
        : Array.from(new Set(saleDtos.map((s) => s.closer_id)))

    const cashByCloser = await getClosersCashCollected(closerIdsInScope, range.from, range.to)
    const tiers = await getCommissionTiers()

    // 6. Total commissions: sum of per-closer commission (flat al tier) over the cash collected in period
    let total_commissions = 0
    let topCloserId: string | null = null
    let topCloserCashCollected = 0
    for (const id of closerIdsInScope) {
        const cc = cashByCloser.get(id) ?? 0
        const com = commission(cc, tiers)
        total_commissions += com.amount
        if (cc > topCloserCashCollected) {
            topCloserCashCollected = cc
            topCloserId = id
        }
    }

    // 7. Top closer details + sales count (within filtered listing)
    const topCloser = topCloserId
        ? (() => {
              const closer = closers.find((c) => c.id === topCloserId)
              if (!closer) return null
              const salesOfTop = saleDtos.filter((s) => s.closer_id === topCloserId).length
              return {
                  id: closer.id,
                  name: closer.name,
                  last_name: closer.last_name,
                  cash_collected: topCloserCashCollected,
                  sales_count: salesOfTop,
              }
          })()
        : null

    const response: AdminSalesResponse = {
        sales: saleDtos,
        closers,
        metrics: {
            total_cash_collected,
            total_contracted,
            total_commissions,
            sales_count: saleDtos.length,
            sales_complete,
            sales_partial,
            top_closer: topCloser,
        },
        period: {
            preset: range.preset,
            from: range.from.toISOString(),
            to: range.to.toISOString(),
        },
        tiers,
    }

    return NextResponse.json(response)
}
