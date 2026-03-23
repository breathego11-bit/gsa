import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ProgressLineChart({ data = [] }) {
    // Generar un mock si no vienen datos reales para propósitos demostrativos
    const defaultData = data.length > 0 ? data : [
        { name: 'Lun', sales: 400 },
        { name: 'Mar', sales: 300 },
        { name: 'Mié', sales: 550 },
        { name: 'Jue', sales: 700 },
        { name: 'Vie', sales: 1200 },
        { name: 'Sáb', sales: 800 },
        { name: 'Dom', sales: 1500 }
    ];

    return (
        <div className="w-full h-full min-h-[300px] text-xs">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={defaultData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `€${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                        formatter={(value) => [`€${value}`, 'Revenue']}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#1e3a8a', stroke: '#3b82f6', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, className: 'animate-pulse' }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
