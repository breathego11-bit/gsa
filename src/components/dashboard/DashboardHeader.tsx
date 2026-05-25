import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PeriodTabs } from './PeriodTabs'
import type { PeriodPreset } from '@/lib/sales-period'

type Preset = Extract<PeriodPreset, 'today' | 'week' | 'month' | 'year'>

interface Props {
    period: Preset
}

export function DashboardHeader({ period }: Props) {
    const monthLabel = new Date()
        .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        .toUpperCase()

    return (
        <header className="flex justify-between items-end gap-4 flex-wrap">
            <div>
                <div
                    className="inline-flex items-center gap-[7px] text-[10.5px] mb-2"
                    style={{
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                        letterSpacing: 1.4,
                        color: '#7a8094',
                    }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}
                    />
                    <span>ADMIN · GSA ACADEMY · {monthLabel}</span>
                </div>
                <h1
                    className="m-0 font-semibold text-on-surface"
                    style={{ fontSize: 32, letterSpacing: -1, lineHeight: 1.1 }}
                >
                    Dashboard
                </h1>
                <p className="mt-1.5 text-[13.5px] m-0" style={{ color: '#9ca3b8' }}>
                    Visión general del negocio · Cursos, ventas e instructores en tiempo real
                </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <PeriodTabs active={period} />
                <Link
                    href="/admin/courses"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold text-white transition-shadow hover:shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        boxShadow: '0 10px 24px -8px rgba(56,189,248,0.55)',
                    }}
                >
                    <Plus size={14} />
                    <span>Crear nuevo curso</span>
                </Link>
            </div>
        </header>
    )
}
