'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, SlidersHorizontal, DollarSign } from 'lucide-react'

const TABS = [
    { href: '/admin/coach/alumnos', label: 'Evaluaciones de alumnos', Icon: ClipboardList },
    { href: '/admin/coach/uso', label: 'Uso y costos', Icon: DollarSign },
    { href: '/admin/coach/ajustes', label: 'Ajustes del coach', Icon: SlidersHorizontal },
]

export function CoachAdminTabs() {
    const pathname = usePathname() ?? ''
    return (
        <div className="flex gap-1.5 mb-6 flex-wrap">
            {TABS.map((t) => {
                const active = pathname.startsWith(t.href)
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
                        style={{
                            background: active ? 'rgba(56,189,248,0.14)' : 'rgba(20,25,38,0.5)',
                            border: active ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(129,140,248,0.12)',
                            color: active ? '#fff' : '#9ca3b8',
                            textDecoration: 'none',
                        }}
                    >
                        <t.Icon size={14} style={{ color: active ? '#38bdf8' : '#7a8094' }} />
                        {t.label}
                    </Link>
                )
            })}
        </div>
    )
}
