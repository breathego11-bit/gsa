'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CloserType } from '@prisma/client'

type Role = 'STUDENT' | 'ADMIN'

interface NavItem {
    href: string
    label: string
    icon: string
}

/**
 * Los 3 accesos rápidos del alumno dependen de su tipo de closer, igual que en el
 * sidebar. Antes estaba hardcodeado a Inicio/Cursos/Perfil, así que un closer
 * `CRM_ONLY` —que no tiene acceso a cursos— veía "Cursos" (un enlace que redirige)
 * y no tenía acceso directo a Ventas.
 */
function buildStudentNav(closerEnabled: boolean, closerType: CloserType | null): NavItem[] {
    const isCloser = closerEnabled && closerType !== null
    const hasCourseAccess = !isCloser || closerType === 'CRM_AND_COURSES'

    if (!isCloser) {
        return [
            { href: '/dashboard', label: 'Inicio', icon: 'dashboard' },
            { href: '/dashboard/courses', label: 'Cursos', icon: 'school' },
            { href: '/dashboard/profile', label: 'Perfil', icon: 'person' },
        ]
    }
    return [
        ...(hasCourseAccess
            ? [
                  { href: '/dashboard', label: 'Inicio', icon: 'dashboard' },
                  { href: '/dashboard/courses', label: 'Cursos', icon: 'school' },
              ]
            : [{ href: '/dashboard/method', label: 'Método', icon: 'explore' }]),
        { href: '/dashboard/sales', label: 'Ventas', icon: 'trending_up' },
        ...(hasCourseAccess ? [] : [{ href: '/dashboard/profile', label: 'Perfil', icon: 'person' }]),
    ]
}

const adminNav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: 'analytics' },
    { href: '/admin/courses', label: 'Cursos', icon: 'school' },
    { href: '/admin/students', label: 'Alumnos', icon: 'groups' },
]

interface BottomNavProps {
    role: Role
    closerEnabled?: boolean
    closerType?: CloserType | null
    onOpenMenu?: () => void
}

// Rutas que no están en la barra y por tanto viven detrás del botón "Más".
const MORE_PATHS: Record<Role, string[]> = {
    ADMIN: ['/admin/team', '/admin/invitations', '/admin/settings', '/admin/profile'],
    STUDENT: ['/dashboard/method', '/dashboard/coach', '/dashboard/sales', '/dashboard/profile'],
}

export function BottomNav({ role, closerEnabled = false, closerType = null, onOpenMenu }: BottomNavProps) {
    const pathname = usePathname()
    const nav = role === 'ADMIN' ? adminNav : buildStudentNav(closerEnabled, closerType)

    const isActive = (href: string) => {
        if (href === '/admin' || href === '/dashboard') return pathname === href
        return pathname.startsWith(href)
    }

    // "Más" se resalta cuando estás en una página que no tiene su propia pestaña.
    // Antes solo se calculaba para ADMIN, así que para el alumno nunca se resaltaba.
    const moreActive =
        !nav.some((item) => isActive(item.href)) &&
        MORE_PATHS[role].some((p) => pathname.startsWith(p))

    return (
        <nav className="bottom-nav-global fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 sm:px-4 pt-3 rounded-t-[1.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] lg:hidden"
            style={{
                background: 'rgba(9,14,25,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                // El pb-6 (24px) era una aproximación a mano al home indicator de iOS (34px).
                // `max()` conserva los 24px donde no hay safe-area. Requiere el
                // `viewportFit: 'cover'` de app/layout.tsx para no resolver siempre a 0.
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
        >
            {nav.map((item) => {
                const active = isActive(item.href)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center px-2 sm:px-4 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
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
                    className={`flex flex-col items-center justify-center px-2 sm:px-4 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
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
