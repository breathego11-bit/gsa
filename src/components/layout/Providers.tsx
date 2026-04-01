'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, Suspense } from 'react'
import { NavigationProgress } from './NavigationProgress'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <Suspense fallback={null}>
                <NavigationProgress />
            </Suspense>
            {children}
        </SessionProvider>
    )
}
