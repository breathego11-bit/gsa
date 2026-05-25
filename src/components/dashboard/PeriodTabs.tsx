import Link from 'next/link'
import type { PeriodPreset } from '@/lib/sales-period'

type Preset = Extract<PeriodPreset, 'today' | 'week' | 'month' | 'year'>

const TABS: { value: Preset; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
]

interface Props {
    active: Preset
    basePath?: string
}

export function PeriodTabs({ active, basePath = '/admin' }: Props) {
    return (
        <div
            className="inline-flex p-[3px] rounded-[9px]"
            style={{
                background: 'rgba(20,25,38,0.6)',
                border: '1px solid rgba(129,140,248,0.15)',
            }}
        >
            {TABS.map((t) => {
                const isActive = t.value === active
                return (
                    <Link
                        key={t.value}
                        href={`${basePath}?period=${t.value}`}
                        scroll={false}
                        className="px-[14px] py-[7px] rounded-[7px] text-[12.5px] transition-colors"
                        style={{
                            background: isActive ? 'rgba(56,189,248,0.18)' : 'transparent',
                            color: isActive ? '#dee2f2' : '#9ca3b8',
                        }}
                    >
                        {t.label}
                    </Link>
                )
            })}
        </div>
    )
}
