'use client'

import { Calendar } from 'lucide-react'
import type { PeriodPreset } from '@/lib/sales-period'

const PRESETS: { value: PeriodPreset; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
    { value: 'custom', label: 'Custom' },
]

interface Props {
    value: PeriodPreset
    onChange: (p: PeriodPreset) => void
    customFrom?: string
    customTo?: string
    onCustomChange?: (from: string, to: string) => void
    rangeLabel: string
}

export function PeriodSelector({ value, onChange, customFrom, customTo, onCustomChange, rangeLabel }: Props) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl flex-wrap"
            style={{ background: 'rgba(27,31,43,0.5)', border: '1px solid rgba(129,140,248,0.12)' }}>
            <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ background: 'rgba(8,13,24,0.5)' }}>
                {PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => onChange(p.value)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={
                            value === p.value
                                ? {
                                      background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.1))',
                                      color: '#dee2f2',
                                      boxShadow: 'inset 0 0 0 1px rgba(56,189,248,0.25)',
                                  }
                                : { background: 'transparent', color: '#9ca3b8' }
                        }
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: '#9ca3b8' }}>
                <Calendar size={13} />
                {value === 'custom' && onCustomChange ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customFrom ?? ''}
                            onChange={(e) => onCustomChange(e.target.value, customTo ?? '')}
                            className="bg-transparent border rounded px-2 py-1"
                            style={{ borderColor: 'rgba(129,140,248,0.2)', color: '#dee2f2' }}
                        />
                        <span>–</span>
                        <input
                            type="date"
                            value={customTo ?? ''}
                            onChange={(e) => onCustomChange(customFrom ?? '', e.target.value)}
                            className="bg-transparent border rounded px-2 py-1"
                            style={{ borderColor: 'rgba(129,140,248,0.2)', color: '#dee2f2' }}
                        />
                    </div>
                ) : (
                    <span style={{ color: '#dee2f2', fontWeight: 500 }}>{rangeLabel}</span>
                )}
            </div>
        </div>
    )
}
