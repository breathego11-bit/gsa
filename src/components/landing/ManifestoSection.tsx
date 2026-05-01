'use client'

import { useState, useEffect, type CSSProperties } from 'react'

const PILLARS = [
    { num: '01', title: 'Formación completa en ventas high ticket', body: 'Cómo abrir, generar confianza, hacer preguntas profundas, detectar el dolor, presentar la solución, manejar objeciones y cerrar sin presionar. No desde la manipulación — desde la conexión, la escucha y la autoridad.' },
    { num: '02', title: 'Método GSA paso a paso', body: 'Una ruta clara: qué decir, cuándo decirlo, qué observar, cómo leer a la persona y llevar la conversación a una decisión. No copias un guion — desarrollas criterio comercial.' },
    { num: '03', title: 'Acompañamiento semanal', body: 'Espacios cada semana para resolver dudas, revisar bloqueos, corregir errores y mejorar tu comunicación comercial. Una cosa es aprender teoría; otra es aplicarla bien.' },
    { num: '04', title: 'Role plays y práctica real', body: 'La venta se aprende vendiendo. Conversaciones reales, objeciones, cierres y escenarios del mercado. Aquí dejas de sonar como guion y empiezas a sonar como alguien que sabe guiar.' },
    { num: '05', title: 'Corrección de errores comerciales', body: 'El precio, el producto y el cliente rara vez son el problema. El problema suele estar en el marco, la energía, la pregunta que no hiciste, el dolor que no profundizaste. Te enseñamos a verlo.' },
    { num: '06', title: 'Comunidad privada', body: 'Un entorno de personas caminando en la misma dirección. Cuando cambias solo, abandonas; cuando el entorno te recuerda hacia dónde vas, avanzar se vuelve natural.' },
    { num: '07', title: 'iCoach de GSA', body: 'Una herramienta de apoyo para entrenar, resolver dudas y reforzar lo aprendido fuera de las sesiones. No dependes solo de las clases — sigues practicando, preguntando, mejorando.' },
    { num: '08', title: 'Recursos y materiales de apoyo', body: 'Estructuras de llamada, documentos, ejercicios y ejemplos. No queremos que aprendas desordenado — queremos que tengas claridad: qué hacer, cómo hacerlo y por qué.' },
    { num: '09', title: 'Preparación para el mercado', body: 'Tu comunicación, seguridad, mentalidad, entendimiento del sector y capacidad para presentarte. Saber vender importa; saber posicionarte como alguien valioso también.' },
    { num: '10', title: 'Acceso a oportunidades', body: 'Bolsa de trabajo y oportunidades del sector. Terminas con una habilidad, una estructura y una dirección clara para empezar a moverte como closer — no con teoría suelta.' },
]

const MONO = 'var(--font-jetbrains-mono), ui-monospace, monospace'
const SERIF = 'var(--font-instrument-serif), Georgia, serif'

