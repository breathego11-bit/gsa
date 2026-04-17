'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Role = 'STUDENT' | 'ADMIN'

interface NavItem {
    href: string
    label: string
    icon: string
}

const studentNav: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: 'dashboard' },
    { href: '/dashboard/courses', label: 'Cursos', icon: 'school' },
    { href: '/dashboard/profile', label: 'Perfil', icon: 'person' },
]

const adminNav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: 'analytics' },
    { href: '/admin/courses', label: 'Cursos', icon: 'school' },
    { href: '/admin/students', label: 'Alumnos', icon: 'groups' },
]

interface BottomNavProps {
    role: Role
    onOpenMenu?: () => void
}

export function BottomNav({ role, onOpenMenu }: BottomNavProps) {
    const pathname = usePathname()
    const nav = role === 'ADMIN' ? adminNav : studentNav

    const isActive = (href: string) => {
        if (href === '/admin' || href === '/dashboard') return pathname === href
        return pathname.startsWith(href)
    }

    // Check if current page is one of the "more" pages (not in bottom nav)
    const moreActive = role === 'ADMIN' && ['/admin/team', '/admin/invitations', '/admin/settings', '/admin/profile'].some(p => pathname.startsWith(p))

    return (
        <nav className="bottom-nav-global fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pb-6 pt-3 rounded-t-[1.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] lg:hidden"
            style={{ background: 'rgba(9,14,25,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
        >
            {nav.map((item) => {
                const active = isActive(item.href)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
                            active
                                ? 'bg-blue-900/30 text-blue-400 ring-1 ring-white/10'
                                : 'text-slate-500 hover:text-blue-300'
                        }`}
                    >
                        <span
                            className="material-symbols-outlined mb-1 text-xl"
                            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                            {item.icon}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.1em] font-bold">
                            {item.label}
                        </span>
                    </Link>
                )
            })}
            {/* More button to open sidebar with all options */}
            {onOpenMenu && (
                <button
                    onClick={onOpenMenu}
                    className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
                        moreActive
                            ? 'bg-blue-900/30 text-blue-400 ring-1 ring-white/10'
                            : 'text-slate-500 hover:text-blue-300'
                    }`}
                >
                    <span
                        className="material-symbols-outlined mb-1 text-xl"
                        style={moreActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                        menu
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.1em] font-bold">
                        Más
                    </span>
                </button>
            )}
        </nav>
    )
}
