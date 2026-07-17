'use client'

import { usePathname } from 'next/navigation'

export function MainContent({
    children,
    wrapperClassName,
    fullBleedPaths,
}: {
    children: React.ReactNode
    wrapperClassName: string
    fullBleedPaths: (string | RegExp)[]
}) {
    const pathname = usePathname() ?? ''
    const fullBleed = fullBleedPaths.some((p) => {
        if (typeof p !== 'string') return p.test(pathname)
        // Convención: sufijo "$" = match EXACTO (no cubre subrutas). Ej: "/admin/coach$"
        if (p.endsWith('$')) return pathname === p.slice(0, -1)
        return pathname === p || pathname.startsWith(p + '/') || pathname.endsWith(p)
    })
    return (
        <main className="flex-1 overflow-y-auto relative z-10">
            {fullBleed ? children : <div className={wrapperClassName}>{children}</div>}
        </main>
    )
}
