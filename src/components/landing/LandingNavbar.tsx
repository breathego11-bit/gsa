'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'

type NavLink = { label: string; href: string }

const LINKS: NavLink[] = [
    { label: 'Programa', href: '#features' },
    { label: 'Pilares', href: '#manifesto' },
    { label: 'Nosotros', href: '#about' },
    { label: 'Cursos', href: '#courses' },
    { label: 'Comunidad', href: '#testimonials' },
]

export function LandingNavbar() {
    const [scrolled, setScrolled] = useState(false)
    const [active, setActive] = useState<string>(LINKS[0].label)

    useEffect(() => {
        const sectionLinks = LINKS.filter((l) => l.href.startsWith('#'))

        const onScroll = () => {
            setScrolled(window.scrollY > 10)

            // Active section = last section whose top has passed the 30% viewport mark
            const threshold = window.innerHeight * 0.3
            let current = sectionLinks[0]?.label ?? ''
            for (const link of sectionLinks) {
                const el = document.getElementById(link.href.slice(1))
                if (!el) continue
                if (el.getBoundingClientRect().top <= threshold) {
                    current = link.label
                }
            }
            setActive(current)
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <nav
            style={{
                ...nv.root,
                background: scrolled
                    ? 'rgba(8,13,24,0.85)'
                    : 'rgba(8,13,24,0.4)',
                borderBottom: scrolled
                    ? '1px solid rgba(129,140,248,0.18)'
                    : '1px solid rgba(129,140,248,0.08)',
            }}
        >
            <div style={nv.inner}>
                {/* Logo */}
                <Link href="/" style={nv.logo} aria-label="Growth Sales Academy">
                    <img
                        src="/logo_dark.png"
                        alt="Growth Sales Academy"
                        style={nv.logoImg}
                    />
                    <span style={nv.logoText} className="hidden sm:inline-flex">
                        <span style={nv.logoPrimary}>Growth Sales</span>
                        <span style={nv.logoSecondary}>ACADEMY</span>
                    </span>
                </Link>

                {/* Nav links */}
                <div style={nv.links} className="hidden md:flex">
                    {LINKS.map((l) => {
                        const isActive = active === l.label
                        const isInternal = l.href.startsWith('/')
                        const linkProps = {
                            onClick: () => setActive(l.label),
                            className: 'gsa-nav-link',
                            style: {
                                ...nv.link,
                                color: isActive ? '#dee2f2' : '#c4c5d5',
                            },
                        }

                        const content = (
                            <>
                                {l.label}
                                {isActive && <span style={nv.linkActive} />}
                            </>
                        )

                        return isInternal ? (
                            <Link key={l.label} href={l.href} {...linkProps}>
                                {content}
                            </Link>
                        ) : (
                            <a key={l.label} href={l.href} {...linkProps}>
                                {content}
                            </a>
                        )
                    })}
                </div>

                {/* Actions */}
                <div style={nv.actions}>
                    <button
                        type="button"
                        style={nv.iconBtn}
                        aria-label="Buscar"
                        className="gsa-nav-icon hidden sm:inline-flex"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        >
                            <circle cx="8" cy="8" r="5" />
                            <path d="M12 12l4 4" />
                        </svg>
                    </button>
                    <span
                        style={nv.divider}
                        className="hidden sm:inline-block"
                        aria-hidden
                    />
                    <Link
                        href="/auth"
                        style={nv.loginLink}
                        className="gsa-nav-login hidden sm:inline-flex"
                    >
                        Iniciar sesión
                    </Link>
                    <Link href="/auth?mode=register" style={nv.cta} className="gsa-nav-cta">
                        <span>Empezar</span>
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <path d="M2 6h7M6 2l4 4-4 4" />
                        </svg>
                    </Link>
                </div>
            </div>

            <style>{`
                .gsa-nav-link:hover {
                    color: #dee2f2 !important;
                }
                .gsa-nav-icon:hover {
                    color: #dee2f2;
                    border-color: rgba(129,140,248,0.35) !important;
                    background: rgba(129,140,248,0.08);
                }
                .gsa-nav-login:hover {
                    color: #dee2f2 !important;
                }
                .gsa-nav-cta:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 32px rgba(56,189,248,0.45) !important;
                }
                .gsa-nav-cta:active {
                    transform: translateY(0);
                }
            `}</style>
        </nav>
    )
}

const nv: Record<string, CSSProperties> = {
    root: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        fontFamily: 'Inter, system-ui, sans-serif',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background .3s ease, border-color .3s ease',
    },
    inner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 24px',
        maxWidth: 1440,
        margin: '0 auto',
        gap: 24,
    },
    logo: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
    },
    logoImg: {
        height: 44,
        width: 'auto',
        flexShrink: 0,
        display: 'block',
    },
    logoText: {
        display: 'inline-flex',
        flexDirection: 'column',
        lineHeight: 1.05,
    },
    logoPrimary: {
        fontSize: 13.5,
        fontWeight: 600,
        letterSpacing: '-0.3px',
        color: '#dee2f2',
    },
    logoSecondary: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 1.6,
        color: '#38bdf8',
        opacity: 0.85,
        marginTop: 2,
    },
    links: {
        alignItems: 'center',
        gap: 4,
    },
    link: {
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: '10px 14px 12px',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'color .2s',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
    },
    linkActive: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 4,
        height: 2,
        borderRadius: 2,
        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
        boxShadow: '0 0 10px rgba(56,189,248,0.55)',
    },
    actions: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '1px solid rgba(129,140,248,0.18)',
        borderRadius: 10,
        color: '#c4c5d5',
        cursor: 'pointer',
        transition: 'all .2s',
        padding: 0,
    },
    divider: {
        width: 1,
        height: 22,
        background: 'rgba(129,140,248,0.2)',
    },
    loginLink: {
        background: 'transparent',
        border: 'none',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        color: '#c4c5d5',
        cursor: 'pointer',
        padding: '8px 12px',
        transition: 'color .2s',
        textDecoration: 'none',
        alignItems: 'center',
    },
    cta: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 18px',
        borderRadius: 10,
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        border: 'none',
        color: '#080d18',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textDecoration: 'none',
        boxShadow: '0 6px 20px rgba(56,189,248,0.3)',
        transition: 'all .25s',
    },
}
