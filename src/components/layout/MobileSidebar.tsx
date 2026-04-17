'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
    LayoutDashboard,
    BookOpen,
    Users,
    User,
    LogOut,
    BarChart3,
    Settings,
    MailPlus,
    ShieldCheck,
    X,
} from 'lucide-react'

type Role = 'STUDENT' | 'ADMIN'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
}

const studentNav: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/courses', label: 'Cursos', icon: <BookOpen size={18} /> },
    { href: '/dashboard/profile', label: 'Perfil', icon: <User size={18} /> },
]

const adminNav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { href: '/admin/courses', label: 'Cursos', icon: <BookOpen size={18} /> },
    { href: '/admin/students', label: 'Estudiantes', icon: <Users size={18} /> },
    { href: '/admin/team', label: 'Equipo', icon: <ShieldCheck size={18} /> },
    { href: '/admin/invitations', label: 'Invitaciones', icon: <MailPlus size={18} /> },
    { href: '/admin/settings', label: 'Configuración', icon: <Settings size={18} /> },
    { href: '/admin/profile', label: 'Perfil', icon: <User size={18} /> },
]

interface MobileSidebarProps {
    role: Role
    open: boolean
    onClose: () => void
}

export function MobileSidebar({ role, open, onClose }: MobileSidebarProps) {
    const pathname = usePathname()
    const nav = role === 'ADMIN' ? adminNav : studentNav

    const isActive = (href: string) => {
        if (href === '/admin' || href === '/dashboard') return pathname === href
        return pathname.startsWith(href)
    }

    // Close drawer on route change
    useEffect(() => {
        onClose()
    }, [pathname])

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#161b27] flex flex-col p-6 space-y-8 transition-transform duration-300 ease-in-out lg:hidden ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo_dark.png" alt="Growth Sales Academy" className="h-10 w-auto shrink-0" />
                        <div>
                            <span className="text-sm font-bold tracking-tight text-slate-100">GSA</span>
                            <p className="text-[10px] leading-tight text-slate-400">Growth Sales Academy</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                        aria-label="Cerrar menú"
                    >
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {nav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={
                                isActive(item.href)
                                    ? 'bg-blue-600/10 text-blue-400 rounded-xl px-4 py-3 flex items-center gap-3 transition-all'
                                    : 'text-slate-400 px-4 py-3 flex items-center gap-3 hover:text-slate-200 hover:bg-[#252a36] rounded-xl transition-all'
                            }
                        >
                            {item.icon}
                            <span className="uppercase tracking-[0.1em] text-[12px] font-bold">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="mt-auto pt-6 space-y-1">
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-slate-400 px-4 py-2 flex items-center gap-3 hover:text-error transition-all text-xs font-bold uppercase tracking-wider w-full"
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    )
}
