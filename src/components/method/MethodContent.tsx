'use client'

import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react'

type GoldenQuestion = { q: string; a: string }

type Phase = {
    num: string
    key: string
    title: string
    subtitle: string
    time: string
    group: 'apertura' | 'descubrimiento' | 'presentacion' | 'cierre' | 'post'
    detail: string
    tactics?: string[]
    questions?: GoldenQuestion[]
}

const PHASES: Phase[] = [
    {
        num: '01', key: 'conexion', title: 'Conexión', subtitle: 'Quiebre del escudo',
        time: '2–3 min', group: 'apertura',
        detail: 'Los primeros 2–3 minutos son puro rapport. No vendes, conectas. Encuentras puntos en común auténticos y dejas claro que quien pregunta dirige la conversación.',
        tactics: ['Escucha activa', 'Puntos en común', 'Tono cálido'],
    },
    {
        num: '02', key: 'marco', title: 'Marco', subtitle: 'Toma de control',
        time: '1–2 min', group: 'apertura',
        detail: 'Estableces el encuadre de la llamada: tú decides si hay fit, hay un tiempo acotado, y al final habrá una decisión de pago. El marco se pone una sola vez y sostiene toda la conversación.',
        tactics: ['Encuadre claro', 'Tiempo acotado', 'Pago implícito'],
    },
    {
        num: '03', key: 'diagnostico', title: 'Diagnóstico', subtitle: 'Las 3 preguntas de oro',
        time: '8–10 min', group: 'descubrimiento',
        detail: 'Las tres preguntas de oro estructuran todo el diagnóstico y extraen el material con el que cerrarás después.',
        questions: [
            { q: '¿Qué te trajo aquí?', a: 'Dolor o placer' },
            { q: '¿Qué esperas recibir?', a: 'Resultado deseado' },
            { q: '¿Qué habría cambiado en 6 meses para decir que fue un éxito?', a: 'Visión futura' },
        ],
    },
    {
        num: '04', key: 'espejo', title: 'Espejo', subtitle: 'Reafirmación y confianza',
        time: '2–3 min', group: 'descubrimiento',
        detail: 'Devuelves con tus palabras lo que la persona acaba de decir. No es una técnica, es presencia. La otra persona siente que la escuchaste de verdad.',
        tactics: ['Reencuadre', 'Validación', 'Espacio seguro'],
    },
    {
        num: '05', key: 'autoridad', title: 'Autoridad', subtitle: 'El porqué de confiar',
        time: '3–4 min', group: 'presentacion',
        detail: 'Presentas el método, evidencia y alcance — pero filtrado por lo que ESTA persona necesita oír. No es un pitch genérico: es tu autoridad hablándole a su problema concreto.',
        tactics: ['Método propio', 'Prueba social', 'Casos relevantes'],
    },
    {
        num: '06', key: 'claridad', title: 'Claridad', subtitle: 'Resolver dudas con intención',
        time: '3–5 min', group: 'presentacion',
        detail: 'Revisas el documento previo, resuelves objeciones con calma y te aseguras de que tiene todo lo necesario para decidir ahora — no dentro de tres días.',
        tactics: ['Documento de apoyo', 'Manejo de objeciones', 'Cierre de info'],
    },
    {
        num: '07', key: 'anclaje', title: 'Anclaje de valor', subtitle: 'El precio como inversión',
        time: '2–3 min', group: 'cierre',
        detail: 'Antes de pronunciar el precio, recapitulas todo el valor incluido. Dices el número con claridad y sostienes el silencio. Quien habla primero después del precio, pierde.',
        tactics: ['Recap de valor', 'Precio claro', 'Silencio post-precio'],
    },
    {
        num: '08', key: 'cierre', title: 'Cierre consciente', subtitle: 'Acción en el momento presente',
        time: '3–5 min', group: 'cierre',
        detail: 'Guías al pago con seguridad total. Manejas las resistencias del ego con la pregunta clave: ¿reafirmas amor o reafirmas miedo? Enlace en llamada. Si no hay cierre total, reserva mínima.',
        tactics: ['Enlace en vivo', '¿Amor o miedo?', 'Reserva mínima'],
    },
    {
        num: '09', key: 'post', title: 'Post-cierre', subtitle: 'Sostener o sembrar',
        time: '24–48h', group: 'post',
        detail: 'Si cerró, sostienes la decisión con onboarding cálido. Si no cerró, siembras: biblioteca de recursos, seguimiento sin presión, próxima reunión en 24–48h.',
        tactics: ['Onboarding cálido', 'Recursos', 'Follow-up sin presión'],
    },
]

const GROUP_LABELS: Record<Phase['group'], string> = {
    apertura: 'Apertura · Estado & marco',
    descubrimiento: 'Descubrimiento · Diagnóstico',
    presentacion: 'Presentación · Autoridad',
    cierre: 'Cierre · Decisión consciente',
    post: 'Después · Sostener',
}