export function ManifestoSection() {
    const [pIdx, setPIdx] = useState(0)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        if (paused) return
        const t = setInterval(() => setPIdx((p) => (p + 1) % PILLARS.length), 5500)
        return () => clearInterval(t)
    }, [paused])

    const pillar = PILLARS[pIdx]

    return (
        <section
            id="manifesto"
            className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-8"
            style={{ color: '#dee2f2' }}
        >
            <div style={s.glow1} aria-hidden />
            <div style={s.glow2} aria-hidden />

            <div className="relative z-10 max-w-7xl mx-auto manifesto-grid" style={s.grid}>
                {/* Left: headline + bullets */}
                <div style={s.leftCol}>
                    <header style={s.brand}>
                        <div style={s.brandBadge}>
                            <span style={s.brandBadgeDot} />
                            <span>Ecosistema de closers · 2026</span>
                        </div>
                    </header>

                    <div style={s.headline}>
                        <div style={s.eyebrow}>NO ENTRAS A UNA FORMACIÓN.</div>
                        <h2 style={s.title}>
                            Entras a un <span style={s.titleAccent}>sistema completo</span> para
                            convertirte en closer.
                        </h2>
                        <p style={s.subtitle}>
                            No va de consumir información. Va de desarrollar una habilidad real.
                            Practicar. Corregir errores. Ganar seguridad.{' '}
                            <em style={s.subEm}>
                                Sostener una conversación de alto valor con una persona real.
                            </em>
                        </p>
                    </div>

                    <ul style={s.bulletList}>
                        {[
                            'Va de practicar.',
                            'Va de corregir errores.',
                            'Va de ganar seguridad.',
                            'Va de aprender a sostener una conversación de alto valor.',
                        ].map((b, i) => (
                            <li key={i} style={s.bullet}>
                                <span style={s.bulletDot} />
                                {b}
                            </li>
                        ))}
                    </ul>

                    <footer style={s.footer}>
                        <div style={s.footerLine}>
                            <span>FORMACIÓN</span><span style={s.footerSep}>·</span>
                            <span>PRÁCTICA</span><span style={s.footerSep}>·</span>
                            <span>ACOMPAÑAMIENTO</span><span style={s.footerSep}>·</span>
                            <span>COMUNIDAD</span>
                        </div>
                        <p style={s.footerQuote}>
                            No necesitas otro curso más.{' '}
                            <em style={s.footerEm}>Necesitas un sistema.</em>
                        </p>
                    </footer>
                </div>

                {/* Right: pillars carousel */}
                <div
                    style={s.pillarsBlock}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    <div style={s.pillarsHead}>
                        <span style={s.pillarsKicker}>ESTO ES LO QUE RECIBES · 10 PILARES</span>
                        <div style={s.pillarsNav}>
                            <button
                                type="button"
                                aria-label="Anterior"
                                onClick={() => setPIdx((p) => (p - 1 + PILLARS.length) % PILLARS.length)}
                                style={s.pNavBtn}
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M8 2L4 6l4 4" />
                                </svg>
                            </button>
                            <span style={s.pNavCounter}>
                                <span style={s.pNavCurrent}>{pillar.num}</span>
                                <span style={s.pNavSep}>/</span>
                                <span style={s.pNavTotal}>10</span>
                            </span>
                            <button
                                type="button"
                                aria-label="Siguiente"
                                onClick={() => setPIdx((p) => (p + 1) % PILLARS.length)}
                                style={s.pNavBtn}
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 2l4 4-4 4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div style={s.pillarCard} key={pIdx}>
                        <div style={s.pillarTitleRow}>
                            <span style={s.pillarNumBadge}>{pillar.num}</span>
                            <h3 style={s.pillarTitle}>{pillar.title}</h3>
                        </div>
                        <p style={s.pillarBody}>{pillar.body}</p>
                        <div style={s.pillarProgress}>
                            <div
                                key={pIdx + (paused ? 'p' : '')}
                                style={{
                                    ...s.pillarProgressFill,
                                    animation: paused ? 'none' : 'authProgress 5.5s linear forwards',
                                }}
                            />
                        </div>
                    </div>

                    <div style={s.chips}>
                        {PILLARS.map((p, i) => (
                            <button
                                type="button"
                                key={p.num}
                                onClick={() => setPIdx(i)}
                                style={{ ...s.chip, ...(i === pIdx ? s.chipActive : {}) }}
                            >
                                {p.num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

const s: Record<string, CSSProperties> = {
    glow1: {
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: 700,
        height: 700,
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(120px)',
        background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 60%)',
    },
    glow2: {
        position: 'absolute',
        bottom: '-15%',
        right: '-5%',
        width: 750,
        height: 750,
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(130px)',
        background: 'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 60%)',
    },

    grid: {
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 'clamp(32px, 5vw, 80px)',
        alignItems: 'start',
    },

    leftCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
    },
    brand: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    brandBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(27,31,43,0.6)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.22)',
        fontSize: 11,
        color: '#c4c5d5',
        fontFamily: MONO,
        letterSpacing: 0.5,
    },
    brandBadgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' },

    headline: { display: 'flex', flexDirection: 'column', gap: 14 },
    eyebrow: {
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: 2,
        color: '#38bdf8',
    },
    title: {
        fontSize: 'clamp(34px, 4vw, 54px)',
        lineHeight: 1.05,
        letterSpacing: -1.6,
        fontWeight: 600,
        margin: 0,
        color: '#dee2f2',
    },
    titleAccent: {
        background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
    },
    subtitle: { fontSize: 16, lineHeight: 1.6, color: '#c4c5d5', margin: 0, maxWidth: 560 },
    subEm: { color: '#dee2f2', fontStyle: 'italic', fontWeight: 500 },

    bulletList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    bullet: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        color: '#c4c5d5',
        fontFamily: MONO,
    },
    bulletDot: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: '#38bdf8',
        boxShadow: '0 0 8px #38bdf8',
    },

    footer: {
        marginTop: 8,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopStyle: 'dashed',
        borderTopColor: 'rgba(129,140,248,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    footerLine: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: 1.4,
        color: '#38bdf8',
    },
    footerSep: { color: '#c4c5d5', opacity: 0.4 },
    footerQuote: { margin: 0, fontSize: 15, color: '#c4c5d5' },
    footerEm: {
        color: '#dee2f2',
        fontStyle: 'italic',
        fontFamily: SERIF,
        fontSize: 18,
        fontWeight: 400,
    },

    pillarsBlock: {
        padding: 24,
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(27,31,43,0.55) 0%, rgba(14,19,30,0.55) 100%)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.2)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'sticky',
        top: 96,
    },
    pillarsHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    pillarsKicker: {
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: 1.5,
        color: '#38bdf8',
    },
    pillarsNav: { display: 'flex', alignItems: 'center', gap: 8 },
    pNavBtn: {
        width: 28,
        height: 28,
        borderRadius: 7,
        padding: 0,
        background: 'rgba(27,31,43,0.7)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.22)',
        color: '#dee2f2',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .2s',
    },
    pNavCounter: {
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        minWidth: 38,
        textAlign: 'center',
    },
    pNavCurrent: { color: '#38bdf8' },
    pNavSep: { color: '#c4c5d5', opacity: 0.5, margin: '0 2px' },
    pNavTotal: { color: '#c4c5d5' },

    pillarCard: {
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'authFadeIn .4s ease-out',
        position: 'relative',
    },
    pillarTitleRow: { display: 'flex', alignItems: 'baseline', gap: 10 },
    pillarNumBadge: {
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: 0.5,
        padding: '3px 8px',
        borderRadius: 5,
        background: 'rgba(56,189,248,0.15)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(56,189,248,0.25)',
        color: '#38bdf8',
        fontWeight: 600,
    },
    pillarTitle: {
        fontSize: 20,
        lineHeight: 1.2,
        letterSpacing: -0.4,
        fontWeight: 600,
        margin: 0,
        color: '#dee2f2',
    },
    pillarBody: { fontSize: 14, lineHeight: 1.6, color: '#c4c5d5', margin: 0 },
    pillarProgress: {
        marginTop: 'auto',
        height: 2,
        background: 'rgba(222,226,242,0.08)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    pillarProgressFill: {
        height: '100%',
        width: 0,
        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
        boxShadow: '0 0 8px #38bdf8',
    },

    chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    chip: {
        minWidth: 32,
        padding: '5px 9px',
        borderRadius: 6,
        background: 'rgba(27,31,43,0.6)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.18)',
        color: '#c4c5d5',
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: 0.5,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .2s',
    },
    chipActive: {
        background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(129,140,248,0.2))',
        borderColor: 'rgba(56,189,248,0.5)',
        color: '#dee2f2',
        boxShadow: '0 0 12px rgba(56,189,248,0.3)',
    },
}
