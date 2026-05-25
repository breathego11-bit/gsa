'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings as SettingsIcon, Coins, User as UserIcon, ChevronRight, type LucideIcon } from 'lucide-react'
import type { PricingConfig } from '@/lib/stripe'
import type { CommissionTier } from '@/lib/commission'
import { PricingSection } from './PricingSection'
import { CommissionTiersSection } from './CommissionTiersSection'
import { ProfileClient } from '@/components/profile/ProfileClient'

interface UserData {
    id: string
    name: string
    last_name: string
    username: string
    email: string
    phone: string | null
    profile_image: string | null
    bio: string | null
    title: string | null
    location: string | null
    role: string
    created_at: Date
}

interface AdminStats {
    publishedCourses: number
    totalStudents: number
    totalLessons: number
    mostPopularCourse: { title: string; enrollments: number } | null
}

interface Props {
    initialPricing: PricingConfig
    initialTiers: CommissionTier[]
    user: UserData
    adminStats: AdminStats
}

type TabId = 'general' | 'commissions' | 'profile'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'commissions', label: 'Comisiones', icon: Coins },
    { id: 'profile', label: 'Mi perfil', icon: UserIcon },
]

export function SettingsClient({ initialPricing, initialTiers, user, adminStats }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab') as TabId | null
    const [activeTab, setActiveTab] = useState<TabId>(
        tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'general',
    )

    // Sync tab to URL
    useEffect(() => {
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        params.set('tab', activeTab)
        router.replace(`/admin/settings?${params.toString()}`, { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const activeTabInfo = TABS.find((t) => t.id === activeTab) ?? TABS[0]

    return (
        <div className="px-6 md:px-7 py-6 pb-24 lg:pb-12 max-w-[1440px] mx-auto flex flex-col gap-5">
            {/* Page header */}
            <header className="flex justify-between items-end gap-5 flex-wrap">
                <div>
                    <div
                        className="inline-flex items-center gap-2 mb-1.5"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            fontSize: 11,
                            letterSpacing: 0.5,
                            color: '#7a8094',
                        }}
                    >
                        <span>Admin</span>
                        <ChevronRight size={11} />
                        <span>Settings</span>
                        <ChevronRight size={11} />
                        <span style={{ color: '#fb923c' }}>{activeTabInfo.label}</span>
                    </div>
                    <h1
                        className="text-2xl md:text-3xl font-semibold m-0 mb-1"
                        style={{ color: '#dee2f2', letterSpacing: -0.8 }}
                    >
                        Configuración
                    </h1>
                    <p className="text-[13px] m-0" style={{ color: '#9ca3b8' }}>
                        Ajustes globales de la organización GSA · Solo administradores
                    </p>
                </div>
                <div>
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                        style={{
                            background: 'rgba(27,31,43,0.6)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            color: '#9ca3b8',
                            letterSpacing: 0.4,
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }}
                        />
                        workspace · gsa-academy
                    </span>
                </div>
            </header>

            {/* Layout 2 columnas */}
            <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 184px) 1fr' }}>
                {/* Sidebar interno */}
                <aside className="flex flex-col gap-1 sticky top-20 self-start">
                    <div
                        className="px-3 pb-2"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            fontSize: 10,
                            letterSpacing: 1.4,
                            color: '#5a6178',
                        }}
                    >
                        AJUSTES
                    </div>
                    <nav className="flex flex-col gap-0.5">
                        {TABS.map((tab) => {
                            const Icon = tab.icon
                            const active = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left relative transition-colors cursor-pointer"
                                    style={
                                        active
                                            ? {
                                                  background: 'rgba(251,146,60,0.08)',
                                                  color: '#fb923c',
                                                  border: '1px solid rgba(251,146,60,0.18)',
                                              }
                                            : {
                                                  background: 'transparent',
                                                  color: '#9ca3b8',
                                                  border: '1px solid transparent',
                                              }
                                    }
                                >
                                    <Icon size={14} />
                                    <span className="flex-1">{tab.label}</span>
                                    {active && (
                                        <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                background: '#fb923c',
                                                boxShadow: '0 0 6px #fb923c',
                                            }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* Contenido */}
                <div className="flex flex-col gap-5 min-w-0">
                    {activeTab === 'general' && <PricingSection initialPricing={initialPricing} />}
                    {activeTab === 'commissions' && <CommissionTiersSection initialTiers={initialTiers} />}
                    {activeTab === 'profile' && (
                        <ProfileClient
                            user={user}
                            stats={{ enrollmentCount: 0, completedLessons: 0 }}
                            adminStats={adminStats}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
