'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CloserType } from '@prisma/client'
import {
    buildAdminGroups,
    buildStudentGroups,
    isNavItemActive,
    type NavItem,
    type Role,
    type SidebarBadges,
    type UserBrief,
} from './nav-config'

// Re-exportado por compatibilidad: admin/layout.tsx y dashboard/layout.tsx
// tipan sus `badges` contra este símbolo.
export type { SidebarBadges }

interface SidebarProps {
    role: Role
    closerEnabled?: boolean
    closerType?: CloserType | null
    user: UserBrief
    badges?: SidebarBadges
}

// `.v2` a propósito: la clave anterior se escribía sola en cada carga, así que sus valores
// no representan una preferencia del usuario y deben ignorarse.
const COLLAPSE_KEY = 'gsa.sidebar.collapsed.v2'
const WIDTH_EXPANDED = 264
const WIDTH_COLLAPSED = 68

export function Sidebar({ role, closerEnabled = false, closerType = null, user, badges }: SidebarProps) {
    const pathname = usePathname()
    const isAdmin = role === 'ADMIN'
    const isCloser = closerEnabled && closerType !== null
    const groups = isAdmin
        ? buildAdminGroups(badges)
        : buildStudentGroups(closerEnabled, closerType, badges)

    /*
     * Colapsado por defecto; `localStorage` solo guarda decisiones EXPLÍCITAS.
     *
     * Antes se persistía dentro de un efecto que corría en cada carga, así que el valor por
     * defecto de entonces ("expandido") se escribía solo y todo el mundo acababa con un '0'
     * guardado que nadie había elegido. Por eso la clave lleva sufijo `.v2`: las entradas
     * viejas no son preferencias reales y hay que ignorarlas.
     *
     * Ahora solo escribe `toggleCollapsed`, al pulsar el botón.
     */
    const [collapsed, setCollapsed] = useState(true)
    const [hovered, setHovered] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.localStorage.getItem(COLLAPSE_KEY) === '0') setCollapsed(false)
    }, [])

    // Publica el ancho reservado para quien posicione elementos `fixed` junto al sidebar
    // (p. ej. el nav flotante del Método). Ver `--sidebar-w` en globals.css.
    useEffect(() => {
        document.documentElement.style.setProperty(
            '--sidebar-w',
            `${collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED}px`,
        )
    }, [collapsed])

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev
            try {
                window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
            } catch {
                // Modo incógnito o storage lleno: el sidebar sigue funcionando sin recordar.
            }
            return next
        })
    }

    const isActive = (href: string) => isNavItemActive(href, pathname)

    const initials = `${user.name.charAt(0) ?? ''}${user.last_name.charAt(0) ?? ''}`.toUpperCase()
    const profileHref = isAdmin ? '/admin/settings?tab=profile' : '/dashboard/profile'

    /*
     * `mini` (rail estrecho) vs `collapsed` (la preferencia guardada).
     *
     * El hover expande solo lo VISUAL: el hueco que el sidebar reserva en el layout sigue
     * siendo el del rail. Por eso hay dos elementos — el <div> exterior mantiene el ancho
     * del layout y el <aside> se superpone. Si expandiera el propio elemento del flex, cada
     * pasada del ratón reflowearía toda la página.
     */
    const mini = collapsed && !hovered
    const layoutWidth = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
    const visualWidth = mini ? WIDTH_COLLAPSED : WIDTH_EXPANDED

    return (
        <div
            className="h-screen shrink-0 relative"
            style={{
                width: layoutWidth,
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
        <aside
            className="h-screen flex flex-col absolute inset-y-0 left-0 z-20"
            style={{
                width: visualWidth,
                background: 'linear-gradient(180deg, #0a1020 0%, #080d18 60%)',
                borderRight: '1px solid rgba(129,140,248,0.1)',
                color: '#dee2f2',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                // Al superponerse sobre el contenido necesita separarse visualmente.
                boxShadow: mini ? 'none' : '8px 0 28px -12px rgba(0,0,0,0.55)',
            }}
        >
            {/* Collapse toggle — oculto de momento: el sidebar se expande solo al pasar el
                ratón. La lógica se mantiene intacta para poder reactivarlo quitando el
                `hidden` (y con él vuelve la preferencia persistida). */}
            <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                title={collapsed ? 'Expandir' : 'Colapsar'}
                className="hidden absolute z-30 items-center justify-center rounded-full transition-all"
                style={{
                    top: 22,
                    right: -12,
                    width: 24,
                    height: 24,
                    background: '#0e131e',
                    border: '1px solid rgba(129,140,248,0.25)',
                    color: '#9ca3b8',
                    boxShadow: '0 4px 10px -4px rgba(0,0,0,0.6)',
                    cursor: 'pointer',
                }}
            >
                {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>

            {/* Brand header */}
            <div className={mini ? 'px-2 pt-4 pb-3' : 'px-3 pt-4 pb-3'}>
                <div
                    className={`flex items-center rounded-xl ${mini ? 'justify-center p-1.5' : 'gap-2.5 px-2.5 py-2'}`}
                    style={{
                        background: 'rgba(20,25,38,0.5)',
                        border: '1px solid rgba(129,140,248,0.14)',
                    }}
                >
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: '#0e131e' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo_dark.png"
                            alt="GSA"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    {!mini && (
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5 text-[13px] font-semibold truncate">
                                <span style={{ color: '#dee2f2' }}>GSA Academy</span>
                                {isAdmin && (
                                    <span
                                        className="text-[8.5px] px-1 py-px rounded shrink-0"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            background: 'rgba(251,146,60,0.12)',
                                            border: '1px solid rgba(251,146,60,0.3)',
                                            color: '#fb923c',
                                            letterSpacing: 1.2,
                                            fontWeight: 600,
                                        }}
                                    >
                                        ADMIN
                                    </span>
                                )}
                            </div>
                            <div
                                className="flex items-center gap-1.5 mt-0.5 text-[10.5px]"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#7a8094',
                                    letterSpacing: 0.4,
                                }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }}
                                />
                                <span className="truncate">
                                    {isAdmin ? 'panel · activo' : 'workspace · activo'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav
                className={`sidebar-scroll flex-1 overflow-y-auto flex flex-col gap-3.5 ${mini ? "px-1.5" : "px-2"}`}
                style={{ paddingBottom: 8 }}
            >
                {groups.map((group, gi) => (
                    <div key={gi} className="flex flex-col gap-0.5">
                        {!mini ? (
                            <div
                                className="px-2.5 pt-1.5 pb-1"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    fontSize: 9.5,
                                    letterSpacing: 1.4,
                                    color: '#4a5168',
                                }}
                            >
                                {group.label}
                            </div>
                        ) : (
                            // Subtle divider between groups when mini
                            gi > 0 && (
                                <div
                                    className="mx-3 my-1"
                                    style={{
                                        height: 1,
                                        background: 'rgba(129,140,248,0.08)',
                                    }}
                                />
                            )
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => (
                                <NavItemRow
                                    key={item.href}
                                    item={item}
                                    active={isActive(item.href)}
                                    collapsed={mini}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Quick action — closers (both types) + admins (act as seller) */}
            {(isAdmin || (role === 'STUDENT' && isCloser)) && (
                <div className={mini ? 'px-1.5 pt-1.5 pb-3' : 'px-3 pt-1.5 pb-3'}>
                    <Link
                        href={isAdmin ? '/admin/my-sales' : '/dashboard/sales'}
                        title="Nueva venta"
                        aria-label="Nueva venta"
                        className={`w-full flex items-center rounded-xl text-[13px] font-semibold cursor-pointer ${
                            mini ? 'justify-center py-2.5' : 'gap-2 px-3 py-2.5'
                        }`}
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 8px 22px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                            textDecoration: 'none',
                        }}
                    >
                        <Plus size={mini ? 16 : 13} />
                        {!mini && (
                            <>
                                <span>Nueva venta</span>
                                <span
                                    className="ml-auto flex items-center justify-center"
                                    style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: 5,
                                        background: 'rgba(255,255,255,0.18)',
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.85)',
                                    }}
                                >
                                    N
                                </span>
                            </>
                        )}
                    </Link>
                </div>
            )}

            {/* Profile footer */}
            <div
                className={mini ? 'px-1.5 py-3' : 'px-3 py-3'}
                style={{
                    borderTop: '1px solid rgba(129,140,248,0.1)',
                    background: 'rgba(8,13,24,0.4)',
                }}
            >
                <div
                    className={`flex items-center rounded-xl ${
                        mini ? 'flex-col gap-1.5 p-1.5' : 'gap-2.5 px-2.5 py-2'
                    }`}
                    style={{
                        background: 'rgba(20,25,38,0.5)',
                        border: '1px solid rgba(129,140,248,0.12)',
                    }}
                >
                    <Link
                        href={profileHref}
                        aria-label="Mi perfil"
                        title={`${user.name} ${user.last_name}`}
                        className="relative shrink-0"
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11.5px] font-bold text-white overflow-hidden"
                            style={{
                                background: user.profile_image
                                    ? '#1a2030'
                                    : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            }}
                        >
                            {user.profile_image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={user.profile_image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                initials || '··'
                            )}
                        </div>
                        <span
                            className="absolute"
                            style={{
                                bottom: -2,
                                right: -2,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#34d399',
                                border: '2px solid #0a1020',
                            }}
                        />
                    </Link>
                    {!mini && (
                        <Link
                            href={profileHref}
                            className="flex-1 min-w-0"
                            style={{ textDecoration: 'none' }}
                        >
                            <div
                                className="text-[12.5px] font-medium truncate"
                                style={{ color: '#dee2f2' }}
                            >
                                {user.name} {user.last_name}
                            </div>
                            <div
                                className="text-[10.5px] truncate"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#7a8094',
                                    letterSpacing: 0.2,
                                }}
                            >
                                {user.email}
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        aria-label="Cerrar sesión"
                        title="Cerrar sesión"
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.14)',
                            color: '#9ca3b8',
                            cursor: 'pointer',
                        }}
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
        </div>
    )
}

