'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, MoreHorizontal, List, TrendingUp, Plus } from 'lucide-react'
import type { SaleDTO } from '@/lib/sales'

type Filter = 'all' | 'complete' | 'partial'

function fmt(cents: number) {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function relativeDate(iso: string): string {
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days}d`
    return `Hace ${Math.floor(days / 7)}sem`
}

function initials(first: string, last: string): string {
    return `${first.charAt(0) ?? ''}${last.charAt(0) ?? ''}`.toUpperCase() || '??'
}

interface Props {
    sales: SaleDTO[]
    onNewSale?: () => void
}

export function SalesList({ sales, onNewSale }: Props) {
    const [filter, setFilter] = useState<Filter>('all')

    const filtered = useMemo(() => {
        if (filter === 'all') return sales
        return sales.filter((s) => {
            const isComplete = s.cash_collected >= s.total_amount
            return filter === 'complete' ? isComplete : !isComplete
        })
    }, [sales, filter])

    return (
        <section className="rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, rgba(27,31,43,0.5) 0%, rgba(14,19,30,0.5) 100%)',
                border: '1px solid rgba(129,140,248,0.14)',
            }}
        >
            <div className="px-5 py-5 flex items-end justify-between gap-4 flex-wrap"
                style={{ borderBottom: '1px solid rgba(129,140,248,0.1)' }}>
                <div>
                    <div className="inline-flex items-center gap-1.5 mb-1.5"
                        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.3, color: '#38bdf8' }}>
                        <List size={11} />
                        VENTAS DEL PERIODO · {sales.length}
                    </div>
                    <h2 className="text-lg font-semibold m-0" style={{ color: '#dee2f2', letterSpacing: -0.5 }}>
                        Detalle de operaciones
                    </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterChip>
                    <FilterChip active={filter === 'complete'} onClick={() => setFilter('complete')}>Completas</FilterChip>
                    <FilterChip active={filter === 'partial'} onClick={() => setFilter('partial')}>En cobro</FilterChip>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState onNewSale={onNewSale} hasAny={sales.length > 0} />
            ) : (
                <div className="flex flex-col">
                    <div className="hidden md:flex gap-3 px-5 py-2.5 text-[9.5px] uppercase tracking-[1.3px]"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            color: '#7a8094',
                            background: 'rgba(8,13,24,0.4)',
                            borderBottom: '1px solid rgba(129,140,248,0.1)',
                        }}>
                        <div style={{ flex: '2 1 240px' }}>Cliente</div>
                        <div style={{ flex: '1.5 1 180px' }}>Paquete</div>
                        <div style={{ flex: '1 1 110px', textAlign: 'right' }}>Total</div>
                        <div style={{ flex: '1.7 1 200px' }}>Cobrado</div>
                        <div style={{ flex: '1 1 110px' }}>Fecha</div>
                        <div style={{ flex: '0 0 88px', textAlign: 'right' }}>Acciones</div>
                    </div>

                    {filtered.map((s, i) => (
                        <SaleRow key={s.id} sale={s} stripe={i % 2 === 1} />
                    ))}
                </div>
            )}
        </section>
    )
}

function SaleRow({ sale, stripe }: { sale: SaleDTO; stripe: boolean }) {
    const pctCobrado = sale.total_amount > 0 ? sale.cash_collected / sale.total_amount : 0
    const isComplete = sale.cash_collected >= sale.total_amount
    const ini = initials(sale.customer_first_name, sale.customer_last_name)
    const fullName = `${sale.customer_first_name} ${sale.customer_last_name}`.trim()

    return (
        <Link
            href={`/dashboard/sales/${sale.id}`}
            className="flex flex-col md:flex-row gap-3 px-5 py-3.5 transition-colors hover:opacity-90"
            style={{
                background: stripe ? 'rgba(27,31,43,0.25)' : 'transparent',
                borderBottom: '1px solid rgba(129,140,248,0.06)',
            }}
        >
            {/* Cliente */}
            <div style={{ flex: '2 1 240px', minWidth: 0 }} className="flex items-center gap-3">
                <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(129,140,248,0.18))',
                        border: '1px solid rgba(129,140,248,0.25)',
                        color: '#dee2f2',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}>
                    {ini}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#dee2f2' }}>{fullName}</div>
                    <div className="text-[11.5px] truncate" style={{ color: '#7a8094' }}>{sale.customer_email}</div>
                </div>
            </div>

            {/* Paquete */}
            <div style={{ flex: '1.5 1 180px', minWidth: 0 }} className="flex flex-col justify-center">
                <div className="text-sm truncate" style={{ color: '#dee2f2' }}>{sale.package_name}</div>
                <div className="text-[10.5px] truncate" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#7a8094' }}>
                    {sale.id.slice(0, 12).toUpperCase()}
                </div>
            </div>

            {/* Total */}
            <div style={{ flex: '1 1 110px', textAlign: 'right' }} className="flex flex-col justify-center">
                <div className="text-sm font-semibold" style={{ color: '#dee2f2', letterSpacing: -0.2 }}>
                    {fmt(sale.total_amount)}
                </div>
            </div>

            {/* Cobrado */}
            <div style={{ flex: '1.7 1 200px' }} className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium" style={{ color: '#dee2f2' }}>{fmt(sale.cash_collected)}</span>
                    <span className="px-1.5 py-px rounded-full text-[10px] font-semibold"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            background: isComplete ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.15)',
                            color: isComplete ? '#34d399' : '#38bdf8',
                        }}>
                        {Math.round(pctCobrado * 100)}%
                    </span>
                </div>
                <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(129,140,248,0.1)' }}>
                    <div className="h-full rounded transition-all"
                        style={{
                            width: `${pctCobrado * 100}%`,
                            background: isComplete
                                ? 'linear-gradient(90deg, #34d399, #38bdf8)'
                                : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                        }}
                    />
                </div>
            </div>

            {/* Fecha */}
            <div style={{ flex: '1 1 110px' }} className="flex flex-col justify-center">
                <div className="text-sm" style={{ color: '#dee2f2' }}>{formatDate(sale.sale_date)}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: '#7a8094' }}>{relativeDate(sale.sale_date)}</div>
            </div>

            {/* Acciones */}
            <div style={{ flex: '0 0 88px' }} className="flex items-center justify-end gap-1">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ border: '1px solid rgba(129,140,248,0.15)', color: '#9ca3b8' }}>
                    <ArrowRight size={14} />
                </span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ border: '1px solid rgba(129,140,248,0.15)', color: '#9ca3b8' }}>
                    <MoreHorizontal size={14} />
                </span>
            </div>
        </Link>
    )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className="px-3 py-1.5 rounded-full text-xs transition-all"
            style={
                active
                    ? {
                          background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.1))',
                          border: '1px solid rgba(56,189,248,0.35)',
                          color: '#dee2f2',
                      }
                    : {
                          background: 'transparent',
                          border: '1px solid rgba(129,140,248,0.18)',
                          color: '#9ca3b8',
                      }
            }
        >
            {children}
        </button>
    )
}

function EmptyState({ onNewSale, hasAny }: { onNewSale?: () => void; hasAny: boolean }) {
    return (
        <div className="px-6 py-14 flex flex-col items-center gap-2.5 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1.5"
                style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                <TrendingUp size={28} />
            </div>
            <h3 className="text-base font-semibold m-0" style={{ color: '#dee2f2' }}>
                {hasAny ? 'No hay ventas en este filtro' : 'Aún no has registrado ventas este periodo'}
            </h3>
            <p className="text-[13px] max-w-sm m-0" style={{ color: '#9ca3b8' }}>
                {hasAny ? 'Cambia el filtro para ver otras operaciones.' : 'Cuando cierres tu primera, aparecerá aquí con su barra de cobro y comisión.'}
            </p>
            {!hasAny && onNewSale && (
                <button
                    onClick={onNewSale}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                        color: '#fff',
                        boxShadow: '0 8px 24px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                >
                    <Plus size={14} />
                    Registrar primera venta
                </button>
            )}
        </div>
    )
}
