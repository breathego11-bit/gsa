'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Check,
    Calendar,
    Search,
    Wallet,
    Coins,
    TrendingUp,
    Trophy,
    Layers,
    Eye,
    MoreHorizontal,
    Download,
    Settings as SettingsIcon,
    Sigma,
} from 'lucide-react'
import { getPeriodRange, formatPeriodLabel, type PeriodPreset } from '@/lib/sales-period'

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

interface ApiResponse {
    sales: AdminSaleDTO[]
    closers: CloserDTO[]
    metrics: {
        total_cash_collected: number
        total_contracted: number
        total_commissions: number
        sales_count: number
        sales_complete: number
        sales_partial: number
        top_closer: {
            id: string
            name: string
            last_name: string
            cash_collected: number
            sales_count: number
        } | null
    }
    period: { preset: string; from: string; to: string }
    tiers: { min_amount: number; percentage: number }[]
}

const PERIODS: { value: PeriodPreset; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
    { value: 'custom', label: 'Custom' },
]

// Stable color palette per closer (hash by id)
const CLOSER_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#818cf8']
function colorForCloser(id: string): string {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return CLOSER_COLORS[hash % CLOSER_COLORS.length]
}
function initials(first: string, last: string): string {
    return `${first.charAt(0) ?? ''}${last.charAt(0) ?? ''}`.toUpperCase() || '??'
}

