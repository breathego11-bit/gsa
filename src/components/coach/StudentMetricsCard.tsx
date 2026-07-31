'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, TrendingUp, TrendingDown, Minus, MessageSquare } from 'lucide-react'
import { scoreColor } from '@/lib/coach/scorecard'
import type { StudentMetrics } from '@/lib/coach/metrics'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function StudentMetricsCard({ student }: { student: StudentMetrics }) {
    const [open, setOpen] = useState(false)
    const hasEvals = student.evaluations > 0
    const avgRatio = student.average / 100

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.6), rgba(14,19,30,0.6))',
                border: '1px solid rgba(129,140,248,0.14)',
            }}
        >
            {/* Cabecera */}
            <div className="flex items-start gap-3 p-4 flex-wrap sm:flex-nowrap">
                <div
                    className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
                    style={{
                        background: hasEvals
                            ? 'linear-gradient(135deg, #38bdf8, #818cf8)'
                            : 'rgba(129,140,248,0.15)',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                >
                    {student.name
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || '··'}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold truncate" style={{ color: '#dee2f2' }}>
                        {student.name}
                    </div>
                    <div className="text-[11.5px] truncate" style={{ color: '#7a8094' }}>
                        {student.email}
                    </div>
                </div>

                {hasEvals ? (
                    <div className="text-right shrink-0">
                        <div
                            className="text-[22px] font-bold leading-none"
                            style={{ color: scoreColor(avgRatio) }}
                        >
                            {Math.round(student.average)}
                            <span className="text-[12px]" style={{ color: '#5a6178' }}>
                                /100
                            </span>
                        </div>
                        <div
                            className="text-[10.5px] mt-1 flex items-center gap-1 justify-end"
                            style={{ color: '#7a8094' }}
                        >
                            {student.evaluations}{' '}
                            {student.evaluations === 1 ? 'evaluación' : 'evaluaciones'}
                            {student.trend !== null && (
                                <span
                                    className="inline-flex items-center gap-0.5 ml-1"
                                    style={{
                                        color:
                                            student.trend > 0
                                                ? '#34d399'
                                                : student.trend < 0
                                                  ? '#f87171'
                                                  : '#7a8094',
                                    }}
                                    title="Diferencia entre su última evaluación y la primera"
                                >
                                    {student.trend > 0 ? (
                                        <TrendingUp size={11} />
                                    ) : student.trend < 0 ? (
                                        <TrendingDown size={11} />
                                    ) : (
                                        <Minus size={11} />
                                    )}
                                    {student.trend > 0 ? '+' : ''}
                                    {student.trend}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span
                        className="shrink-0 text-[10.5px] px-2.5 py-1 rounded-full"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            background: 'rgba(129,140,248,0.1)',
                            border: '1px solid rgba(129,140,248,0.2)',
                            color: '#7a8094',
                        }}
                    >
                        SIN EVALUAR
                    </span>
                )}
            </div>

            {/* Skills */}
            {hasEvals && (
                <div className="px-4 pb-4">
                    <div
                        className="text-[9.5px] mb-2.5"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            letterSpacing: 1.3,
                            color: '#5a6178',
                        }}
                    >
                        APLICACIÓN DEL MÉTODO POR FASE
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                        {student.skills.map((s) => (
                            <div key={s.label} className="flex items-center gap-2.5">
                                <span
                                    className="text-[11.5px] w-28 sm:w-32 shrink-0 truncate"
                                    style={{ color: '#aab3c7' }}
                                >
                                    {s.label}
                                </span>
                                <div
                                    className="flex-1 h-1.5 rounded-full overflow-hidden min-w-0"
                                    style={{ background: 'rgba(129,140,248,0.12)' }}
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: pct(s.pct),
                                            background: scoreColor(s.pct),
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-[11px] w-9 text-right shrink-0"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        color: '#c7cede',
                                    }}
                                >
                                    {pct(s.pct)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {student.strongest && student.weakest && (
                        <div className="flex gap-2 mt-3.5 flex-wrap">
                            <Highlight
                                kicker="PUNTO FUERTE"
                                label={student.strongest.label}
                                value={pct(student.strongest.pct)}
                                color="#34d399"
                            />
                            <Highlight
                                kicker="A TRABAJAR"
                                label={student.weakest.label}
                                value={pct(student.weakest.pct)}
                                color="#f87171"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Conversaciones */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-[12px] cursor-pointer"
                style={{
                    background: 'rgba(8,13,24,0.4)',
                    borderTop: '1px solid rgba(129,140,248,0.1)',
                    color: '#9ca3b8',
                }}
            >
                <span className="flex items-center gap-2">
                    <MessageSquare size={13} />
                    {student.conversations.length}{' '}
                    {student.conversations.length === 1 ? 'conversación' : 'conversaciones'}
                </span>
                <ChevronDown
                    size={14}
                    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                />
            </button>

            {open && (
                <div className="flex flex-col" style={{ background: 'rgba(8,13,24,0.25)' }}>
                    {student.conversations.map((c) => (
                        <Link
                            key={c.id}
                            href={`/admin/coach/alumnos/${c.id}`}
                            className="flex items-center gap-3 px-4 py-2.5"
                            style={{
                                borderTop: '1px solid rgba(129,140,248,0.07)',
                                textDecoration: 'none',
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: c.scored ? '#34d399' : '#5a6178' }}
                                title={c.scored ? 'Con evaluación puntuada' : 'Solo conversación'}
                            />
                            <span
                                className="flex-1 min-w-0 text-[12.5px] truncate"
                                style={{ color: '#c7cede' }}
                            >
                                {c.title}
                            </span>
                            <span className="text-[11px] shrink-0" style={{ color: '#5a6178' }}>
                                {new Date(c.updated_at).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                })}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

function Highlight({
    kicker,
    label,
    value,
    color,
}: {
    kicker: string
    label: string
    value: string
    color: string
}) {
    return (
        <div
            className="flex-1 min-w-[150px] px-3 py-2 rounded-xl"
            style={{ background: `${color}14`, border: `1px solid ${color}40` }}
        >
            <div
                className="text-[9px] mb-0.5"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    letterSpacing: 1.2,
                    color,
                }}
            >
                {kicker}
            </div>
            <div className="text-[12.5px] truncate" style={{ color: '#dee2f2' }}>
                {label} · <span style={{ color }}>{value}</span>
            </div>
        </div>
    )
}
