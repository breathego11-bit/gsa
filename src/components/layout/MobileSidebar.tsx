'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
    LayoutDashboard,
    BookOpen,
    Users,
    User,
    LogOut,
    BarChart3,
    Settings,
    MailPlus,
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
    const { data: session } = useSession()
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
                className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ background: 'var(--bg-surface)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between border-b px-5 py-4"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo_dark.png"
                            alt="Growth Sales Academy"
                            className="h-10 w-auto shrink-0"
                        />
                        <div>
                            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                GSA
                            </span>
                            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                                Growth Sales Academy
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                        aria-label="Cerrar menú"
                    >
                        <X size={18} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {nav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive(item.href) ? 'sidebar-link-active' : 'sidebar-link'}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User + Sign out */}
                <div
                    className="border-t px-3 py-4 space-y-1"
                    style={{ borderColor: 'var(--border)' }}
                >
                    {session?.user && (
                        <div className="px-3 py-2 mb-1">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {session.user.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                {session.user.email}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="sidebar-link w-full text-left"
                        style={{ color: 'var(--error)' }}
                    >
                        <LogOut size={18} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    )
}
