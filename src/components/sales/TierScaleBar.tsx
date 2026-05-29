'use client'

import { useState } from 'react'
import { Target, Info } from 'lucide-react'
import type { CommissionTier } from '@/lib/commission'

interface Props {
    tiers: CommissionTier[]
    cashCollected: number   // cents
    commission: number      // cents
    activeTierIdx: number
}

const SEGMENT_COLORS = [
    { from: '56,189,248', to: '96,165,250' },   // cyan → azure
    { from: '96,165,250', to: '129,140,248' },  // azure → indigo
    { from: '129,140,248', to: '167,139,250' }, // indigo → violet
    { from: '167,139,250', to: '244,114,182' }, // violet → pink (overflow)
]

const DOT_COLORS = ['#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']

function fmt(cents: number) {
    return `€${(cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

export function TierScaleBar({ tiers, cashCollected, commission, activeTierIdx }: Props) {
    const [hovered, setHovered] = useState<number | null>(null)
    if (tiers.length === 0) return null

    const motivationalMessage = (() => {
        if (tiers.length <= 1) return 'Tu progreso este mes'
        if (activeTierIdx >= tiers.length - 1) return '¡Este mes la estás rompiendo, vamos con toda!'
        if (activeTierIdx <= 0) return 'El mes apenas comienza, ¡vamos por más!'
        return 'Estás haciendo un buen trabajo, ¡sigue así!'
    })()

    // compute "max" for the bar — top of last tier or 1.5× last threshold if open-ended
    const lastTier = tiers[tiers.length - 1]
    const max = lastTier.min_amount > 0 ? lastTier.min_amount * 2 : 8000000
    const positionPct = Math.min(cashCollected / max, 1)

    const segments = tiers.map((t, i) => {
        const next = tiers[i + 1]
        const segFrom = t.min_amount
        const segTo = next ? next.min_amount : max
        const widthPct = ((segTo - segFrom) / max) * 100
        return { ...t, segFrom, segTo, widthPct }
    })

    return (
        <section className="p-6 rounded-2xl flex flex-col gap-4"
            style={{
                background: 'linear-gradient(180deg, rgba(27,31,43,0.5) 0%, rgba(14,19,30,0.5) 100%)',
                border: '1px solid rgba(129,140,248,0.14)',
            }}
        >
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="inline-flex items-center gap-1.5 mb-1.5"
                        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.3, color: '#38bdf8' }}>
                        <Target size={11} />
                        ESCALA DE COMISIÓN
                    </div>
                    <h2 className="text-lg font-semibold m-0" style={{ color: '#dee2f2', letterSpacing: -0.5 }}>
                        {motivationalMessage}
                    </h2>
                </div>
                <div className="flex items-stretch gap-3.5">
                    <div className="flex flex-col gap-0.5 min-w-[90px]">
                        <div className="text-[9.5px] tracking-[1px] uppercase" style={{ color: '#7a8094', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                            POSICIÓN
                        </div>
                        <div className="text-base font-semibold" style={{ color: '#dee2f2', letterSpacing: -0.3 }}>
                            {fmt(cashCollected)}
                        </div>
                    </div>
                    <div className="w-px self-stretch" style={{ background: 'rgba(129,140,248,0.18)' }} />
                    <div className="flex flex-col gap-0.5 min-w-[90px]">
                        <div className="text-[9.5px] tracking-[1px] uppercase" style={{ color: '#7a8094', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                            COMISIÓN
                        </div>
                        <div className="text-base font-semibold" style={{ color: '#dee2f2', letterSpacing: -0.3 }}>
                            {fmt(commission)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bar */}
            <div className="relative" style={{ padding: '36px 8px 56px' }}>
                <div className="relative flex h-7 rounded-full overflow-hidden"
                    style={{ background: 'rgba(129,140,248,0.06)', boxShadow: 'inset 0 0 0 1px rgba(129,140,248,0.12)' }}>
                    {segments.map((seg, i) => {
                        const isActive = i === activeTierIdx
                        const isPast = i < activeTierIdx
                        const c = SEGMENT_COLORS[i] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1]
                        return (
                            <div
                                key={i}
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(null)}
                                className="relative flex items-center justify-between transition-all"
                                style={{
                                    width: `${seg.widthPct}%`,
                                    padding: '0 14px',
                                    background: isPast
                                        ? `linear-gradient(90deg, rgba(${c.from},0.5), rgba(${c.to},0.55))`
                                        : isActive
                                            ? `linear-gradient(90deg, rgba(${c.from},0.35), rgba(${c.to},0.45))`
                                            : 'rgba(129,140,248,0.08)',
                                    borderLeft: i === 0 ? 'none' : '1px solid rgba(8,13,24,0.5)',
                                    opacity: hovered !== null && hovered !== i ? 0.5 : 1,
                                    cursor: 'help',
                                }}
                            >
                                <div className="flex items-center justify-between w-full"
                                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9.5, letterSpacing: 0.8, color: 'rgba(222,226,242,0.85)' }}>
                                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                                        {fmt(seg.segFrom)} – {i === segments.length - 1 ? '∞' : fmt(seg.segTo)}
                                    </span>
                                    <span className="font-bold ml-2" style={{ color: '#fff' }}>
                                        {seg.percentage}%
                                    </span>
                                </div>
                                {hovered === i && (
                                    <div className="absolute left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
                                        style={{
                                            top: -52,
                                            background: 'rgba(8,13,24,0.95)',
                                            border: '1px solid rgba(56,189,248,0.3)',
                                            boxShadow: '0 12px 30px -10px rgba(56,189,248,0.5)',
                                        }}>
                                        <div className="font-semibold" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1, color: '#38bdf8' }}>
                                            Tier {i + 1} · {seg.percentage}%
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: '#9ca3b8' }}>
                                            desde {fmt(seg.segFrom)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Position marker */}
                    <div className="absolute pointer-events-none z-10 -translate-x-1/2 transition-all"
                        style={{ top: -28, bottom: -28, left: `${positionPct * 100}%` }}>
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2"
                            style={{
                                background: 'linear-gradient(180deg, transparent 0%, #fff 30%, #fff 70%, transparent 100%)',
                                boxShadow: '0 0 14px #38bdf8',
                            }}
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                            style={{
                                background: '#fff',
                                boxShadow: '0 0 0 4px rgba(56,189,248,0.5), 0 0 18px rgba(56,189,248,0.8)',
                            }}
                        />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full px-2.5 py-1.5 rounded-lg whitespace-nowrap flex flex-col items-center gap-px"
                            style={{
                                background: 'rgba(8,13,24,0.92)',
                                border: '1px solid rgba(56,189,248,0.4)',
                                boxShadow: '0 10px 24px -8px rgba(56,189,248,0.5)',
                            }}>
                            <span className="font-semibold" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: 1.4, color: '#38bdf8' }}>
                                ESTÁS AQUÍ
                            </span>
                            <span className="text-[13px] font-bold" style={{ color: '#dee2f2', letterSpacing: -0.3 }}>
                                {fmt(cashCollected)}
                            </span>
                        </div>
                    </div>

                    {/* Threshold ticks */}
                    {segments.slice(1).map((s, i) => (
                        <div key={i} className="absolute pointer-events-none -translate-x-1/2"
                            style={{ top: -8, bottom: -8, left: `${(s.segFrom / max) * 100}%` }}>
                            <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2"
                                style={{ borderLeft: '1px dashed rgba(129,140,248,0.4)' }} />
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
                                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: '#7a8094' }}>
                                {fmt(s.segFrom)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 flex-wrap pt-3"
                style={{ borderTop: '1px dashed rgba(129,140,248,0.15)' }}>
                <div className="flex gap-3.5 flex-wrap">
                    {tiers.map((t, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: DOT_COLORS[i] ?? DOT_COLORS[0] }} />
                            <span className="text-[11.5px]" style={{ color: '#9ca3b8' }}>Tier {i + 1}</span>
                            <span className="text-[11px] font-semibold" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#dee2f2' }}>
                                {t.percentage}%
                            </span>
                        </div>
                    ))}
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: '#7a8094' }}>
                    <Info size={12} />
                    Tu comisión = cobrado total × % del tier alcanzado.
                </div>
            </div>
        </section>
    )
}
