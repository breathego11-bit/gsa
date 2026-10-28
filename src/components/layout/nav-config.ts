import {
    LayoutDashboard,
    BookOpen,
    Users,
    User as UserIcon,
    BarChart3,
    Settings,
    MailPlus,
    Inbox,
    ShieldCheck,
    Compass,
    Sparkles,
    ClipboardList,
    TrendingUp,
    Wallet,
    CalendarDays,
    UserCheck,
    type LucideIcon,
} from 'lucide-react'
import type { CloserType } from '@prisma/client'
import { CLOSER_NAV } from '@/lib/access-paths'

/*
 * Fuente única de la navegación lateral.
 *
 * Sidebar.tsx (escritorio) y MobileSidebar.tsx (drawer <1024px) duplicaban estos
 * builders enteros, y habían divergido: al drawer le faltaba `/admin/leads` y el
 * campo `leadsNew` de `SidebarBadges`, con lo que el CRM de leads no tenía NINGÚN
 * punto de entrada en móvil. Con un solo builder, añadir una entrada la añade en
 * los dos sitios.
 */

export type Role = 'STUDENT' | 'ADMIN'

export type NavBadge =
    | { kind: 'count'; value: number }
    | { kind: 'money'; value: string }
    | { kind: 'notif'; value: number }

export interface NavItem {
    href: string
    label: string
    Icon: LucideIcon
    badge?: NavBadge
    kbd?: string
}

export interface NavGroup {
    label: string
    items: NavItem[]
}

export interface UserBrief {
    name: string
    last_name: string
    email: string
    profile_image: string | null
}

export interface SidebarBadges {
    studentsCount?: number
    invitationsPending?: number
    monthCashCents?: number
    salesCount?: number
    leadsNew?: number
    /**
     * El closer ve "Mis leads" (autorizado a recibir leads o con leads asignados de antes; ver
     * `showsOwnLeads` en pool.ts). No es un badge, pero viaja con ellos porque se calcula en la
     * misma consulta del layout y ya llega a los dos menús, el de escritorio y el móvil.
     */
    leadsAccess?: boolean
}

export function fmtMoneyShort(cents: number): string {
    const eur = cents / 100
    if (eur >= 1000) return `€${Math.round(eur / 1000)}k`
    return `€${Math.round(eur)}`
}

export function buildAdminGroups(badges: SidebarBadges = {}): NavGroup[] {
    return [
        {
            label: 'PRINCIPAL',
            items: [
                { href: '/admin', label: 'Dashboard', Icon: BarChart3, kbd: '1' },
                { href: '/admin/courses', label: 'Cursos', Icon: BookOpen, kbd: '2' },
                { href: '/admin/method', label: 'Método', Icon: Compass, kbd: '3' },
                { href: '/admin/coach', label: 'Coach IA', Icon: Sparkles },
            ],
        },
        {
            label: 'GESTIÓN',
            items: [
                {
                    href: '/admin/leads',
                    label: 'Leads',
                    Icon: Inbox,
                    badge:
                        typeof badges.leadsNew === 'number' && badges.leadsNew > 0
                            ? { kind: 'notif', value: badges.leadsNew }
                            : undefined,
                },
                { href: '/admin/agenda', label: 'Agenda', Icon: CalendarDays },
                {
                    href: '/admin/students',
                    label: 'Estudiantes',
                    Icon: Users,
                    badge:
                        typeof badges.studentsCount === 'number'
                            ? { kind: 'count', value: badges.studentsCount }
                            : undefined,
                },
                { href: '/admin/coach/alumnos', label: 'Coach · Alumnos', Icon: ClipboardList },
                {
                    href: '/admin/sales',
                    label: 'Ventas',
                    Icon: TrendingUp,
                    badge:
                        typeof badges.monthCashCents === 'number' && badges.monthCashCents > 0
                            ? { kind: 'money', value: fmtMoneyShort(badges.monthCashCents) }
                            : undefined,
                },
                {
                    href: '/admin/my-sales',
                    label: 'Mis ventas',
                    Icon: Wallet,
                    badge:
                        typeof badges.salesCount === 'number' && badges.salesCount > 0
                            ? { kind: 'count', value: badges.salesCount }
                            : undefined,
                },
                { href: '/admin/team', label: 'Equipo', Icon: ShieldCheck, kbd: '4' },
                {
                    href: '/admin/invitations',
                    label: 'Invitaciones',
                    Icon: MailPlus,
                    badge:
                        typeof badges.invitationsPending === 'number' && badges.invitationsPending > 0
                            ? { kind: 'notif', value: badges.invitationsPending }
                            : undefined,
                },
            ],
        },
        {
            label: 'AJUSTES',
            items: [{ href: '/admin/settings', label: 'Configuración', Icon: Settings }],
        },
    ]
}

