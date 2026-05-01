import Link from 'next/link'
import type { CSSProperties } from 'react'
import {
    CourseCardRedesigned,
    type CourseCardData,
} from './CourseCardRedesigned'

interface Props {
    courses: CourseCardData[]
}

export function CoursesSection({ courses }: Props) {
    const programCount = courses.length

    return (
        <section id="courses" style={cr.root}>
            <div style={cr.glow1} />
            <div style={cr.glow2} />

            <div style={cr.inner}>
                {/* Header */}
                <div style={cr.header}>
                    <div>
                        <div style={cr.tag}>
                            <span style={cr.tagDot} />
                            Certificaciones · {programCount}{' '}
                            {programCount === 1 ? 'programa insignia' : 'programas insignia'}
                        </div>
                        <h2 style={cr.title}>
                            La puerta <span style={cr.titleAccent}>al cambio</span>
                        </h2>
                        <p style={cr.sub}>
                            Caminos de certificación diseñados para transformar tu manera de
                            vender. Cada uno con un ritmo propio, pero el mismo estándar GSA.
                        </p>
                    </div>

                    <Link href="/courses" style={cr.exploreAll}>
                        <span>Explorar todos los programas</span>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        >
                            <path d="M3 7h8M7 3l4 4-4 4" />
                        </svg>
                    </Link>
                </div>

                {/* Cards */}
                {courses.length > 0 ? (
                    <div style={cr.grid}>
                        {courses.map((c, i) => (
                            <CourseCardRedesigned key={c.id} course={c} index={i} />
                        ))}
                    </div>
                ) : (
                    <div style={cr.empty}>
                        <div style={cr.emptyTitle}>Próximamente</div>
                        <div style={cr.emptyDesc}>
                            Estamos preparando programas exclusivos para ti. ¡Vuelve pronto!
                        </div>
                    </div>
                )}

            </div>
        </section>
    )
}

const cr: Record<string, CSSProperties> = {
    root: {
        width: '100%',
        minHeight: '100vh',
        color: '#dee2f2',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 0 48px',
        display: 'flex',
        alignItems: 'center',
    },
    glow1: {
        position: 'absolute',
        top: '10%',
        right: '-5%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(80px)',
        background:
            'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 60%)',
    },
    glow2: {
        position: 'absolute',
        bottom: '5%',
        left: '-5%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(70px)',
        background:
            'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 60%)',
    },
    inner: {
        position: 'relative',
        zIndex: 1,
        padding: '0 clamp(16px, 5vw, 80px)',
        maxWidth: 1320,
        margin: '0 auto',
        width: '100%',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 28,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    tagDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#38bdf8',
        boxShadow: '0 0 14px #38bdf8',
    },
    title: {
        fontSize: 'clamp(32px, 4.2vw, 48px)',
        lineHeight: 1.05,
        letterSpacing: -1.6,
        fontWeight: 600,
        margin: '0 0 12px',
        maxWidth: 920,
    },
    titleAccent: {
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        // Misma fuente, peso y estilo que "La puerta" — solo el degradado cambia
    },
    sub: {
        fontSize: 14.5,
        lineHeight: 1.5,
        color: '#c4c5d5',
        maxWidth: 540,
        margin: 0,
    },
    tag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'rgba(27,31,43,0.7)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(129,140,248,0.25)',
        fontSize: 12,
        fontWeight: 500,
        color: '#c4c5d5',
        marginBottom: 16,
    },
    exploreAll: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 10,
        background: 'rgba(27,31,43,0.6)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(129,140,248,0.25)',
        color: '#dee2f2',
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'all .2s',
        marginBottom: 8,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
        gap: 20,
    },
    empty: {
        padding: '64px 32px',
        borderRadius: 16,
        background: 'rgba(14,19,30,0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(129,140,248,0.15)',
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 600,
        color: '#dee2f2',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    emptyDesc: {
        fontSize: 15,
        color: '#c4c5d5',
        lineHeight: 1.5,
    },
}
