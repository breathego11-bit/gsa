'use client'

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

interface SidebarProps {
    role: Role
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname()
    const nav = role === 'ADMIN' ? adminNav : studentNav

    const isActive = (href: string) => {
        if (href === '/admin' || href === '/dashboard') return pathname === href
        return pathname.startsWith(href)
    }

    return (
        <aside className="flex h-screen w-60 shrink-0 flex-col bg-[#161b27] p-5 space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <img
                    src="/logo_dark.png"
                    alt="Growth Sales Academy"
                    className="w-auto shrink-0"
                    style={{ height: '4.25rem' }}
                />
                <div>
                    <span className="text-sm font-bold tracking-tight text-slate-100">GSA</span>
                    <p className="text-[10px] leading-tight text-slate-400">Growth Sales Academy</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
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
    )
}