function fmt(cents: number) {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function slugify(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function csvCell(value: string | number): string {
    const s = String(value ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCSV(sales: AdminSaleDTO[], periodFromISO: string, periodToISO: string, closerLabel: string | null) {
    const header = [
        'Fecha',
        'Closer',
        'Cliente',
        'Email',
        'Telefono',
        'Paquete',
        'Tipo de pago',
        'Total EUR',
        'Cobrado EUR',
        '% cobrado',
    ]
    const rows = sales.map((s) => {
        const pct = s.total_amount > 0 ? Math.round((s.cash_collected / s.total_amount) * 100) : 0
        return [
            s.sale_date.slice(0, 10),
            `${s.closer_name} ${s.closer_last_name}`.trim(),
            `${s.customer_first_name} ${s.customer_last_name}`.trim(),
            s.customer_email,
            s.customer_phone,
            s.package_name,
            s.payment_type === 'INSTALLMENTS' ? 'Cuotas' : 'Pago único',
            (s.total_amount / 100).toFixed(2),
            (s.cash_collected / 100).toFixed(2),
            pct,
        ]
    })
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const from = periodFromISO.slice(0, 10)
    const to = periodToISO.slice(0, 10)
    const closerSlug = closerLabel ? `-${slugify(closerLabel)}` : ''
    a.href = url
    a.download = `ventas${closerSlug}-${from}_${to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function relativeFromNow(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days === 0) return 'hoy'
    if (days === 1) return 'ayer'
    if (days < 7) return `hace ${days} días`
    if (days < 30) return `hace ${Math.floor(days / 7)} sem`
    return `hace ${Math.floor(days / 30)}m`
}

type SortKey = 'fecha' | 'closer' | 'cliente' | 'total' | 'cobrado'
type SortDir = 'asc' | 'desc'

export function AdminSalesClient() {
    const [period, setPeriod] = useState<PeriodPreset>('month')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [closerId, setCloserId] = useState<string>('all')
    const [closerOpen, setCloserOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('fecha')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const fetchData = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ period })
        if (period === 'custom') {
            if (customFrom) params.set('from', customFrom)
            if (customTo) params.set('to', customTo)
        }
        if (closerId !== 'all') params.set('closer_id', closerId)
        if (debouncedSearch) params.set('search', debouncedSearch)

        const res = await fetch(`/api/admin/sales?${params.toString()}`)
        if (res.ok) {
            const json: ApiResponse = await res.json()
            setData(json)
        }
        setLoading(false)
    }, [period, customFrom, customTo, closerId, debouncedSearch])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const range = getPeriodRange(period, customFrom, customTo)
    const rangeLabel = formatPeriodLabel(range)
    const closerObj = useMemo(() => {
        if (!data) return null
        if (closerId === 'all') return null
        return data.closers.find((c) => c.id === closerId) ?? null
    }, [data, closerId])

    const sortedSales = useMemo(() => {
        if (!data) return []
        const arr = [...data.sales]
        arr.sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case 'fecha':
                    cmp = new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
                    break
                case 'closer':
                    cmp = `${a.closer_name} ${a.closer_last_name}`.localeCompare(`${b.closer_name} ${b.closer_last_name}`)
                    break
                case 'cliente':
                    cmp = `${a.customer_first_name} ${a.customer_last_name}`.localeCompare(
                        `${b.customer_first_name} ${b.customer_last_name}`,
                    )
                    break
                case 'total':
                    cmp = a.total_amount - b.total_amount
                    break
                case 'cobrado':
                    cmp = a.cash_collected - b.cash_collected
                    break
            }
            return sortDir === 'asc' ? cmp : -cmp
        })
        return arr
    }, [data, sortKey, sortDir])

    function toggleSort(k: SortKey) {
        if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        else {
            setSortKey(k)
            setSortDir('desc')
        }
    }

    return (
        <div className="px-4 sm:px-6 md:px-8 py-7 pb-bottom-nav lg:pb-12 max-w-[1480px] mx-auto flex flex-col gap-5">
            {/* Breadcrumb */}
            <nav
                className="inline-flex items-center gap-2 text-xs"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    letterSpacing: 0.3,
                    color: '#5a6178',
                }}
            >
                <Link href="/admin" style={{ color: '#9ca3b8', textDecoration: 'none' }}>
                    Admin
                </Link>
                <ChevronRight size={11} />
                <span style={{ color: '#dee2f2' }}>Ventas del equipo</span>
            </nav>

            {/* Header */}
            <header className="flex justify-between items-end gap-5 flex-wrap">
                <div>
                    <div
                        className="inline-flex items-center gap-2 mb-1.5"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            fontSize: 10.5,
                            letterSpacing: 1.4,
                            color: '#fb923c',
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: '#fb923c', boxShadow: '0 0 8px #fb923c' }}
                        />
                        ADMIN · OPERACIÓN
                    </div>
                    <h1
                        className="text-3xl md:text-4xl font-semibold m-0 mb-1.5"
                        style={{ color: '#dee2f2', letterSpacing: -1, lineHeight: 1.1 }}
                    >
                        Ventas del equipo
                    </h1>
                    <p className="text-sm m-0 max-w-2xl" style={{ color: '#9ca3b8' }}>
                        Visión completa de los cierres del equipo. Filtra por closer y periodo para auditar
                        comisiones, ranking y evolución.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={!data || sortedSales.length === 0}
                        title={
                            !data || sortedSales.length === 0
                                ? 'No hay ventas en el periodo seleccionado'
                                : `Exportar ${sortedSales.length} venta${sortedSales.length === 1 ? '' : 's'} a CSV`
                        }
                        onClick={() => {
                            if (!data) return
                            const closerLabel =
                                closerId === 'all'
                                    ? null
                                    : (() => {
                                          const c = data.closers.find((x) => x.id === closerId)
                                          return c ? `${c.name} ${c.last_name}`.trim() : null
                                      })()
                            downloadCSV(sortedSales, data.period.from, data.period.to, closerLabel)
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[rgba(27,31,43,0.85)]"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#dee2f2',
                        }}
                    >
                        <Download size={14} />
                        Exportar CSV
                    </button>
                    <button
                        type="button"
                        disabled
                        title="Próximamente — configuración de tiers de comisión"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-not-allowed opacity-70"
                        style={{
                            background: 'linear-gradient(135deg, #fb923c, #f472b6)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 8px 22px -8px rgba(251,146,60,0.6)',
                        }}
                    >
                        <SettingsIcon size={14} />
                        Configurar tiers
                    </button>
                </div>
            </header>

            {/* Filters */}
            <section
                className="flex items-center gap-3 flex-wrap p-3 rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                    border: '1px solid rgba(129,140,248,0.14)',
                }}
            >
                {/* Closer dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setCloserOpen((v) => !v)}
                        className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
                        style={{
                            background: 'rgba(8,13,24,0.6)',
                            border: '1px solid rgba(129,140,248,0.2)',
                            color: '#dee2f2',
                        }}
                    >
                        {closerObj ? (
                            <CloserAvatar name={closerObj.name} last_name={closerObj.last_name} id={closerObj.id} />
                        ) : (
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                                style={{
                                    background: 'rgba(56,189,248,0.13)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56,189,248,0.4)',
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                }}
                            >
                                ··
                            </div>
                        )}
                        <div className="flex flex-col items-start gap-0.5">
                            <div
                                className="text-[9.5px] uppercase tracking-[1px]"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#7a8094',
                                }}
                            >
                                CLOSER
                            </div>
                            <div className="text-[13px]" style={{ color: '#dee2f2' }}>
                                {closerObj ? `${closerObj.name} ${closerObj.last_name}${closerObj.is_admin ? ' · Admin' : ''}` : 'Todos los closers'}
                            </div>
                        </div>
                        <ChevronDown size={13} />
                    </button>
                    {closerOpen && data && (
                        <>
                            <div
                                className="fixed inset-0 z-30"
                                onClick={() => setCloserOpen(false)}
                            />
                            <div
                                className="absolute z-40 mt-1.5 left-0 min-w-[240px] p-1.5 rounded-xl flex flex-col gap-0.5"
                                style={{
                                    top: '100%',
                                    background: 'rgba(20,25,38,0.98)',
                                    border: '1px solid rgba(129,140,248,0.2)',
                                    boxShadow: '0 20px 50px -10px rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                <DropdownItem
                                    onClick={() => {
                                        setCloserId('all')
                                        setCloserOpen(false)
                                    }}
                                    active={closerId === 'all'}
                                    avatar={
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                            style={{
                                                background: 'rgba(56,189,248,0.13)',
                                                color: '#38bdf8',
                                                border: '1px solid rgba(56,189,248,0.4)',
                                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            }}
                                        >
                                            ··
                                        </div>
                                    }
                                    label="Todos los closers"
                                />
                                {data.closers.map((c) => (
                                    <DropdownItem
                                        key={c.id}
                                        onClick={() => {
                                            setCloserId(c.id)
                                            setCloserOpen(false)
                                        }}
                                        active={c.id === closerId}
                                        avatar={<CloserAvatar name={c.name} last_name={c.last_name} id={c.id} />}
                                        label={`${c.name} ${c.last_name}${c.is_admin ? ' · Admin' : ''}`}
                                    />
                                ))}
                                {data.closers.length === 0 && (
                                    <div className="px-3 py-2 text-xs" style={{ color: '#7a8094' }}>
                                        No hay closers activos.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Period tabs */}
                <div
                    className="inline-flex p-0.5 rounded-xl gap-0.5"
                    style={{ background: 'rgba(8,13,24,0.6)', border: '1px solid rgba(129,140,248,0.2)' }}
                >
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={
                                period === p.value
                                    ? {
                                          background: 'rgba(56,189,248,0.18)',
                                          color: '#dee2f2',
                                      }
                                    : { background: 'transparent', color: '#9ca3b8' }
                            }
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Period range label / custom date pickers */}
                {period === 'custom' ? (
                    <div className="inline-flex items-center gap-2 text-xs" style={{ color: '#9ca3b8' }}>
                        <Calendar size={11} />
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="bg-transparent border rounded px-2 py-1"
                            style={{ borderColor: 'rgba(129,140,248,0.2)', color: '#dee2f2' }}
                        />
                        <span>–</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="bg-transparent border rounded px-2 py-1"
                            style={{ borderColor: 'rgba(129,140,248,0.2)', color: '#dee2f2' }}
                        />
                    </div>
                ) : (
                    <div
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                        style={{
                            background: 'rgba(129,140,248,0.08)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#9ca3b8',
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            letterSpacing: 0.3,
                        }}
                    >
                        <Calendar size={11} />
                        <span>{rangeLabel}</span>
                    </div>
                )}

                {/* Search */}
                <div
                    className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl min-w-[240px]"
                    style={{
                        background: 'rgba(8,13,24,0.6)',
                        border: '1px solid rgba(129,140,248,0.18)',
                        color: '#7a8094',
                    }}
                >
                    <Search size={13} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar cliente, paquete, ID…"
                        className="flex-1 bg-transparent border-none outline-none text-xs"
                        style={{ color: '#dee2f2' }}
                    />
                </div>
            </section>

            {/* KPIs */}
            {loading && !data ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-32 rounded-2xl animate-pulse"
                            style={{ background: 'rgba(27,31,43,0.4)' }}
                        />
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <KpiCard
                            kicker="COBRADO DEL EQUIPO"
                            value={fmt(data.metrics.total_cash_collected)}
                            icon={<Wallet size={14} />}
                            color="#38bdf8"
                            footer={
                                <>
                                    de {fmt(data.metrics.total_contracted)} contratados
                                    {data.metrics.total_contracted > 0 && (
                                        <span style={{ color: '#34d399' }}>
                                            {' · '}
                                            {Math.round(
                                                (data.metrics.total_cash_collected /
                                                    data.metrics.total_contracted) *
                                                    100,
                                            )}
                                            %
                                        </span>
                                    )}
                                </>
                            }
                            progress={
                                data.metrics.total_contracted > 0
                                    ? data.metrics.total_cash_collected / data.metrics.total_contracted
                                    : 0
                            }
                        />
                        <KpiCard
                            kicker="COMISIONES A PAGAR"
                            value={fmt(data.metrics.total_commissions)}
                            icon={<Coins size={14} />}
                            color="#a78bfa"
                            footer={
                                <>
                                    {data.metrics.sales_count} ventas · escala{' '}
                                    {data.tiers.map((t) => `${t.percentage}`).join(' / ')}%
                                </>
                            }
                        />
                        <KpiCard
                            kicker="VENTAS DEL PERIODO"
                            value={String(data.metrics.sales_count)}
                            icon={<TrendingUp size={14} />}
                            color="#34d399"
                            footer={
                                <>
                                    {data.metrics.sales_complete} completas · {data.metrics.sales_partial} en cobro
                                </>
                            }
                        />
                        {data.metrics.top_closer ? (
                            <KpiCard
                                kicker="CLOSER TOP DEL PERIODO"
                                value={
                                    <span className="flex items-center gap-2.5">
                                        <CloserAvatar
                                            name={data.metrics.top_closer.name}
                                            last_name={data.metrics.top_closer.last_name}
                                            id={data.metrics.top_closer.id}
                                            size={28}
                                        />
                                        <span className="text-[18px]">{data.metrics.top_closer.name}</span>
                                    </span>
                                }
                                icon={<Trophy size={14} />}
                                color="#fb923c"
                                footer={
                                    <>
                                        {fmt(data.metrics.top_closer.cash_collected)} ·{' '}
                                        {data.metrics.top_closer.sales_count} ventas
                                    </>
                                }
                                gold
                            />
                        ) : (
                            <KpiCard
                                kicker="CLOSER TOP DEL PERIODO"
                                value="—"
                                icon={<Trophy size={14} />}
                                color="#fb923c"
                                footer={<>Sin ventas en el periodo</>}
                                gold
                            />
                        )}
                    </div>

                    {/* Tabla */}
                    <section
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, rgba(27,31,43,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div
                            className="px-5 py-4 flex justify-between items-center flex-wrap gap-3"
                            style={{ borderBottom: '1px solid rgba(129,140,248,0.12)' }}
                        >
                            <div>
                                <div
                                    className="inline-flex items-center gap-1.5 mb-1"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        fontSize: 10,
                                        letterSpacing: 1.2,
                                        color: '#fb923c',
                                    }}
                                >
                                    <Layers size={11} />
                                    <span>
                                        {data.metrics.sales_count} VENTAS · ORDEN POR{' '}
                                        {sortKey.toUpperCase()}
                                    </span>
                                </div>
                                <h2
                                    className="text-base font-semibold m-0"
                                    style={{ color: '#dee2f2', letterSpacing: -0.4 }}
                                >
                                    Detalle de ventas
                                </h2>
                            </div>
                        </div>

                        {/*
                          * Vista de tarjetas para móvil/tablet.
                          * La tabla pide `minWidth: 1100`, así que a 375px se veía el 34% y
                          * había que arrastrar 725px para llegar a "Acciones". No se ocultan
                          * columnas con `hidden md:table-cell` porque el <tfoot> usa
                          * `colSpan={3}` y `colSpan={2}` fijos y quedarían descuadrados.
                          * Mismo patrón que CoursesTable.tsx.
                          */}
                        <div className="lg:hidden flex flex-col gap-2 px-3 pb-3">
                            {sortedSales.map((sale) => (
                                <SaleCard key={sale.id} sale={sale} />
                            ))}
                            {sortedSales.length > 0 && (
                                <div
                                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 rounded-xl mt-1"
                                    style={{
                                        background: 'rgba(8,13,24,0.5)',
                                        border: '1px solid rgba(129,140,248,0.18)',
                                    }}
                                >
                                    <span
                                        className="inline-flex items-center gap-2"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            fontSize: 10.5,
                                            letterSpacing: 1,
                                            color: '#dee2f2',
                                        }}
                                    >
                                        <Sigma size={12} />
                                        <span>TOTALES · {data.metrics.sales_count}</span>
                                    </span>
                                    <span className="flex flex-col items-end">
                                        <span
                                            className="text-sm font-semibold"
                                            style={{
                                                background: 'linear-gradient(135deg, #34d399, #38bdf8)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                                letterSpacing: -0.3,
                                            }}
                                        >
                                            {fmt(data.metrics.total_cash_collected)}
                                        </span>
                                        <span className="text-[10.5px]" style={{ color: '#7a8094' }}>
                                            de {fmt(data.metrics.total_contracted)} · comisiones{' '}
                                            <span style={{ color: '#a78bfa' }}>
                                                {fmt(data.metrics.total_commissions)}
                                            </span>
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto hidden lg:block">
                            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 1100 }}>
                                <thead>
                                    <tr>
                                        <SortableHead
                                            label="Closer"
                                            k="closer"
                                            sortKey={sortKey}
                                            sortDir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            label="Cliente"
                                            k="cliente"
                                            sortKey={sortKey}
                                            sortDir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <th style={th}>Paquete</th>
                                        <SortableHead
                                            label="Total"
                                            k="total"
                                            align="right"
                                            sortKey={sortKey}
                                            sortDir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            label="Cobrado"
                                            k="cobrado"
                                            align="right"
                                            sortKey={sortKey}
                                            sortDir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <SortableHead
                                            label="Fecha"
                                            k="fecha"
                                            sortKey={sortKey}
                                            sortDir={sortDir}
                                            onSort={toggleSort}
                                        />
                                        <th style={{ ...th, textAlign: 'right', width: 90 }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSales.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-12 text-center text-sm"
                                                style={{ color: '#7a8094' }}
                                            >
                                                {debouncedSearch
                                                    ? `Sin ventas que coincidan con "${debouncedSearch}".`
                                                    : 'Sin ventas en el periodo seleccionado.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedSales.map((s) => <SaleRow key={s.id} sale={s} />)
                                    )}
                                </tbody>
                                {sortedSales.length > 0 && (
                                    <tfoot>
                                        <tr
                                            style={{
                                                background: 'rgba(8,13,24,0.5)',
                                                borderTop: '1px solid rgba(129,140,248,0.18)',
                                            }}
                                        >
                                            <td colSpan={3} style={footCell}>
                                                <div
                                                    className="inline-flex items-center gap-2"
                                                    style={{
                                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                                        fontSize: 10.5,
                                                        letterSpacing: 1,
                                                        color: '#dee2f2',
                                                    }}
                                                >
                                                    <Sigma size={12} />
                                                    <span>TOTALES · {data.metrics.sales_count} ventas</span>
                                                </div>
                                            </td>
                                            <td style={{ ...footCell, textAlign: 'right' }}>
                                                <div
                                                    className="text-sm font-semibold"
                                                    style={{ color: '#dee2f2', letterSpacing: -0.3 }}
                                                >
                                                    {fmt(data.metrics.total_contracted)}
                                                </div>
                                            </td>
                                            <td style={{ ...footCell, textAlign: 'right' }}>
                                                <div
                                                    className="text-sm font-semibold"
                                                    style={{
                                                        background:
                                                            'linear-gradient(135deg, #34d399, #38bdf8)',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text',
                                                        letterSpacing: -0.3,
                                                    }}
                                                >
                                                    {fmt(data.metrics.total_cash_collected)}
                                                </div>
                                            </td>
                                            <td colSpan={2} style={footCell}>
                                                <div
                                                    className="inline-flex items-center gap-2"
                                                    style={{
                                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                                        fontSize: 10.5,
                                                        letterSpacing: 0.5,
                                                    }}
                                                >
                                                    <span style={{ color: '#7a8094' }}>Comisiones a pagar</span>
                                                    <span
                                                        style={{
                                                            color: '#a78bfa',
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            letterSpacing: -0.3,
                                                        }}
                                                    >
                                                        {fmt(data.metrics.total_commissions)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>
                </>
            ) : (
                <div className="text-sm py-12 text-center" style={{ color: '#9ca3b8' }}>
                    No se pudo cargar la información.
                </div>
            )}
        </div>
    )
}

/* ── Local components ──────────────────────────────────────── */

const th: React.CSSProperties = {
    padding: '11px 14px',
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 500,
    color: '#7a8094',
    borderBottom: '1px solid rgba(129,140,248,0.12)',
    textTransform: 'uppercase',
    textAlign: 'left',
}

const footCell: React.CSSProperties = {
    padding: '14px',
    fontSize: 12.5,
}

function CloserAvatar({
    name,
    last_name,
    id,
    size = 28,
}: {
    name: string
    last_name: string
    id: string
    size?: number
}) {
    const ini = initials(name, last_name)
    const c = colorForCloser(id)
    return (
        <div
            className="rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{
                width: size,
                height: size,
                background: `${c}22`,
                color: c,
                border: `1px solid ${c}40`,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: size <= 28 ? 10 : 11,
            }}
        >
            {ini}
        </div>
    )
}

function DropdownItem({
    active,
    avatar,
    label,
    onClick,
}: {
    active: boolean
    avatar: React.ReactNode
    label: string
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs cursor-pointer"
            style={{
                background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                border: 'none',
                color: '#dee2f2',
            }}
        >
            {avatar}
            <span className="flex-1">{label}</span>
            {active && <Check size={13} />}
        </button>
    )
}

function SortableHead({
    label,
    k,
    sortKey,
    sortDir,
    onSort,
    align = 'left',
}: {
    label: string
    k: SortKey
    sortKey: SortKey
    sortDir: SortDir
    onSort: (k: SortKey) => void
    align?: 'left' | 'right'
}) {
    const active = sortKey === k
    return (
        <th style={{ ...th, textAlign: align, cursor: 'pointer' }} onClick={() => onSort(k)}>
            <span
                className="inline-flex items-center gap-1"
                style={{ color: active ? '#dee2f2' : '#7a8094' }}
            >
                {label}
                {active && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
            </span>
        </th>
    )
}

function KpiCard({
    kicker,
    value,
    icon,
    color,
    footer,
    progress,
    gold,
}: {
    kicker: string
    value: React.ReactNode
    icon: React.ReactNode
    color: string
    footer?: React.ReactNode
    progress?: number
    gold?: boolean
}) {
    return (
        <div
            className="p-4 rounded-2xl flex flex-col gap-2.5"
            style={
                gold
                    ? {
                          background:
                              'linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(244,114,182,0.04) 100%), linear-gradient(180deg, rgba(27,31,43,0.7), rgba(14,19,30,0.7))',
                          border: '1px solid rgba(251,146,60,0.25)',
                      }
                    : {
                          background:
                              'linear-gradient(180deg, rgba(27,31,43,0.55), rgba(14,19,30,0.55))',
                          border: '1px solid rgba(129,140,248,0.14)',
                      }
            }
        >
            <div className="flex items-center justify-between">
                <div
                    className="text-[10px] uppercase tracking-[1.2px]"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#7a8094' }}
                >
                    {kicker}
                </div>
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                        background: `${color}18`,
                        color,
                        border: `1px solid ${color}38`,
                    }}
                >
                    {icon}
                </div>
            </div>
            <div
                className="text-2xl font-semibold flex items-center"
                style={{ color: '#dee2f2', letterSpacing: -0.8 }}
            >
                {value}
            </div>
            {progress != null && (
                <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(129,140,248,0.1)' }}>
                    <div
                        className="h-full rounded transition-all"
                        style={{
                            width: `${Math.min(progress, 1) * 100}%`,
                            background: `linear-gradient(90deg, ${color}, #818cf8)`,
                        }}
                    />
                </div>
            )}
            {footer && (
                <div
                    className="text-[11.5px]"
                    style={{
                        color: '#9ca3b8',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        letterSpacing: 0.3,
                    }}
                >
                    {footer}
                </div>
            )}
        </div>
    )
}

