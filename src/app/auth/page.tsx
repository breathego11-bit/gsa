import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'

export default function AuthPage() {
    return (
        <Suspense>
            <AuthShell />
        </Suspense>
    )
}
