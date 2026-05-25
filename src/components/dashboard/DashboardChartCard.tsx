'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export interface ChartPoint {
    label: string
    value: number
}

export type ChartValueKind = 'students' | 'currency'

interface Props {
    title: string
    subtitle: string
    data: ChartPoint[]
    color: string
    headerValue: string
    headerKey: string
    headerTrend?: string
    valueKind: ChartValueKind
}

const MONO: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
}

function formatAxis(v: number, kind: ChartValueKind): string {
    if (kind === 'currency') {
        return v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
    }
    return String(v)
}

function formatTooltipValue(v: number, kind: ChartValueKind): string {
    if (kind === 'currency') return `€${v.toLocaleString('es-ES')}`
    return `${v} ${v === 1 ? 'alumno' : 'alumnos'}`
}

function CustomTooltip({ active, payload, label, color, valueKind }: any) {
    if (!active || !payload?.length) return null
    const v: number = payload[0].value
    return (
        <div
            className="px-2.5 py-1.5 rounded-lg shadow-2xl"
            style={{
                background: 'rgba(8,13,24,0.95)',
                border: '1px solid rgba(129,140,248,0.25)',
            }}
        >
            <div
                className="uppercase text-[9.5px]"
                style={{ ...MONO, letterSpacing: 1, color: '#7a8094' }}
            >
                {label}
            </div>
            <div
                className="text-sm font-semibold mt-0.5"
                style={{ color: '#dee2f2', letterSpacing: -0.3 }}
            >
                {formatTooltipValue(v, valueKind)}
            </div>
            <div
                className="text-[9px] mt-0.5"
                style={{ ...MONO, letterSpacing: 1, color }}
            >
                {payload[0].name}
            </div>
        </div>
    )
}

export function DashboardChartCard({
    title,
    subtitle,
    data,
    color,
    headerValue,
    headerKey,
    headerTrend,
    valueKind,
}: Props) {
    const trendNeg = !!headerTrend && headerTrend.startsWith('-')
    const gradientId = `area-grad-${color.replace('#', '')}`

    return (
        <article
            className="p-5 rounded-2xl border border-outline-variant/15 flex flex-col gap-3.5"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
            }}
        >
            <div className="flex justify-between items-start gap-3">
                <div>
                    <h3
                        className="m-0 font-semibold"
                        style={{ fontSize: 15.5, color: '#dee2f2', letterSpacing: -0.3 }}
                    >
                        {title}
                    </h3>
                    <div
                        className="text-[11.5px] mt-1"
                        style={{ ...MONO, color: '#7a8094', letterSpacing: 0.2 }}
                    >
                        {subtitle}
                    </div>
                </div>
                <div className="text-right">
                    <div
                        className="font-semibold"
                        style={{ fontSize: 22, color: '#dee2f2', letterSpacing: -0.6 }}
                    >
                        {headerValue}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span
                            className="text-[9.5px] uppercase"
                            style={{ ...MONO, letterSpacing: 1.2, color: '#7a8094' }}
                        >
                            {headerKey}
                        </span>
                        {headerTrend && (
                            <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                    ...MONO,
                                    color,
                                    background: color + '14',
                                    border: `1px solid ${color}45`,
                                }}
                            >
                                {trendNeg ? <ArrowDown size={9} /> : <ArrowUp size={9} />}
                                {headerTrend}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#444653"
                            strokeOpacity={0.3}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8e909f', fontSize: 11, fontWeight: 600 }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8e909f', fontSize: 11 }}
                            tickFormatter={(v) => formatAxis(v, valueKind)}
                            allowDecimals={false}
                        />
                        <Tooltip
                            content={<CustomTooltip color={color} valueKind={valueKind} />}
                            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            name={headerKey}
                            stroke={color}
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            dot={{ fill: color, stroke: '#0e131e', strokeWidth: 2, r: 3 }}
                            activeDot={{ fill: color, stroke: '#fff', strokeWidth: 2, r: 5 }}
                            animationDuration={900}
                            animationEasing="ease-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </article>
    )
}