export function MethodContent() {
    const [activeIdx, setActiveIdx] = useState(0)
    const [progress, setProgress] = useState(0)
    const [navVisible, setNavVisible] = useState(false)
    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const phaseRefs = useRef<(HTMLDivElement | null)[]>([])
    const lineRef = useRef<HTMLDivElement | null>(null)
    const rootRef = useRef<HTMLDivElement | null>(null)

    const toggle = (i: number) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(i)) next.delete(i)
            else next.add(i)
            return next
        })

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
            /* El padding-bottom de 128px reserva el hueco del BottomNav: /dashboard/method
               y /admin/method son rutas full-bleed, así que no reciben el pb-28 del wrapper. */
            .gsa-thread-inner { padding: 32px 16px 128px; max-width: 100%; margin: 0 auto; position: relative; z-index: 1; }
            @media (min-width: 900px) {
                .gsa-thread-inner { padding: 40px 24px 128px 240px; max-width: 1280px; }
            }
            @media (min-width: 1024px) {
                .gsa-thread-inner { padding-bottom: 60px; }
                .gsa-thread-nav { left: 272px !important; }
            }
            @media (max-width: 900px) {
                .gsa-thread-nav { display: none !important; }
                /* El timeline en zig-zag se apila: el grid de 2 columnas dejaba tarjetas
                   de ~171px con títulos de 22px, y el conector en curva no tiene sentido
                   cuando las fases van una debajo de otra. */
                .gsa-phase { grid-template-columns: 1fr !important; }
                .gsa-card { grid-column: 1 !important; margin-left: 0 !important; margin-right: 0 !important; }
                .gsa-zig { display: none !important; }
            }
        `
        document.head.appendChild(s)
    }, [])

    // Scroll-driven: active phase + progress line fill + nav visibility.
    useEffect(() => {
        const scrollEl =
            (rootRef.current?.closest('main') as HTMLElement | null) ?? null
        const target: HTMLElement | Window = scrollEl ?? window

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
        target.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
        window.addEventListener('resize', onScroll)
        return () => {
            target.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [])

    const scrollToPhase = (i: number) => {
        const el = phaseRefs.current[i]
        if (!el) return
        const scrollEl =
            (rootRef.current?.closest('main') as HTMLElement | null) ?? null
        if (scrollEl) {
            const containerRect = scrollEl.getBoundingClientRect()
            const elRect = el.getBoundingClientRect()
            scrollEl.scrollTo({
                top:
                    scrollEl.scrollTop +
                    (elRect.top - containerRect.top) -
                    window.innerHeight * 0.35,
                behavior: 'smooth',
            })
        } else {
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
        <section className="gsa-thread-inner" style={thread.root} ref={rootRef}>
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
                                    className="gsa-phase"
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

                                    <button
                                        type="button"
                                        onClick={() => toggle(i)}
                                        className="gsa-card"
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

                                        <div
                                            style={{
                                                ...thread.cardExpand,
                                                maxHeight: expanded.has(i) ? 600 : 0,
                                                opacity: expanded.has(i) ? 1 : 0,
                                                marginTop: expanded.has(i) ? 18 : 0,
                                            }}
                                        >
                                            <p style={thread.cardDetail}>{p.detail}</p>

                                            {p.questions && (
                                                <div style={thread.questions}>
                                                    {p.questions.map((q, qi) => (
                                                        <div key={qi} style={thread.question}>
                                                            <div style={thread.questionQ}>
                                                                <span style={thread.questionIdx}>0{qi + 1}</span>
                                                                <span>{q.q}</span>
                                                            </div>
                                                            <div style={thread.questionAnswerRow}>
                                                                <span style={thread.questionArrow}>↳</span>
                                                                <span style={thread.questionA}>{q.a}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {p.tactics && (
                                                <div style={thread.tactics}>
                                                    {p.tactics.map((t, ti) => (
                                                        <span key={ti} style={thread.tactic}>{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div style={thread.cardToggle}>
                                            <span>{expanded.has(i) ? 'Cerrar' : 'Ver detalle'}</span>
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 12 12"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                style={{
                                                    transform: expanded.has(i) ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform .25s',
                                                }}
                                            >
                                                <path d="M2 4l4 4 4-4" />
                                            </svg>
                                        </div>
                                    </button>
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
            className="gsa-zig"
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
        filter: 'blur(60px)'
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
        filter: 'blur(60px)'
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

    hero: { marginBottom: 80, maxWidth: 780, position: 'relative', zIndex: 1 },
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

    timeline: { position: 'relative', zIndex: 1, paddingTop: 20, paddingBottom: 60 },
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
        cursor: 'pointer',
        width: '100%',
        display: 'block',
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

    cardExpand: {
        overflow: 'hidden',
        transition: 'max-height .35s ease, opacity .25s, margin-top .25s',
    },
    cardDetail: {
        fontSize: 14.5,
        lineHeight: 1.6,
        color: '#dee2f2',
        margin: '0 0 18px',
        paddingTop: 18,
        borderTop: '1px dashed rgba(129,140,248,0.2)',
    },

    questions: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 16,
    },
    question: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 10,
        background: 'rgba(56,189,248,0.06)',
        border: '1px solid rgba(56,189,248,0.15)',
    },
    questionQ: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        fontSize: 13.5,
        color: '#dee2f2',
        lineHeight: 1.4,
    },
    questionIdx: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
        color: '#38bdf8',
        fontWeight: 500,
        marginTop: 2,
        flexShrink: 0,
    },
    questionAnswerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 22,
    },
    questionArrow: { color: '#38bdf8', fontSize: 13, opacity: 0.8 },
    questionA: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: 0.5,
        color: '#c4c5d5',
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(129,140,248,0.12)',
        textTransform: 'lowercase',
    },

    tactics: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    tactic: {
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(129,140,248,0.08)',
        border: '1px solid rgba(129,140,248,0.18)',
        fontSize: 12,
        color: '#c4c5d5',
    },

    cardToggle: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: 1,
        color: '#38bdf8',
        textTransform: 'uppercase',
    },

    principles: {
        marginTop: 100,
        padding: '56px 40px',
        borderRadius: 24,
        background:
            'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.08) 100%)',
        border: '1px solid rgba(129,140,248,0.2)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 1,
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
}
