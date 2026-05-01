'use client'

import Link from 'next/link'
import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react'

type Phase = {
    num: string
    key: string
    title: string
    subtitle: string
    time: string
    group: 'apertura' | 'descubrimiento' | 'presentacion' | 'cierre' | 'post'
}

const PHASES: Phase[] = [
    { num: '01', key: 'conexion', title: 'Conexión', subtitle: 'Quiebre del escudo', time: '2–3 min', group: 'apertura' },
    { num: '02', key: 'marco', title: 'Marco', subtitle: 'Toma de control', time: '1–2 min', group: 'apertura' },
    { num: '03', key: 'diagnostico', title: 'Diagnóstico', subtitle: 'Las 3 preguntas de oro', time: '8–10 min', group: 'descubrimiento' },
    { num: '04', key: 'espejo', title: 'Espejo', subtitle: 'Reafirmación y confianza', time: '2–3 min', group: 'descubrimiento' },
    { num: '05', key: 'autoridad', title: 'Autoridad', subtitle: 'El porqué de confiar', time: '3–4 min', group: 'presentacion' },
    { num: '06', key: 'claridad', title: 'Claridad', subtitle: 'Resolver dudas con intención', time: '3–5 min', group: 'presentacion' },
    { num: '07', key: 'anclaje', title: 'Anclaje de valor', subtitle: 'El precio como inversión', time: '2–3 min', group: 'cierre' },
    { num: '08', key: 'cierre', title: 'Cierre consciente', subtitle: 'Acción en el momento presente', time: '3–5 min', group: 'cierre' },
    { num: '09', key: 'post', title: 'Post-cierre', subtitle: 'Sostener o sembrar', time: '24–48h', group: 'post' },
]

const GROUP_LABELS: Record<Phase['group'], string> = {
    apertura: 'Apertura · Estado & marco',
    descubrimiento: 'Descubrimiento · Diagnóstico',
    presentacion: 'Presentación · Autoridad',
    cierre: 'Cierre · Decisión consciente',
    post: 'Después · Sostener',
}

