'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Coins, Wallet, TrendingUp, Target } from 'lucide-react'
import { PeriodSelector } from '@/components/sales/PeriodSelector'
import { KpiCard } from '@/components/sales/KpiCard'
import { TierScaleBar } from '@/components/sales/TierScaleBar'
import { SalesList } from '@/components/sales/SalesList'
import { SaleFormModal } from '@/components/sales/SaleFormModal'
import { getPeriodRange, formatPeriodLabel, type PeriodPreset } from '@/lib/sales-period'
import type { SaleDTO, SalesMetrics } from '@/lib/sales'
import type { CommissionTier } from '@/lib/commission'

interface ApiResponse {
    sales: SaleDTO[]
    metrics: SalesMetrics
    tiers: CommissionTier[]
    period: { preset: PeriodPreset; from: string; to: string }
}

function fmt(cents: number) {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

export function SalesDashboardClient() {
    const [period, setPeriod] = useState<PeriodPreset>('month')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ period })
        if (period === 'custom') {
            if (customFrom) params.set('from', customFrom)
            if (customTo) params.set('to', customTo)
        }
        const res = await fetch(`/api/sales?${params.toString()}`)
        if (res.ok) {
            const json: ApiResponse = await res.json()
            setData(json)
        }
        setLoading(false)
    }, [period, customFrom, customTo])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const range = getPeriodRange(period, customFrom, customTo)
    const rangeLabel = formatPeriodLabel(range)

    const onSaleCreated = (sale: SaleDTO) => {
        // optimistic add
        setData((prev) =>
            prev
                ? {
                      ...prev,
                      sales: [sale, ...prev.sales],
                  }
                : prev,
        )
        // refetch to recompute metrics
        fetchData()
    }

    return (
        <div className="px-6 md:px-8 py-7 pb-24 lg:pb-12 max-w-[1440px] mx-auto flex flex-col gap-6">
            {/* Header */}
            <header className="flex items-end justify-between gap-6 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-2.5"
                        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, letterSpacing: 0.5, color: '#7a8094' }}>
                        <span>Dashboard</span>
                        <span style={{ opacity: 0.5 }}>›</span>
                        <span style={{ color: '#38bdf8' }}>Ventas</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-semibold m-0 mb-1.5"
                        style={{ color: '#dee2f2', letterSpacing: -1.4, lineHeight: 1.05 }}>
                        Ventas
                    </h1>
                    <p className="text-sm m-0" style={{ color: '#9ca3b8' }}>
                        Registra tus ventas y sigue tu comisión
                    </p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                        color: '#fff',
                        boxShadow: '0 8px 24px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}>
                    <Plus size={16} />
                    Nueva venta
                </button>
            </header>

            {/* Period selector */}
            <PeriodSelector
                value={period}
                onChange={setPeriod}
                customFrom={customFrom}
                customTo={customTo}
                onCustomChange={(f, t) => {
                    setCustomFrom(f)
                    setCustomTo(t)
                }}
                rangeLabel={rangeLabel}
            />

            {/* KPIs */}
            {loading && !data ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-36 rounded-2xl animate-pulse"
                            style={{ background: 'rgba(27,31,43,0.4)' }} />
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <KpiCard
                            icon={<Coins size={16} />}
                            label="Cobrado este periodo"
                            value={fmt(data.metrics.cash_collected)}
                            sub={`de ${fmt(data.metrics.total_contracted)} contratado`}
                            accent="cyan"
                            progress={
                                data.metrics.total_contracted > 0
                                    ? data.metrics.cash_collected / data.metrics.total_contracted
                                    : 0
                            }
                        />
                        <KpiCard
                            icon={<Wallet size={16} />}
                            label="Tu comisión"
                            value={fmt(data.metrics.commission.amount)}
                            sub={`flat · ${data.metrics.commission.pct}% del cobrado`}
                            accent="indigo"
                        />
                        <KpiCard
                            icon={<TrendingUp size={16} />}
                            label="Ventas del periodo"
                            value={data.metrics.sales_count}
                            sub={`${data.metrics.sales_complete} completas · ${data.metrics.sales_partial} en cobro`}
                            accent="violet"
                        />
                        <KpiCard
                            icon={<Target size={16} />}
                            label="Tier actual"
                            value={`Tier ${data.metrics.commission.tier_idx + 1} · ${data.metrics.commission.pct}%`}
                            sub={
                                data.metrics.commission.next_tier
                                    ? `${fmt(data.metrics.commission.distance_to_next)} para Tier ${data.metrics.commission.tier_idx + 2}`
                                    : '🔥 tier máximo'
                            }
                            accent="azure"
                            ring={
                                data.metrics.commission.next_tier
                                    ? data.metrics.cash_collected / data.metrics.commission.next_tier.min_amount
                                    : 1
                            }
                        />
                    </div>

                    {/* Tier scale */}
                    <TierScaleBar
                        tiers={data.tiers}
                        cashCollected={data.metrics.cash_collected}
                        commission={data.metrics.commission.amount}
                        activeTierIdx={data.metrics.commission.tier_idx}
                    />

                    {/* Sales list */}
                    <SalesList sales={data.sales} onNewSale={() => setShowModal(true)} />
                </>
            ) : (
                <div className="text-sm" style={{ color: '#9ca3b8' }}>No se pudo cargar la información.</div>
            )}

            <SaleFormModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onCreated={onSaleCreated}
            />
        </div>
    )
}
