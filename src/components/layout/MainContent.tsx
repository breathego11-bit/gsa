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
    const fullBleed = fullBleedPaths.some((p) =>
        typeof p === 'string'
            ? pathname === p || pathname.startsWith(p + '/') || pathname.endsWith(p)
            : p.test(pathname),
    )
    return (
        <main className="flex-1 overflow-y-auto relative z-10">
            {fullBleed ? children : <div className={wrapperClassName}>{children}</div>}
        </main>
    )
}
