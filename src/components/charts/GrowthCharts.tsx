'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

interface ChartData {
    label: string
    students: number
    revenue: number
}

interface GrowthChartsProps {
    data: ChartData[]
    totalStudents: number
    totalRevenue: number
}

function CustomTooltip({ active, payload, label, type }: any) {
    if (!active || !payload?.length) return null
    const value = payload[0].value
    return (
        <div className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 shadow-2xl">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{label}</p>
            <p className="text-lg font-black text-on-surface">
                {type === 'revenue'
                    ? `${value.toLocaleString('es-ES')}€`
                    : `${value} alumnos`
                }
            </p>
        </div>
    )
}

export function GrowthCharts({ data, totalStudents, totalRevenue }: GrowthChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Students Growth */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-on-surface">Crecimiento de Alumnos</h3>
                        <p className="text-xs text-on-surface-variant">Últimos 6 meses</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-on-surface">{totalStudents}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">nuevos</p>
                    </div>
                </div>
                <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradStudents" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444653" strokeOpacity={0.3} vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8e909f', fontSize: 11, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8e909f', fontSize: 11 }}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip type="students" />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="students"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fill="url(#gradStudents)"
                                dot={{ fill: '#3b82f6', stroke: '#0e131e', strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 6 }}
                                animationDuration={1200}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Revenue Growth */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-on-surface">Crecimiento de Ingresos</h3>
                        <p className="text-xs text-on-surface-variant">Últimos 6 meses</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-on-surface">{totalRevenue.toLocaleString('es-ES')}€</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">total</p>
                    </div>
                </div>
                <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444653" strokeOpacity={0.3} vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8e909f', fontSize: 11, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8e909f', fontSize: 11 }}
                                tickFormatter={(v) => `${v}€`}
                            />
                            <Tooltip content={<CustomTooltip type="revenue" />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#gradRevenue)"
                                dot={{ fill: '#10b981', stroke: '#0e131e', strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 2, r: 6 }}
                                animationDuration={1200}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