export function MethodSection() {
    const [activeIdx, setActiveIdx] = useState(0)
    const [progress, setProgress] = useState(0)
    const [navVisible, setNavVisible] = useState(false)
    const phaseRefs = useRef<(HTMLDivElement | null)[]>([])
    const lineRef = useRef<HTMLDivElement | null>(null)
    const rootRef = useRef<HTMLDivElement | null>(null)

    // Inject keyframes + responsive rules once on mount (SSR-safe).
    useEffect(() => {
        if (typeof document === 'undefined') return
        if (document.getElementById('gsa-thread-anim')) return
        const s = document.createElement('style')
        s.id = 'gsa-thread-anim'
        s.textContent = `
            @keyframes gsa-pulse {
                0% { transform: scale(1); opacity: .6; }
                70% { transform: scale(1.8); opacity: 0; }
                100% { transform: scale(1.8); opacity: 0; }
            }
            .gsa-thread-inner { padding: 80px 24px; max-width: 1280px; margin: 0 auto; position: relative; z-index: 1; }
            @media (min-width: 900px) {
                .gsa-thread-inner { padding: 80px 80px 80px 260px; }
            }
            @media (max-width: 900px) {
                .gsa-thread-nav { display: none !important; }
            }
        `
        document.head.appendChild(s)
    }, [])

    // Scroll-driven: active phase + progress line fill + nav visibility.
    useEffect(() => {
        const onScroll = () => {
            const vh = window.innerHeight
            const anchor = vh * 0.45
            let best = 0
            let bestDist = Infinity
            phaseRefs.current.forEach((el, i) => {
                if (!el) return
                const r = el.getBoundingClientRect()
                const mid = r.top + r.height / 2
                const d = Math.abs(mid - anchor)
                if (d < bestDist) {
                    bestDist = d
                    best = i
                }
            })
            setActiveIdx(best)

            if (lineRef.current) {
                const lr = lineRef.current.getBoundingClientRect()
                const raw = (anchor - lr.top) / lr.height
                setProgress(Math.max(0, Math.min(1, raw)))
            }

            if (rootRef.current) {
                const rr = rootRef.current.getBoundingClientRect()
                setNavVisible(rr.top < vh * 0.4 && rr.bottom > vh * 0.3)
            }
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [])

    const scrollToPhase = (i: number) => {
        const el = phaseRefs.current[i]
        if (el) {
            window.scrollTo({
                top:
                    window.scrollY +
                    el.getBoundingClientRect().top -
                    window.innerHeight * 0.35,
                behavior: 'smooth',
            })
        }
    }

    return (
        <section id="metodo" style={thread.root} ref={rootRef}>
            <div style={thread.bgGlow1} />
            <div style={thread.bgGlow2} />

            {/* Floating mini-nav */}
            <aside
                className="gsa-thread-nav"
                style={{
                    ...thread.nav,
                    opacity: navVisible ? 1 : 0,
                    pointerEvents: navVisible ? 'auto' : 'none',
                    transform: `translateY(-50%) translateX(${navVisible ? 0 : -20}px)`,
                }}
            >
                <div style={thread.navKicker}>MÉTODO · 09 FASES</div>
                <div style={thread.navList}>
                    {PHASES.map((p, i) => (
                        <button
                            key={p.key}
                            onClick={() => scrollToPhase(i)}
                            style={{
                                ...thread.navItem,
                                ...(i === activeIdx ? thread.navItemActive : {}),
                            }}
                        >
                            <span
                                style={{
                                    ...thread.navDot,
                                    ...(i === activeIdx ? thread.navDotActive : {}),
                                    ...(i < activeIdx ? thread.navDotPast : {}),
                                }}
                            />
                            <span style={thread.navNum}>{p.num}</span>
                            <span style={thread.navLabel}>{p.title}</span>
                        </button>
                    ))}
                </div>
            </aside>

            <div className="gsa-thread-inner">
                {/* Hero */}
                <header style={thread.hero}>
                    <div style={thread.heroTag}>
                        <span style={thread.heroTagDot} />
                        El método GSA · en 9 fases
                    </div>
                    <h2 style={thread.heroTitle}>
                        La estructura de una
                        <br />
                        <span style={thread.heroTitleAccent}>llamada consciente.</span>
                    </h2>
                    <p style={thread.heroSub}>
                        Nueve fases que se encadenan sin empujar. Desde el primer minuto
                        de conexión hasta el cierre — o la siembra. Scroll para recorrer
                        el hilo.
                    </p>
                    <div style={thread.heroMeta}>
                        <MetaPill k="Duración ideal" v="25–30 min" />
                        <MetaPill k="Closer habla" v="máx. 20%" />
                        <MetaPill k="Herramienta principal" v="tu estado" />
                    </div>
                    <div style={thread.heroScrollHint}>
                        <span>Desliza para empezar</span>
                        <svg
                            width="12"
                            height="18"
                            viewBox="0 0 12 18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <rect x="1" y="1" width="10" height="16" rx="5" />
                            <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none">
                                <animate
                                    attributeName="cy"
                                    values="5;10;5"
                                    dur="1.8s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </svg>
                    </div>
                </header>

                {/* Timeline */}
                <div style={thread.timeline} ref={lineRef}>
                    <div style={thread.rail} />
                    <div style={{ ...thread.railFill, height: `${progress * 100}%` }} />

                    {PHASES.map((p, i) => {
                        const isActive = i === activeIdx
                        const showGroupHeader =
                            i === 0 || PHASES[i - 1].group !== p.group

                        return (
                            <Fragment key={p.key}>
                                {showGroupHeader && (
                                    <div style={thread.groupHeader}>
                                        <div style={thread.groupHeaderLine} />
                                        <span style={thread.groupHeaderText}>
                                            {GROUP_LABELS[p.group]}
                                        </span>
                                        <div style={thread.groupHeaderLine} />
                                    </div>
                                )}
                                <div
                                    ref={(el) => {
                                        phaseRefs.current[i] = el
                                    }}
                                    style={{
                                        ...thread.phase,
                                        ...(i % 2 === 1
                                            ? thread.phaseRight
                                            : thread.phaseLeft),
                                    }}
                                >
                                    {i < PHASES.length - 1 && (
                                        <ZigConnector
                                            fromRight={i % 2 === 0}
                                            filled={i < activeIdx}
                                            crossesGroup={PHASES[i + 1].group !== p.group}
                                        />
                                    )}

                                    <div
                                        style={{
                                            ...thread.card,
                                            ...(isActive ? thread.cardActive : {}),
                                            ...(i % 2 === 1
                                                ? thread.cardRight
                                                : thread.cardLeft),
                                        }}
                                    >
                                        <div style={thread.cardHead}>
                                            <div>
                                                <div style={thread.cardSubtitle}>
                                                    <span style={thread.cardNum}>{p.num}</span>
                                                    <span>{p.subtitle}</span>
                                                </div>
                                                <h3 style={thread.cardTitle}>{p.title}</h3>
                                            </div>
                                            <div style={thread.cardTime}>
                                                <span style={thread.cardTimeDot} />
                                                {p.time}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Fragment>
                        )
                    })}
                </div>

                {/* Principles footer */}
                <section style={thread.principles}>
                    <div style={thread.principlesKicker}>
                        3 PRINCIPIOS QUE SOSTIENEN EL HILO
                    </div>
                    <div style={thread.principlesGrid}>
                        <Principle
                            num="I"
                            title="Duración ideal"
                            body="25–30 minutos. Ni un minuto más. La precisión es respeto."
                        />
                        <Principle
                            num="II"
                            title="El closer habla máx 20%"
                            body="La otra persona habla. Tú escuchas y preguntas con intención."
                        />
                        <Principle
                            num="III"
                            title="Tu estado, tu herramienta"
                            body="Energía y presencia son la herramienta más poderosa del método."
                        />
                    </div>
                </section>

                {/* CTA */}
                <section style={thread.cta}>
                    <h2 style={thread.ctaTitle}>
                        ¿Listo para aplicar el método
                        <br />
                        en <span style={thread.ctaAccent}>tu próxima llamada</span>?
                    </h2>
                    <p style={thread.ctaSub}>
                        Empieza tu transformación con GSA. Cierra sin presión. Vende con
                        presencia.
                    </p>
                    <div style={thread.ctaRow}>
                        <Link href="/auth?mode=register" style={thread.ctaPrimary}>
                            Empieza tu transformación
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            >
                                <path d="M2 8h12M9 3l5 5-5 5" />
                            </svg>
                        </Link>
                    </div>
                </section>
            </div>
        </section>
    )
}

function ZigConnector({
    fromRight,
    filled,
    crossesGroup,
}: {
    fromRight: boolean
    filled: boolean
    crossesGroup: boolean
}) {
    const height = crossesGroup ? 100 : 32
    const gradId = `zg-${fromRight ? 'r' : 'l'}-${filled ? '1' : '0'}-${
        crossesGroup ? 'x' : 'i'
    }`
    return (
        <svg
            style={{
                position: 'absolute',
                top: 'calc(100% - 8px)',
                left: 0,
                right: 0,
                width: '100%',
                height,
                zIndex: 1,
                pointerEvents: 'none',
                overflow: 'visible',
            }}
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop
                        offset="0%"
                        stopColor={filled ? '#38bdf8' : 'rgba(129,140,248,0.25)'}
                    />
                    <stop
                        offset="100%"
                        stopColor={filled ? '#818cf8' : 'rgba(129,140,248,0.18)'}
                    />
                </linearGradient>
            </defs>
            <path
                d={
                    fromRight
                        ? `M 25 0 C 25 ${height / 2}, 75 ${height / 2}, 75 ${height}`
                        : `M 75 0 C 75 ${height / 2}, 25 ${height / 2}, 25 ${height}`
                }
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="1.5"
                strokeDasharray={filled ? 'none' : '3 4'}
                style={{
                    filter: filled
                        ? 'drop-shadow(0 0 6px rgba(56,189,248,0.5))'
                        : 'none',
                    transition: 'all .4s',
                }}
            />
        </svg>
    )
}

function MetaPill({ k, v }: { k: string; v: string }) {
    return (
        <div style={thread.metaPill}>
            <span style={thread.metaPillKey}>{k}</span>
            <span style={thread.metaPillVal}>{v}</span>
        </div>
    )
}

function Principle({
    num,
    title,
    body,
}: {
    num: string
    title: string
    body: string
}) {
    return (
        <div style={thread.principle}>
            <div style={thread.principleNum}>{num}</div>
            <div style={thread.principleTitle}>{title}</div>
            <p style={thread.principleBody}>{body}</p>
        </div>
    )
}

const thread: Record<string, CSSProperties> = {
    root: {
        width: '100%',
        minHeight: '100vh',
        color: '#dee2f2',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflowX: 'hidden',
    },
    bgGlow1: {
        position: 'absolute',
        top: '10%',
        left: '-20%',
        width: 700,
        height: 700,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(60px)',
        background:
            'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 60%)',
    },
    bgGlow2: {
        position: 'absolute',
        top: '50%',
        right: '-20%',
        width: 700,
        height: 700,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(60px)',
        background:
            'radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 60%)',
    },

    nav: {
        position: 'fixed',
        top: '50%',
        left: 32,
        zIndex: 20,
        background: 'rgba(14,19,30,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(129,140,248,0.15)',
        borderRadius: 16,
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 180,
        transition: 'opacity .3s, transform .3s',
    },
    navKicker: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9.5,
        letterSpacing: 1.5,
        color: '#38bdf8',
        padding: '0 8px 10px',
        borderBottom: '1px solid rgba(129,140,248,0.15)',
        marginBottom: 6,
    },
    navList: { display: 'flex', flexDirection: 'column', gap: 1 },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 8px',
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        color: '#c4c5d5',
        fontFamily: 'inherit',
        fontSize: 12.5,
        cursor: 'pointer',
        transition: 'all .2s',
        textAlign: 'left',
    },
    navItemActive: { background: 'rgba(56,189,248,0.1)', color: '#dee2f2' },
    navDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'rgba(129,140,248,0.25)',
        flexShrink: 0,
        transition: 'all .25s',
    },
    navDotActive: {
        background: '#38bdf8',
        boxShadow: '0 0 10px #38bdf8',
        transform: 'scale(1.4)',
    },
    navDotPast: { background: '#3b82f6' },
    navNum: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        color: '#c4c5d5',
        opacity: 0.6,
        width: 18,
    },
    navLabel: { fontWeight: 500 },

    hero: { marginBottom: 80, maxWidth: 780 },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        borderRadius: 999,
        background: 'rgba(27,31,43,0.7)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(129,140,248,0.25)',
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: 0.3,
        color: '#c4c5d5',
        marginBottom: 32,
    },
    heroTagDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#38bdf8',
        boxShadow: '0 0 14px #38bdf8',
    },
    heroTitle: {
        fontSize: 'clamp(36px, 5.5vw, 72px)',
        lineHeight: 1.04,
        letterSpacing: -2.2,
        fontWeight: 600,
        margin: '0 0 28px',
    },
    heroTitleAccent: {
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontStyle: 'italic',
        fontWeight: 500,
    },
    heroSub: {
        fontSize: 19,
        lineHeight: 1.6,
        color: '#c4c5d5',
        maxWidth: 600,
        margin: '0 0 40px',
    },
    heroMeta: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 56 },
    heroScrollHint: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: 1.5,
        color: '#38bdf8',
        textTransform: 'uppercase',
    },
    metaPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 10,
        background: 'rgba(27,31,43,0.6)',
        border: '1px solid rgba(129,140,248,0.2)',
        backdropFilter: 'blur(10px)',
    },
    metaPillKey: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        letterSpacing: 1,
        color: '#c4c5d5',
        textTransform: 'uppercase',
    },
    metaPillVal: { fontSize: 14, fontWeight: 500, color: '#dee2f2' },

    timeline: { position: 'relative', paddingTop: 20, paddingBottom: 60 },
    rail: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 2,
        opacity: 0,
        background:
            'linear-gradient(180deg, rgba(129,140,248,0.05) 0%, rgba(129,140,248,0.2) 10%, rgba(129,140,248,0.2) 90%, rgba(129,140,248,0.05) 100%)',
    },
    railFill: {
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 2,
        opacity: 0,
        background: 'linear-gradient(180deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        boxShadow: '0 0 20px rgba(56,189,248,0.6)',
        transition: 'height .15s linear',
    },

    groupHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '24px 0 18px',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: 2,
        color: '#38bdf8',
        textTransform: 'uppercase',
        position: 'relative',
        zIndex: 0,
        background: 'transparent',
    },
    groupHeaderLine: {
        flex: 1,
        height: 1,
        background:
            'linear-gradient(90deg, transparent, rgba(129,140,248,0.25), transparent)',
    },
    groupHeaderText: { whiteSpace: 'nowrap' },

    phase: {
        position: 'relative',
        display: 'grid',
        alignItems: 'start',
        marginBottom: 28,
    },
    phaseLeft: { gridTemplateColumns: '1fr 1fr' },
    phaseRight: { gridTemplateColumns: '1fr 1fr' },

    card: {
        textAlign: 'left',
        background:
            'linear-gradient(180deg, rgba(27,31,43,0.7) 0%, rgba(14,19,30,0.7) 100%)',
        backdropFilter: 'blur(20px)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.18)',
        borderRadius: 18,
        padding: '20px 24px',
        fontFamily: 'inherit',
        color: 'inherit',
        transition: 'all .3s',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2,
    },
    cardLeft: { gridColumn: 1, marginRight: 0 },
    cardRight: { gridColumn: 2, marginLeft: 0 },
    cardActive: {
        borderColor: 'rgba(56,189,248,0.4)',
        boxShadow:
            '0 20px 60px -20px rgba(56,189,248,0.3), 0 0 0 1px rgba(56,189,248,0.15)',
        background:
            'linear-gradient(180deg, rgba(30,40,58,0.8) 0%, rgba(14,19,30,0.8) 100%)',
    },
    cardHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 0,
    },
    cardSubtitle: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        letterSpacing: 1.3,
        color: '#38bdf8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardNum: {
        fontWeight: 600,
        color: '#dee2f2',
        padding: '2px 7px',
        borderRadius: 4,
        background: 'rgba(56,189,248,0.15)',
        border: '1px solid rgba(56,189,248,0.25)',
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontSize: 22,
        lineHeight: 1.1,
        letterSpacing: -0.6,
        fontWeight: 600,
        margin: 0,
        color: '#dee2f2',
    },
    cardTime: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(129,140,248,0.1)',
        border: '1px solid rgba(129,140,248,0.2)',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        letterSpacing: 0.5,
        color: '#c4c5d5',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },
    cardTimeDot: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: '#38bdf8',
    },

    principles: {
        marginTop: 100,
        padding: '56px 40px',
        borderRadius: 24,
        background:
            'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.08) 100%)',
        border: '1px solid rgba(129,140,248,0.2)',
        backdropFilter: 'blur(20px)',
    },
    principlesKicker: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: 2,
        color: '#38bdf8',
        textAlign: 'center',
        marginBottom: 40,
    },
    principlesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 32,
    },
    principle: { textAlign: 'center' },
    principleNum: {
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontSize: 44,
        fontStyle: 'italic',
        lineHeight: 1,
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 16,
    },
    principleTitle: {
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: -0.3,
        marginBottom: 10,
    },
    principleBody: {
        fontSize: 14,
        lineHeight: 1.55,
        color: '#c4c5d5',
        margin: 0,
    },

    cta: {
        marginTop: 100,
        textAlign: 'center',
        padding: '60px 20px',
    },
    ctaTitle: {
        fontSize: 'clamp(32px, 4.5vw, 56px)',
        lineHeight: 1.08,
        letterSpacing: -1.8,
        fontWeight: 600,
        margin: '0 0 20px',
    },
    ctaAccent: {
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontStyle: 'italic',
        fontWeight: 500,
    },
    ctaSub: {
        fontSize: 17,
        color: '#c4c5d5',
        maxWidth: 560,
        margin: '0 auto 40px',
        lineHeight: 1.55,
    },
    ctaRow: {
        display: 'flex',
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    ctaPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '20px 36px',
        borderRadius: 999,
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        color: '#080d18',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: -0.1,
        cursor: 'pointer',
        textDecoration: 'none',
        boxShadow: '0 30px 80px -20px rgba(56,189,248,0.7)',
    },
}
