import { AnimatedBackground } from '@/components/layout/AnimatedBackground'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen" style={{ background: 'var(--bg-base)' }}>
            <AnimatedBackground />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
