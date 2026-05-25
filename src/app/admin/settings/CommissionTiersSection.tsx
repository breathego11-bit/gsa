'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    Coins,
    BookOpen,
    Plus,
    X as XIcon,
    AlertTriangle,
    Target,
    Check,
    ChevronDown,
} from 'lucide-react'
import type { CommissionTier } from '@/lib/commission'

interface Props {
    initialTiers: CommissionTier[]
}

// Each tier in UI gets a stable internal key so we can edit/remove without depending on min_amount
type RowState = { key: string; from: number; pct: number }

function toRows(tiers: CommissionTier[]): RowState[] {
    return tiers
        .slice()
        .sort((a, b) => a.min_amount - b.min_amount)
        .map((t, i) => ({
            key: `t-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            from: t.min_amount,
            pct: t.percentage,
        }))
}

function rowsEqual(a: RowState[], b: RowState[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i].from !== b[i].from || a[i].pct !== b[i].pct) return false
    }
    return true
}

function fmtEur(cents: number): string {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}
function fmtEurK(cents: number): string {
    return `€${Math.round(cents / 100 / 1000)}k`
}

const TIER_BADGE_COLORS = [
    { bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.4)', color: '#38bdf8' },
    { bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.4)', color: '#818cf8' },
    { bg: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.4)', color: '#f472b6' },
    { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', color: '#fb923c' },
    { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.4)', color: '#facc15' },
    { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)', color: '#34d399' },
]
const SCALE_BAND_COLORS = [
    'linear-gradient(180deg, rgba(56,189,248,0.28),  rgba(56,189,248,0.10))',
    'linear-gradient(180deg, rgba(129,140,248,0.30), rgba(129,140,248,0.10))',
    'linear-gradient(180deg, rgba(244,114,182,0.30), rgba(244,114,182,0.10))',
    'linear-gradient(180deg, rgba(251,146,60,0.32),  rgba(251,146,60,0.10))',
    'linear-gradient(180deg, rgba(250,204,21,0.32),  rgba(250,204,21,0.10))',
    'linear-gradient(180deg, rgba(52,211,153,0.30),  rgba(52,211,153,0.10))',
]

export function CommissionTiersSection({ initialTiers }: Props) {
    const [savedRows, setSavedRows] = useState<RowState[]>(() => toRows(initialTiers))
    const [rows, setRows] = useState<RowState[]>(() => toRows(initialTiers))
    const [previewEur, setPreviewEur] = useState(30000)
    const [saving, setSaving] = useState(false)
    const [savedFlash, setSavedFlash] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const dirty = !rowsEqual(rows, savedRows)

    // Per-row error: must be greater than the previous row's `from`
    const rowErrors: (string | null)[] = useMemo(
        () =>
            rows.map((r, i) => {
                if (i === 0) return null
                if (!Number.isFinite(r.from)) return 'Valor inválido'
                if (r.from <= rows[i - 1].from) return 'Debe ser mayor que el tier anterior'
                return null
            }),
        [rows],
    )
    const hasRowErrors = rowErrors.some(Boolean)

    const sortedRows = useMemo(() => [...rows].sort((a, b) => a.from - b.from), [rows])
    const max = useMemo(() => {
        const top = sortedRows[sortedRows.length - 1]?.from ?? 100000_00
        return Math.max(top, 100000_00) * 1.4
    }, [sortedRows])

    function updateRow(key: string, patch: Partial<RowState>) {
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    }
    function addRow() {
        const last = rows[rows.length - 1]
        const nextFrom = last ? last.from + 25000_00 : 0 // +€25.000
        const nextPct = last ? Math.min(100, last.pct + 2) : 9
        setRows((prev) => [
            ...prev,
            {
                key: `t-${prev.length}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                from: nextFrom,
                pct: nextPct,
            },
        ])
    }
    function removeRow(key: string) {
        if (rows.length <= 1) return
        setRows((prev) => prev.filter((r) => r.key !== key))
    }
    function discard() {
        setRows(savedRows)
        setError(null)
    }

    async function save() {
        if (hasRowErrors || saving) return
        setSaving(true)
        setError(null)
        try {
            const payload = {
                tiers: rows
                    .slice()
                    .sort((a, b) => a.from - b.from)
                    .map((r) => ({ min_amount: r.from, percentage: r.pct })),
            }
            const res = await fetch('/api/admin/commission-tiers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Error al guardar')
            }
            const data = (await res.json()) as { tiers: CommissionTier[] }
            const fresh = toRows(data.tiers)
            setSavedRows(fresh)
            setRows(fresh)
            setSavedFlash(true)
            setTimeout(() => setSavedFlash(false), 2200)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // Preview commission calc
    const previewCents = previewEur * 100
    const previewResult = useMemo(() => {
        const sorted = sortedRows
        let pct = sorted[0]?.pct ?? 0
        for (const t of sorted) if (previewCents >= t.from) pct = t.pct
        return { pct, totalCents: Math.round((previewCents * pct) / 100) }
    }, [sortedRows, previewCents])

    const pointerLeft = Math.min(100, (previewCents / max) * 100)

    return (
        <>
            <section
                className="rounded-2xl p-6 flex flex-col gap-5"
                style={{
                    background: 'linear-gradient(180deg, rgba(20,25,38,0.6), rgba(14,19,30,0.6))',
                    border: '1px solid rgba(129,140,248,0.12)',
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                background:
                                    'linear-gradient(135deg, rgba(251,146,60,0.18), rgba(244,114,182,0.12))',
                                border: '1px solid rgba(251,146,60,0.3)',
                                color: '#fb923c',
                            }}
                        >
                            <Coins size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold m-0 mb-1" style={{ color: '#dee2f2', letterSpacing: -0.4 }}>
                                Escala de comisiones
                            </h2>
                            <p className="text-[13px] m-0 max-w-lg" style={{ color: '#9ca3b8', lineHeight: 1.5 }}>
                                Define los tiers que aplican según el cobrado acumulado de cada closer en el periodo.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled
                        title="Próximamente"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-not-allowed opacity-60"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#9ca3b8',
                        }}
                    >
                        <BookOpen size={12} />
                        Cómo funcionan los tiers
                    </button>
                </div>

                {/* Visual scale bar */}
                <ScaleBar tiers={sortedRows} pointerLeft={pointerLeft} previewCents={previewCents} max={max} />

                {/* Tiers list */}
                <div className="flex flex-col gap-1.5">
                    <div
                        className="grid items-center gap-2.5 px-3.5 pb-1"
                        style={{
                            gridTemplateColumns: '50px 1.5fr 0.9fr 1fr 32px',
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            fontSize: 9.5,
                            letterSpacing: 1.2,
                            color: '#5a6178',
                        }}
                    >
                        <span>TIER</span>
                        <span>DESDE</span>
                        <span>HASTA</span>
                        <span>PORCENTAJE</span>
                        <span />
                    </div>

                    {rows.map((r, i) => {
                        const next = rows[i + 1]
                        const err = rowErrors[i]
                        const colors = TIER_BADGE_COLORS[i % TIER_BADGE_COLORS.length]
                        return (
                            <div
                                key={r.key}
                                className="grid items-center gap-2.5 px-3.5 py-3 rounded-xl"
                                style={{
                                    gridTemplateColumns: '50px 1.5fr 0.9fr 1fr 32px',
                                    background: err ? 'rgba(239,68,68,0.05)' : 'rgba(8,13,24,0.4)',
                                    border: `1px solid ${err ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.12)'}`,
                                    minWidth: 0,
                                }}
                            >
                                <div className="flex flex-col gap-1 min-w-0 justify-center">
                                    <span
                                        className="inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-semibold"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            background: colors.bg,
                                            color: colors.color,
                                            border: `1px solid ${colors.border}`,
                                            letterSpacing: 0.6,
                                            width: 'fit-content',
                                        }}
                                    >
                                        T{i + 1}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 min-w-0 justify-center">
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(8,13,24,0.6)',
                                            border: '1px solid rgba(129,140,248,0.18)',
                                        }}
                                    >
                                        <span
                                            className="font-semibold text-[13px]"
                                            style={{
                                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                                color: '#38bdf8',
                                            }}
                                        >
                                            €
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={100}
                                            value={(r.from / 100).toString()}
                                            onChange={(e) => {
                                                const eur = parseFloat(e.target.value || '0')
                                                updateRow(r.key, {
                                                    from: Number.isFinite(eur) ? Math.round(eur * 100) : 0,
                                                })
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none text-[13px] min-w-0"
                                            style={{ color: '#dee2f2' }}
                                            disabled={i === 0}
                                            title={i === 0 ? 'El primer tier siempre empieza en €0' : undefined}
                                        />
                                    </div>
                                    {err && (
                                        <div
                                            className="inline-flex items-center gap-1 text-[11px]"
                                            style={{
                                                color: '#fca5a5',
                                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            }}
                                        >
                                            <AlertTriangle size={11} />
                                            <span>{err}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 min-w-0 justify-center">
                                    <div
                                        className="px-3 py-2 rounded-lg text-[12.5px]"
                                        style={{
                                            background: 'rgba(8,13,24,0.4)',
                                            border: '1px dashed rgba(129,140,248,0.18)',
                                            color: '#7a8094',
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        }}
                                    >
                                        {next ? `< ${fmtEur(next.from)}` : '∞ sin límite'}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 min-w-0 justify-center">
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(8,13,24,0.6)',
                                            border: '1px solid rgba(129,140,248,0.18)',
                                        }}
                                    >
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            value={r.pct.toString()}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value || '0')
                                                updateRow(r.key, { pct: Number.isFinite(v) ? v : 0 })
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none text-[13px] min-w-0"
                                            style={{ color: '#dee2f2' }}
                                        />
                                        <span
                                            className="font-semibold text-[13px]"
                                            style={{
                                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                                color: '#fb923c',
                                            }}
                                        >
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end items-center">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(r.key)}
                                        disabled={rows.length <= 1}
                                        aria-label="Eliminar tier"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'rgba(27,31,43,0.5)',
                                            border: '1px solid rgba(239,68,68,0.18)',
                                            color: '#f87171',
                                        }}
                                    >
                                        <XIcon size={13} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center justify-center gap-1.5 mt-1 px-3.5 py-2.5 rounded-xl text-[13px]"
                        style={{
                            background: 'transparent',
                            border: '1px dashed rgba(129,140,248,0.25)',
                            color: '#9ca3b8',
                        }}
                    >
                        <Plus size={13} />
                        Agregar tier
                    </button>
                </div>

                {/* Global error banner */}
                {(hasRowErrors || error) && (
                    <div
                        className="flex items-start gap-3 p-3.5 rounded-xl"
                        style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171',
                        }}
                    >
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <div className="text-[12.5px]">
                            {hasRowErrors ? (
                                <>
                                    <strong className="font-semibold" style={{ color: '#fca5a5' }}>
                                        Los umbrales deben ir en orden ascendente
                                    </strong>
                                    <div className="mt-0.5" style={{ color: '#9ca3b8', lineHeight: 1.5 }}>
                                        Cada tier debe tener un &quot;Desde €&quot; mayor que el anterior. Corrige los rows
                                        marcados en rojo para guardar.
                                    </div>
                                </>
                            ) : (
                                <>
                                    <strong className="font-semibold" style={{ color: '#fca5a5' }}>
                                        {error}
                                    </strong>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview / simulator */}
                <div
                    className="rounded-xl p-5 flex flex-col gap-3.5"
                    style={{
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.05), rgba(129,140,248,0.04))',
                        border: '1px solid rgba(56,189,248,0.2)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                                background: 'rgba(56,189,248,0.14)',
                                border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8',
                            }}
                        >
                            <Target size={14} />
                        </div>
                        <div>
                            <div
                                className="text-[9.5px] tracking-[1.4px]"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#38bdf8',
                                }}
                            >
                                SIMULADOR
                            </div>
                            <div className="text-[14px] font-semibold mt-0.5" style={{ color: '#dee2f2' }}>
                                Calcula con tu escala
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="flex justify-between items-baseline text-[12px]" style={{ color: '#9ca3b8' }}>
                            <span>Venta acumulada</span>
                            <span
                                className="text-[16px] font-semibold"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#dee2f2',
                                }}
                            >
                                €{previewEur.toLocaleString('es-ES')}
                            </span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={150000}
                            step={500}
                            value={previewEur}
                            onChange={(e) => setPreviewEur(Number(e.target.value))}
                            className="w-full h-1.5 rounded cursor-pointer outline-none"
                            style={{
                                appearance: 'none',
                                background:
                                    'linear-gradient(90deg, rgba(56,189,248,0.4), rgba(129,140,248,0.4), rgba(244,114,182,0.4), rgba(251,146,60,0.4))',
                            }}
                        />
                        <div
                            className="flex justify-between text-[9.5px]"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                color: '#5a6178',
                            }}
                        >
                            {[0, 25000, 50000, 75000, 100000, 125000, 150000].map((v) => (
                                <span key={v}>€{v / 1000}k</span>
                            ))}
                        </div>
                    </div>
                    <div
                        className="p-3 rounded-lg text-[13.5px]"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.15)',
                            color: '#dee2f2',
                            lineHeight: 1.7,
                        }}
                    >
                        Con esta escala, una venta acumulada de{' '}
                        <strong style={{ color: '#dee2f2', fontWeight: 600 }}>
                            €{previewEur.toLocaleString('es-ES')}
                        </strong>{' '}
                        paga{' '}
                        <strong
                            className="font-semibold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                color: '#fb923c',
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: 'rgba(251,146,60,0.12)',
                                border: '1px solid rgba(251,146,60,0.3)',
                            }}
                        >
                            {previewResult.pct}%
                        </strong>{' '}
                        ={' '}
                        <strong
                            className="font-bold"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            €
                            {(previewResult.totalCents / 100).toLocaleString('es-ES', {
                                maximumFractionDigits: 2,
                            })}
                        </strong>
                    </div>
                </div>
            </section>

            {/* Sticky save bar (overlay, only when dirty) */}
            <div
                className="fixed left-0 right-0 z-40 pointer-events-none transition-all"
                style={{
                    bottom: 16,
                    transform: dirty ? 'translateY(0)' : 'translateY(120%)',
                    opacity: dirty ? 1 : 0,
                }}
            >
                <div
                    className="max-w-2xl mx-auto px-4 pointer-events-auto"
                    style={{ pointerEvents: dirty ? 'auto' : 'none' }}
                >
                    <div
                        className="flex items-center gap-3.5 p-3.5 rounded-xl flex-wrap"
                        style={{
                            background: 'rgba(20,25,38,0.95)',
                            border: '1px solid rgba(251,146,60,0.3)',
                            backdropFilter: 'blur(16px)',
                            boxShadow: '0 16px 40px -12px rgba(0,0,0,0.6)',
                        }}
                    >
                        <span
                            className="inline-flex items-center gap-2 text-[13px]"
                            style={{ color: '#dee2f2' }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: '#fb923c', boxShadow: '0 0 10px #fb923c' }}
                            />
                            Tienes cambios sin guardar en la escala de comisiones
                        </span>
                        <div className="flex gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={discard}
                                disabled={saving}
                                className="px-3.5 py-2 rounded-lg text-[13px]"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(129,140,248,0.2)',
                                    color: '#9ca3b8',
                                }}
                            >
                                Descartar
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={hasRowErrors || saving || savedFlash}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: savedFlash
                                        ? 'linear-gradient(135deg, #34d399, #38bdf8)'
                                        : 'linear-gradient(135deg, #fb923c, #f472b6)',
                                    border: 'none',
                                    color: '#fff',
                                    boxShadow: savedFlash
                                        ? '0 8px 22px -8px rgba(52,211,153,0.6)'
                                        : '0 8px 22px -8px rgba(251,146,60,0.6)',
                                    minWidth: 160,
                                }}
                            >
                                {savedFlash ? (
                                    <>
                                        <Check size={14} />
                                        Guardado
                                    </>
                                ) : saving ? (
                                    <>
                                        <Spinner />
                                        Guardando…
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        Guardar cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

function ScaleBar({
    tiers,
    pointerLeft,
    previewCents,
    max,
}: {
    tiers: RowState[]
    pointerLeft: number
    previewCents: number
    max: number
}) {
    return (
        <div className="px-1 pb-5">
            <div
                className="relative rounded-xl overflow-hidden"
                style={{
                    height: 76,
                    background: 'rgba(8,13,24,0.5)',
                    border: '1px solid rgba(129,140,248,0.12)',
                }}
            >
                {tiers.map((t, i) => {
                    const next = tiers[i + 1]
                    const left = (t.from / max) * 100
                    const right = next ? (next.from / max) * 100 : 100
                    const width = right - left
                    return (
                        <div
                            key={t.key}
                            className="absolute top-0 bottom-0 flex flex-col items-center justify-center transition-all"
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                background: SCALE_BAND_COLORS[i % SCALE_BAND_COLORS.length],
                                borderRight: '1px solid rgba(8,13,24,0.7)',
                            }}
                        >
                            <div
                                className="text-[16px] font-semibold"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#dee2f2',
                                }}
                            >
                                {t.pct}%
                            </div>
                            <div
                                className="text-[10px] mt-0.5"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#9ca3b8',
                                    letterSpacing: 0.3,
                                }}
                            >
                                {fmtEurK(t.from)}{next ? ` – ${fmtEurK(next.from)}` : '+'}
                            </div>
                        </div>
                    )
                })}

                {/* Pointer */}
                <div
                    className="absolute pointer-events-none transition-all"
                    style={{
                        left: `${pointerLeft}%`,
                        top: -10,
                        bottom: -10,
                        width: 0,
                    }}
                >
                    <div
                        className="absolute top-0 bottom-0"
                        style={{
                            left: -1,
                            width: 2,
                            background: '#facc15',
                            boxShadow: '0 0 12px #facc15',
                        }}
                    />
                    <div
                        className="absolute"
                        style={{
                            top: -4,
                            left: -8,
                            width: 16,
                            height: 16,
                            color: '#facc15',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ChevronDown size={10} />
                    </div>
                </div>
            </div>
            <div
                className="flex justify-end mt-1.5 text-[10.5px]"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    color: '#7a8094',
                    letterSpacing: 0.3,
                }}
            >
                Cursor en {fmtEur(previewCents)}
            </div>
        </div>
    )
}

function Spinner() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            style={{ animation: 'spin 0.8s linear infinite' }}
        >
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeOpacity="0.25"
            />
            <path
                d="M21 12a9 9 0 0 0-9-9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    )
}