/**
 * Equivalente móvil de `SaleRow`. Muestra lo que de verdad se consulta desde el
 * teléfono (closer, cliente, cobrado/total y fecha) y enlaza al detalle, donde está
 * todo lo demás. La tabla completa sigue disponible desde `lg` hacia arriba.
 */
function SaleCard({ sale }: { sale: AdminSaleDTO }) {
    const pct = sale.total_amount > 0 ? sale.cash_collected / sale.total_amount : 0
    const completo = pct >= 1
    const fullName = `${sale.customer_first_name} ${sale.customer_last_name}`.trim()

    return (
        <Link
            href={`/admin/sales/${sale.id}`}
            className="flex flex-col gap-2.5 px-3.5 py-3 rounded-xl"
            style={{
                background: 'rgba(8,13,24,0.4)',
                border: '1px solid rgba(129,140,248,0.12)',
                textDecoration: 'none',
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <CloserAvatar
                        name={sale.closer_name}
                        last_name={sale.closer_last_name}
                        id={sale.closer_id}
                    />
                    <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#dee2f2' }}>
                            {fullName}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: '#7a8094' }}>
                            {sale.closer_name} {sale.closer_last_name}
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-sm font-semibold" style={{ color: '#dee2f2', letterSpacing: -0.2 }}>
                        {fmt(sale.cash_collected)}
                    </div>
                    <div className="text-[10.5px]" style={{ color: '#7a8094' }}>
                        de {fmt(sale.total_amount)}
                    </div>
                </div>
            </div>

            <div className="h-1 rounded overflow-hidden" style={{ background: 'rgba(129,140,248,0.1)' }}>
                <div
                    className="h-full rounded"
                    style={{
                        width: `${Math.min(pct, 1) * 100}%`,
                        background: completo
                            ? 'linear-gradient(90deg, #34d399, #38bdf8)'
                            : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    }}
                />
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: '#7a8094' }}>
                <span className="truncate">{sale.package_name}</span>
                <span className="shrink-0">{formatDate(sale.sale_date)}</span>
            </div>
        </Link>
    )
}

