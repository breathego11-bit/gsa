'use client'

import { useState } from 'react'
import type { CloserType } from '@prisma/client'
import { MobileSidebar, type SidebarBadges } from './MobileSidebar'
import type { NavCaps } from './nav-config'
import { BottomNav } from './BottomNav'

type Role = 'STUDENT' | 'ADMIN'

interface UserBrief {
    name: string
    last_name: string
    email: string
    profile_image: string | null
}

interface Props {
    role: Role
    closerEnabled?: boolean
    closerType?: CloserType | null
    user: UserBrief
    badges?: SidebarBadges
    caps?: NavCaps
}

export function MobileNav({ role, closerEnabled = false, closerType = null, user, badges, caps }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)

    return (
        <>
            <MobileSidebar
                role={role}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                closerEnabled={closerEnabled}
                closerType={closerType}
                user={user}
                badges={badges}
                caps={caps}
            />
            <BottomNav
                role={role}
                closerEnabled={closerEnabled}
                closerType={closerType}
                onOpenMenu={() => setDrawerOpen(true)}
            />
        </>
    )
}