export function buildStudentGroups(
    closerEnabled: boolean,
    closerType: CloserType | null,
    badges: SidebarBadges = {},
): NavGroup[] {
    // Matrix:
    //   regular student            (closer_enabled=false)         → Dashboard, Cursos, Método, Perfil
    //   CRM_ONLY closer            (enabled=true, CRM_ONLY)       → Método, Perfil, Ventas (NO Dashboard/Cursos)
    //   CRM_AND_COURSES closer     (enabled=true, full)           → Dashboard, Cursos, Método, Perfil, Ventas
    const isCloser = closerEnabled && closerType !== null
    const hasCourseAccess = !isCloser || closerType === 'CRM_AND_COURSES'

    const principalItems: NavItem[] = []
    if (hasCourseAccess) {
        principalItems.push(
            { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, kbd: '1' },
            { href: '/dashboard/courses', label: 'Cursos', Icon: BookOpen, kbd: '2' },
        )
    }
    principalItems.push(
        { href: '/dashboard/method', label: 'Método', Icon: Compass, kbd: '3' },
        { href: '/dashboard/coach', label: 'Coach IA', Icon: Sparkles, kbd: '4' },
        { href: '/dashboard/profile', label: 'Perfil', Icon: UserIcon, kbd: '5' },
    )

    const groups: NavGroup[] = [{ label: 'PRINCIPAL', items: principalItems }]

    if (isCloser) {
        groups.push({
            label: 'VENTAS',
            items: [
                {
                    href: CLOSER_NAV.sales,
                    label: 'Ventas',
                    Icon: TrendingUp,
                    badge:
                        typeof badges.salesCount === 'number' && badges.salesCount > 0
                            ? { kind: 'count', value: badges.salesCount }
                            : undefined,
                },
                // Solo a quien recibe leads (lo autoriza un admin) o tiene alguno de antes: al resto
                // de closers no se les enseña una pantalla que siempre estaría vacía.
                ...(badges.leadsAccess
                    ? [
                          {
                              href: CLOSER_NAV.leads,
                              label: 'Mis leads',
                              Icon: UserCheck,
                              badge:
                                  typeof badges.leadsNew === 'number' && badges.leadsNew > 0
                                      ? ({ kind: 'notif', value: badges.leadsNew } as const)
                                      : undefined,
                          },
                      ]
                    : []),
                // Su Google Calendar dentro de GSA. Conectarlo no lo mete en el reparto: eso lo decide un admin.
                { href: CLOSER_NAV.agenda, label: 'Mi agenda', Icon: CalendarDays },
            ],
        })
    }

    return groups
}

export function isNavItemActive(href: string, pathname: string): boolean {
    if (href === '/admin' || href === '/dashboard' || href === '/admin/coach') return pathname === href
    // "Coach · Alumnos" cubre toda el área de gestión del coach (alumnos, uso, ajustes)
    if (href === '/admin/coach/alumnos') return pathname.startsWith('/admin/coach/')
    return pathname.startsWith(href)
}