function NavItemRow({
    item,
    active,
    collapsed,
}: {
    item: NavItem
    active: boolean
    collapsed: boolean
}) {
    const { Icon, label, href, badge, kbd } = item
    const hasNotif = badge?.kind === 'notif'

    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={`relative flex items-center rounded-lg text-[13px] font-medium transition-colors ${
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2'
            }`}
            style={
                active
                    ? {
                          background:
                              'linear-gradient(90deg, rgba(56,189,248,0.16) 0%, rgba(129,140,248,0.06) 100%)',
                          border: '1px solid rgba(56,189,248,0.28)',
                          boxShadow:
                              '0 4px 14px -6px rgba(56,189,248,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                          color: '#fff',
                          textDecoration: 'none',
                      }
                    : {
                          background: 'transparent',
                          border: '1px solid transparent',
                          color: '#9ca3b8',
                          textDecoration: 'none',
                      }
            }
        >
            {active && !collapsed && (
                <span
                    className="absolute"
                    style={{
                        left: -8,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
                        borderRadius: '0 3px 3px 0',
                        boxShadow: '0 0 10px rgba(56,189,248,0.6)',
                    }}
                />
            )}
            <span
                className="relative w-5 h-5 flex items-center justify-center shrink-0"
                style={{ color: active ? '#38bdf8' : '#7a8094' }}
            >
                <Icon size={collapsed ? 17 : 15} />
                {/* Notif dot overlay when collapsed */}
                {collapsed && hasNotif && (
                    <span
                        className="absolute"
                        style={{
                            top: -2,
                            right: -2,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#f472b6',
                            boxShadow: '0 0 0 2px #0a1020',
                        }}
                    />
                )}
            </span>
            {!collapsed && (
                <>
                    <span className="flex-1 truncate" style={{ letterSpacing: 0.1 }}>
                        {label}
                    </span>
                    {badge ? (
                        <BadgeAdornment badge={badge} />
                    ) : kbd ? (
                        <KbdAdornment value={kbd} />
                    ) : null}
                </>
            )}
        </Link>
    )
}

