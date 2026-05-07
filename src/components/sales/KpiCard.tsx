'use client'

import type { ReactNode } from 'react'

export type KpiAccent = 'cyan' | 'indigo' | 'violet' | 'azure'

const ACCENT_MAP: Record<KpiAccent, { bg: string; fg: string }> = {
    cyan: { bg: 'rgba(56,189,248,0.12)', fg: '#38bdf8' },
    indigo: { bg: 'rgba(129,140,248,0.12)', fg: '#818cf8' },
    violet: { bg: 'rgba(167,139,250,0.12)', fg: '#a78bfa' },
    azure: { bg: 'rgba(96,165,250,0.12)', fg: '#60a5fa' },
}

interface Props {
    icon: ReactNode
    label: string
    value: string | number
    sub?: string
    accent: KpiAccent
    progress?: number  // 0-1
    ring?: number      // 0-1, draws an SVG ring
}

export function KpiCard({ icon, label, value, sub, accent, progress, ring }: Props) {
    const a = ACCENT_MAP[accent]
    return (
        <div className="p-5 rounded-2xl flex flex-col gap-1 relative overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, rgba(27,31,43,0.6) 0%, rgba(14,19,30,0.6) 100%)',
                border: '1px solid rgba(129,140,248,0.14)',
            }}
        >
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: a.bg, color: a.fg }}>
                    {icon}
                </div>
                {ring !== undefined && (
                    <svg width="36" height="36" viewBox="0 0 36 36" className="ml-auto">
                        <circle cx="18" cy="18" r="14" stroke="rgba(129,140,248,0.15)" strokeWidth="3" fill="none" />
                        <circle cx="18" cy="18" r="14" stroke={a.fg} strokeWidth="3" fill="none"
                            strokeDasharray={`${Math.min(ring, 1) * 88} 88`} strokeLinecap="round"
                            transform="rotate(-90 18 18)"
                            style={{ filter: `drop-shadow(0 0 4px ${a.fg})` }}
                        />
                    </svg>
                )}
            </div>
            <div className="text-[10.5px] tracking-[1px] uppercase" style={{ color: '#7a8094', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                {label}
            </div>
            <div className="text-[28px] leading-tight font-semibold" style={{ color: '#dee2f2', letterSpacing: -1 }}>
                {value}
            </div>
            {sub && <div className="text-xs mt-1" style={{ color: '#9ca3b8' }}>{sub}</div>}
            {progress !== undefined && (
                <div className="mt-3 h-1 rounded overflow-hidden" style={{ background: 'rgba(129,140,248,0.1)' }}>
                    <div
                        className="h-full rounded transition-all"
                        style={{
                            width: `${Math.min(progress, 1) * 100}%`,
                            background: `linear-gradient(90deg, ${a.fg}, ${a.fg}99)`,
                        }}
                    />
                </div>
            )}
        </div>
    )
}
