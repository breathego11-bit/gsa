'use client'

import { useState } from 'react'
import type { CloserType } from '@prisma/client'
import { MobileSidebar, type SidebarBadges } from './MobileSidebar'
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
}

export function MobileNav({ role, closerEnabled = false, closerType = null, user, badges }: Props) {
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
            />
            <BottomNav role={role} onOpenMenu={() => setDrawerOpen(true)} />
        </>
    )
}
