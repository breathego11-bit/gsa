'use client'

import { useState } from 'react'
import { MobileSidebar } from './MobileSidebar'
import { BottomNav } from './BottomNav'

type Role = 'STUDENT' | 'ADMIN'

export function MobileNav({ role }: { role: Role }) {
    const [drawerOpen, setDrawerOpen] = useState(false)

    return (
        <>
            <MobileSidebar role={role} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <BottomNav role={role} onOpenMenu={() => setDrawerOpen(true)} />
        </>
    )
}