function SaleRow({ sale }: { sale: AdminSaleDTO }) {
    const pct = sale.total_amount > 0 ? sale.cash_collected / sale.total_amount : 0
    const completo = pct >= 1
    const fullName = `${sale.customer_first_name} ${sale.customer_last_name}`.trim()

    return (
        <tr style={{ borderBottom: '1px solid rgba(129,140,248,0.08)' }}>
            <td style={td}>
                <div className="flex items-center gap-2.5">
                    <CloserAvatar name={sale.closer_name} last_name={sale.closer_last_name} id={sale.closer_id} />
                    <div>
                        <div className="text-sm font-medium" style={{ color: '#dee2f2' }}>
                            {sale.closer_name}
                        </div>
                        <div className="text-[11px]" style={{ color: '#7a8094' }}>
                            {sale.closer_last_name}
                        </div>
                    </div>
                </div>
            </td>
            <td style={td}>
                <div className="text-sm font-medium" style={{ color: '#dee2f2' }}>
                    {fullName}
                </div>
                <div
                    className="text-[11px]"
                    style={{
                        color: '#7a8094',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                >
                    {sale.customer_email}
                </div>
            </td>
            <td style={td}>
                <div className="text-sm" style={{ color: '#dee2f2' }}>
                    {sale.package_name}
                </div>
                <div
                    className="text-[10.5px]"
                    style={{
                        color: '#5a6178',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        letterSpacing: 0.3,
                    }}
                >
                    {sale.id.slice(0, 12).toUpperCase()}
                </div>
            </td>
            <td style={{ ...td, textAlign: 'right' }}>
                <div className="text-sm" style={{ color: '#9ca3b8' }}>
                    {fmt(sale.total_amount)}
                </div>
            </td>
            <td style={{ ...td, textAlign: 'right' }}>
                <div className="flex flex-col gap-1.5 items-end">
                    <div className="flex items-center justify-end gap-1.5">
                        <span
                            className="text-sm font-semibold"
                            style={{ color: '#dee2f2' }}
                        >
                            {fmt(sale.cash_collected)}
                        </span>
                        <span
                            className="text-[10px] px-1.5 py-px rounded font-semibold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                background: completo ? 'rgba(52,211,153,0.14)' : 'rgba(56,189,248,0.12)',
                                color: completo ? '#34d399' : '#38bdf8',
                                border: `1px solid ${
                                    completo ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.3)'
                                }`,
                            }}
                        >
                            {Math.round(pct * 100)}%
                        </span>
                    </div>
                    <div
                        className="rounded overflow-hidden"
                        style={{ width: 90, height: 3, background: 'rgba(129,140,248,0.1)' }}
                    >
                        <div
                            className="h-full rounded transition-all"
                            style={{
                                width: `${pct * 100}%`,
                                background: completo
                                    ? 'linear-gradient(90deg, #34d399, #38bdf8)'
                                    : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                            }}
                        />
                    </div>
                </div>
            </td>
            <td style={td}>
                <div className="text-[12.5px]" style={{ color: '#dee2f2' }}>
                    {formatDate(sale.sale_date)}
                </div>
                <div
                    className="text-[10.5px] mt-0.5"
                    style={{
                        color: '#7a8094',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                >
                    {relativeFromNow(sale.sale_date)}
                </div>
            </td>
            <td style={{ ...td, textAlign: 'right' }}>
                <div className="inline-flex gap-1 justify-end">
                    <Link
                        href={`/admin/sales/${sale.id}`}
                        aria-label="Ver detalle"
                        className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.15)',
                            color: '#9ca3b8',
                            textDecoration: 'none',
                        }}
                    >
                        <Eye size={13} />
                    </Link>
                    <button
                        type="button"
                        aria-label="Más"
                        disabled
                        className="w-7 h-7 rounded-md flex items-center justify-center opacity-50 cursor-not-allowed"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.15)',
                            color: '#9ca3b8',
                        }}
                    >
                        <MoreHorizontal size={13} />
                    </button>
                </div>
            </td>
        </tr>
    )
}

const td: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 13,
    color: '#dee2f2',
    verticalAlign: 'middle',
}