function BadgeAdornment({ badge }: { badge: NonNullable<NavItem['badge']> }) {
    if (badge.kind === 'notif') {
        return (
            <span
                className="flex items-center justify-center font-semibold shrink-0"
                style={{
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 9,
                    background: '#f472b6',
                    color: '#fff',
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 10,
                    boxShadow: '0 0 0 2px rgba(244,114,182,0.18)',
                }}
            >
                {badge.value}
            </span>
        )
    }
    if (badge.kind === 'money') {
        return (
            <span
                className="shrink-0"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 10.5,
                    color: '#34d399',
                    padding: '2px 6px',
                    borderRadius: 5,
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    letterSpacing: 0.2,
                }}
            >
                {badge.value}
            </span>
        )
    }
    return (
        <span
            className="shrink-0"
            style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 10.5,
                color: '#9ca3b8',
                padding: '2px 6px',
                borderRadius: 5,
                background: 'rgba(129,140,248,0.1)',
                border: '1px solid rgba(129,140,248,0.18)',
            }}
        >
            {badge.value.toLocaleString('es-ES')}
        </span>
    )
}

function KbdAdornment({ value }: { value: string }) {
    return (
        <span
            className="flex items-center justify-center shrink-0"
            style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: 'rgba(20,25,38,0.4)',
                border: '1px solid rgba(129,140,248,0.14)',
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: 10,
                color: '#5a6178',
            }}
        >
            {value}
        </span>
    )
}
