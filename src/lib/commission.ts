import { prisma } from '@/lib/prisma'

export interface CommissionTier {
    min_amount: number  // cents
    percentage: number  // 0-100
}

export const DEFAULT_TIERS: CommissionTier[] = [
    { min_amount: 0, percentage: 9 },
    { min_amount: 2000000, percentage: 11 },
    { min_amount: 4000000, percentage: 13 },
]

export async function getCommissionTiers(): Promise<CommissionTier[]> {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    const raw = settings?.commission_tiers
    if (!raw || !Array.isArray(raw) || raw.length === 0) return DEFAULT_TIERS
    const tiers = (raw as unknown as CommissionTier[])
        .filter((t) => typeof t.min_amount === 'number' && typeof t.percentage === 'number')
        .sort((a, b) => a.min_amount - b.min_amount)
    return tiers.length > 0 ? tiers : DEFAULT_TIERS
}

/**
 * Flat-at-tier commission (Opción A confirmed by client).
 * The whole `cashCollected` amount pays at the percentage of the highest tier reached.
 */
export interface CommissionResult {
    pct: number
    amount: number  // cents
    tier_idx: number
    active_tier: CommissionTier
    next_tier: CommissionTier | null
    distance_to_next: number  // cents; 0 if at top
}

export function commission(cashCollected: number, tiers: CommissionTier[]): CommissionResult {
    const sorted = [...tiers].sort((a, b) => a.min_amount - b.min_amount)
    let active = sorted[0]
    let idx = 0
    for (let i = 0; i < sorted.length; i++) {
        if (cashCollected >= sorted[i].min_amount) {
            active = sorted[i]
            idx = i
        }
    }
    const next = sorted[idx + 1] ?? null
    return {
        pct: active.percentage,
        amount: Math.round(cashCollected * active.percentage / 100),
        tier_idx: idx,
        active_tier: active,
        next_tier: next,
        distance_to_next: next ? Math.max(0, next.min_amount - cashCollected) : 0,
    }
}

/**
 * Sum of all installment amounts collected by a closer in a date range.
 */
export async function getCloserCashCollected(
    closerId: string,
    from: Date,
    to: Date,
): Promise<number> {
    const result = await prisma.saleInstallment.aggregate({
        where: {
            sale: { closer_id: closerId },
            collected: true,
            collected_at: { gte: from, lte: to },
        },
        _sum: { amount: true },
    })
    return result._sum.amount ?? 0
}
