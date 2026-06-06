import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Sparkline } from './Sparkline'

interface ProgressInfo {
    ratio: number
    label: string
}

interface Props {
    icon: ReactNode
    tint: string
    label: string
    value: string
    trend?: string
    sub?: string
    spark?: number[]
    progress?: ProgressInfo
}

const MONO: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
}

export function DashboardKpi({ icon, tint, label, value, trend, sub, spark, progress }: Props) {
    const trendNegative = !!trend && trend.startsWith('-')

    return (
        <div
            className="p-5 rounded-2xl border border-outline-variant/15 relative overflow-hidden flex flex-col"
            style={{
                background: 'linear-gradient(180deg, rgb(20,25,38), rgb(14,19,30))',
            }}
        >
            <div className="flex justify-between items-center mb-2.5">
                <div
                    className="w-9 h-9 rounded-lg border flex items-center justify-center"
                    style={{
                        color: tint,
                        borderColor: tint + '40',
                        background: tint + '14',
                    }}
                >
                    {icon}
                </div>
                {trend && (
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{
                            ...MONO,
                            color: trendNegative ? '#f87171' : '#34d399',
                            background: trendNegative ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                        }}
                    >
                        {trendNegative ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                        <span>{trend}</span>
                    </span>
                )}
            </div>

            <div
                className="text-[10px] tracking-[1.2px] uppercase"
                style={{ ...MONO, color: '#7a8094' }}
            >
                {label}
            </div>
            <div
                className="text-[28px] font-semibold leading-tight mt-0.5"
                style={{ color: '#dee2f2', letterSpacing: -1 }}
            >
                {value}
            </div>
            {sub && (
                <div
                    className="text-[11.5px] mt-1"
                    style={{ ...MONO, color: '#9ca3b8', letterSpacing: 0.2 }}
                >
                    {sub}
                </div>
            )}

            {progress && (
                <div className="mt-2.5">
                    <div
                        className="h-1 rounded overflow-hidden"
                        style={{ background: 'rgba(129,140,248,0.1)' }}
                    >
                        <div
                            className="h-full rounded transition-all"
                            style={{
                                width: `${Math.min(Math.max(progress.ratio, 0), 1) * 100}%`,
                                background: `linear-gradient(90deg, ${tint}, #818cf8)`,
                            }}
                        />
                    </div>
                    <div
                        className="mt-1.5 text-[10px]"
                        style={{ ...MONO, color: '#7a8094', letterSpacing: 0.3 }}
                    >
                        {progress.label}
                    </div>
                </div>
            )}

            {spark && spark.length > 0 && <Sparkline data={spark} color={tint} />}
        </div>
    )
}
