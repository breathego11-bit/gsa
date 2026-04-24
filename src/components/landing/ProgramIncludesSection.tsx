'use client'

import { useEffect, useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

type Pillar = {
    key: string
    num: string
    icon: string
    title: string
    subtitle: string
    body: string
    tags: string[]
    shortLabel: string
    hue: number
}

const PILLARS: Pillar[] = [
    {
        key: 'conexion',
        num: '01',
        icon: 'psychology',
        title: 'Desarrollo de habilidades de conexión humana',
        subtitle: 'Creación de relaciones',
        body: 'Aprende a generar confianza genuina, escuchar activamente y construir vínculos duraderos con cada cliente.',
        tags: ['Empatía', 'Escucha activa', 'Confianza'],
        shortLabel: 'Conexión humana',
        hue: 200,
    },
    {
        key: 'tecnicas',
        num: '02',
        icon: 'trending_up',
        title: 'Técnicas avanzadas de venta consciente',
        subtitle: 'Cierre ético',
        body: 'Domina metodologías de cierre éticas que priorizan el valor real para el cliente, no la presión.',
        tags: ['Metodología GSA', 'Valor real', 'Sin presión'],
        shortLabel: 'Venta consciente',
        hue: 215,
    },
    {
        key: 'comunidad',
        num: '03',
        icon: 'diamond',
        title: 'Comunidad privada',
        subtitle: 'Red exclusiva',
        body: 'Forma parte de un grupo exclusivo de vendedores comprometidos donde compartir experiencias, estrategias y apoyo mutuo.',
        tags: ['Networking', 'Peer support', 'Estrategias'],
        shortLabel: 'Comunidad',
        hue: 225,
    },
    {
        key: 'sesiones',
        num: '04',
        icon: 'hub',
        title: 'Sesiones en vivo',
        subtitle: 'Mentoría directa',
        body: 'Participa en sesiones interactivas con mentores expertos para resolver dudas, practicar cierres y recibir feedback en tiempo real.',
        tags: ['En vivo', 'Feedback', 'Práctica real'],
        shortLabel: 'Sesiones en vivo',
        hue: 210,
    },
]

const AUTO_MS = 7000

const META: { k: string; v: string }[] = [
    { k: 'Duración', v: '12 semanas' },
    { k: 'Sesiones en vivo', v: 'Semanales' },
    { k: 'Comunidad', v: 'Acceso de por vida' },
    { k: 'Certificación', v: 'GSA Closer' },
]

export function ProgramIncludesSection() {
    const [active, setActive] = useState(0)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        if (paused) return
        const advance = setTimeout(() => {
            setActive((a) => (a + 1) % PILLARS.length)
        }, AUTO_MS)
        return () => clearTimeout(advance)
    }, [active, paused])

    const goTo = (i: number) => {
        setActive(i)
        setPaused(true)
    }
    const next = () => goTo((active + 1) % PILLARS.length)
    const prev = () => goTo((active - 1 + PILLARS.length) % PILLARS.length)

    const current = PILLARS[active]

    return (
        <section
            id="features"
            className="relative overflow-hidden"
            style={{
                color: '#dee2f2',
                padding: '120px 0 100px',
            }}
        >
            <style>{`
                @keyframes gsa-fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes gsa-slide-in {
                    from { opacity: 0; transform: translateX(-12px) scale(0.98); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes gsa-tab-progress {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>

            {/* Glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 600, height: 600,
                    top: '5%', left: '-10%',
                    filter: 'blur(60px)',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 60%)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 600, height: 600,
                    bottom: '10%', right: '-10%',
                    filter: 'blur(60px)',
                    background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 60%)',
                }}
            />

            <div className="relative z-10 max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-20">
                {/* Header */}
                <header className="mb-14 max-w-[800px]">
                    <div className="flex flex-wrap justify-between items-center gap-5 mb-8">
                        <div
                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl"
                            style={{
                                background: 'rgba(27,31,43,0.7)',
                                border: '1px solid rgba(129,140,248,0.25)',
                                fontSize: 12.5,
                                fontWeight: 500,
                                color: '#c4c5d5',
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: '#38bdf8', boxShadow: '0 0 14px #38bdf8' }}
                            />
                            El programa · 4 pilares
                        </div>
                        <div
                            className="flex items-center gap-2.5"
                            style={{
                                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                fontSize: 11,
                                letterSpacing: 1.2,
                            }}
                        >
                            <span style={{ color: '#c4c5d5', opacity: 0.7 }}>PROGRAMA</span>
                            <span style={{ color: '#38bdf8' }}>GSA · 2026</span>
                        </div>
                    </div>
                    <h2
                        className="font-semibold"
                        style={{
                            fontSize: 'clamp(40px, 6vw, 64px)',
                            lineHeight: 1.05,
                            letterSpacing: '-2px',
                            margin: '0 0 24px',
                        }}
                    >
                        Qué incluye el
                        <br />
                        <span
                            style={{
                                background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                fontStyle: 'italic',
                                fontWeight: 500,
                            }}
                        >
                            programa GSA
                        </span>
                    </h2>
                    <p style={{ fontSize: 18, lineHeight: 1.6, color: '#c4c5d5', maxWidth: 680, margin: 0 }}>
                        Cuatro pilares que trabajan juntos: las habilidades humanas que sostienen la venta,
                        las técnicas que la hacen precisa, la comunidad que la acompaña y la mentoría que
                        la afila semana a semana.
                    </p>
                </header>

                {/* Tabs */}
                <div
                    role="tablist"
                    className="grid grid-cols-2 md:grid-cols-4 gap-0.5 backdrop-blur-xl mb-6"
                    style={{
                        padding: 4,
                        borderRadius: 16,
                        background: 'rgba(14,19,30,0.6)',
                        border: '1px solid rgba(129,140,248,0.15)',
                    }}
                >
                    {PILLARS.map((p, i) => {
                        const isActive = i === active
                        return (
                            <button
                                key={p.key}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => goTo(i)}
                                className="relative overflow-hidden flex items-center gap-3 text-left border-0 cursor-pointer transition-all"
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 12,
                                    background: isActive
                                        ? 'linear-gradient(180deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))'
                                        : 'transparent',
                                    color: isActive ? '#dee2f2' : '#c4c5d5',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <span
                                    className="flex items-center justify-center shrink-0"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 9,
                                        background: 'rgba(27,31,43,0.8)',
                                        border: '1px solid rgba(129,140,248,0.2)',
                                        color: '#38bdf8',
                                    }}
                                >
                                    <MaterialIcon name={p.icon} size="text-lg" />
                                </span>
                                <span className="flex flex-col gap-0.5 min-w-0">
                                    <span
                                        style={{
                                            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                            fontSize: 10,
                                            letterSpacing: 1,
                                            color: '#38bdf8',
                                            opacity: 0.9,
                                        }}
                                    >
                                        {p.num}
                                    </span>
                                    <span className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>
                                        {p.shortLabel}
                                    </span>
                                </span>
                                {isActive && (
                                    <span
                                        aria-hidden
                                        className="absolute bottom-0 left-0 right-0"
                                        style={{ height: 2, background: 'rgba(129,140,248,0.15)' }}
                                    />
                                )}
                                {isActive && !paused && (
                                    <span
                                        key={`progress-${active}`}
                                        aria-hidden
                                        className="absolute bottom-0 left-0 right-0"
                                        style={{
                                            height: 2,
                                            transformOrigin: '0% 50%',
                                            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                                            boxShadow: '0 0 8px rgba(56,189,248,0.6)',
                                            animation: `gsa-tab-progress ${AUTO_MS}ms linear forwards`,
                                        }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Showcase panel */}
                <div
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 mb-7 backdrop-blur-xl"
                    style={{
                        padding: 32,
                        borderRadius: 24,
                        background: 'linear-gradient(135deg, rgba(27,31,43,0.7) 0%, rgba(14,19,30,0.7) 100%)',
                        border: '1px solid rgba(129,140,248,0.2)',
                        minHeight: 440,
                    }}
                >
                    <div
                        key={`img-${active}`}
                        className="relative"
                        style={{ minHeight: 380, animation: 'gsa-slide-in .5s cubic-bezier(.2,.7,.3,1)' }}
                    >
                        <PillarImage pillar={current} />
                    </div>

                    <div
                        key={`body-${active}`}
                        className="flex flex-col py-5"
                        style={{ animation: 'gsa-fade-in .5s ease-out' }}
                    >
                        <div
                            style={{
                                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                fontSize: 12,
                                letterSpacing: 2,
                                color: '#38bdf8',
                                textTransform: 'uppercase',
                                marginBottom: 16,
                            }}
                        >
                            {current.num} — {current.subtitle}
                        </div>
                        <h3
                            className="font-semibold"
                            style={{
                                fontSize: 'clamp(28px, 3.5vw, 38px)',
                                lineHeight: 1.1,
                                letterSpacing: '-1.2px',
                                margin: '0 0 20px',
                            }}
                        >
                            {current.title}
                        </h3>
                        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: '#c4c5d5', margin: '0 0 28px' }}>
                            {current.body}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-8">
                            {current.tags.map((t) => (
                                <span
                                    key={t}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 999,
                                        background: 'rgba(56,189,248,0.1)',
                                        border: '1px solid rgba(56,189,248,0.25)',
                                        fontSize: 12.5,
                                        color: '#dee2f2',
                                    }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                        <div
                            className="mt-auto pt-5 flex justify-between items-center"
                            style={{ borderTop: '1px dashed rgba(129,140,248,0.2)' }}
                        >
                            <div
                                className="flex items-baseline gap-1"
                                style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                            >
                                <span style={{ fontSize: 24, fontWeight: 500, color: '#dee2f2' }}>
                                    {current.num}
                                </span>
                                <span style={{ fontSize: 18, color: '#c4c5d5', opacity: 0.5 }}>/</span>
                                <span style={{ fontSize: 16, color: '#c4c5d5', opacity: 0.7 }}>04</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={prev}
                                    aria-label="Anterior"
                                    className="flex items-center justify-center cursor-pointer transition-all hover:-translate-y-0.5"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(27,31,43,0.8)',
                                        border: '1px solid rgba(129,140,248,0.25)',
                                        color: '#dee2f2',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <path d="M10 3L5 8l5 5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={next}
                                    aria-label="Siguiente"
                                    className="flex items-center justify-center cursor-pointer transition-all hover:-translate-y-0.5"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(27,31,43,0.8)',
                                        border: '1px solid rgba(129,140,248,0.25)',
                                        color: '#dee2f2',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                        <path d="M6 3l5 5-5 5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dots */}
                <div className="flex gap-2 justify-center mb-14">
                    {PILLARS.map((p, i) => {
                        const isActive = i === active
                        return (
                            <button
                                key={p.key}
                                onClick={() => goTo(i)}
                                aria-label={`Pilar ${i + 1}`}
                                className="border-0 p-0 cursor-pointer transition-all"
                                style={{
                                    height: 8,
                                    width: isActive ? 28 : 8,
                                    borderRadius: 4,
                                    background: isActive
                                        ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
                                        : 'rgba(129,140,248,0.25)',
                                    boxShadow: isActive ? '0 0 10px rgba(56,189,248,0.5)' : 'none',
                                }}
                            />
                        )
                    })}
                </div>

                {/* Meta strip */}
                <div
                    className="grid grid-cols-2 md:grid-cols-4 gap-0.5"
                    style={{
                        padding: 2,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(129,140,248,0.12) 40%, rgba(129,140,248,0.2))',
                    }}
                >
                    {META.map((m) => (
                        <div
                            key={m.k}
                            className="flex flex-col gap-1.5 backdrop-blur-xl"
                            style={{
                                padding: '22px 24px',
                                background: 'rgba(14,19,30,0.75)',
                                borderRadius: 14,
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                    fontSize: 10.5,
                                    letterSpacing: 1.3,
                                    color: '#c4c5d5',
                                    textTransform: 'uppercase',
                                    opacity: 0.75,
                                }}
                            >
                                {m.k}
                            </span>
                            <span style={{ fontSize: 19, fontWeight: 500, color: '#dee2f2', letterSpacing: '-0.3px' }}>
                                {m.v}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function PillarImage({ pillar }: { pillar: Pillar }) {
    const { hue, icon, num } = pillar
    const gid = `gsa-prog-grid-${hue}`
    return (
        <div
            className="w-full h-full relative overflow-hidden"
            style={{
                borderRadius: 20,
                background: `linear-gradient(155deg, oklch(0.38 0.14 ${hue}) 0%, oklch(0.22 0.1 ${hue + 10}) 50%, oklch(0.12 0.06 ${hue + 20}) 100%)`,
            }}
        >
            <div
                aria-hidden
                className="absolute"
                style={{
                    top: '15%',
                    left: '30%',
                    width: '70%',
                    height: '70%',
                    background: `radial-gradient(circle, oklch(0.75 0.18 ${hue} / 0.4) 0%, transparent 60%)`,
                    filter: 'blur(20px)',
                }}
            />
            <svg width="100%" height="100%" className="absolute inset-0" style={{ opacity: 0.25 }}>
                <defs>
                    <pattern id={gid} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(222,226,242,0.3)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${gid})`} />
            </svg>
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    color: 'rgba(222,226,242,0.9)',
                    transform: 'scale(4)',
                    filter: 'drop-shadow(0 10px 40px rgba(56,189,248,0.4))',
                    animation: 'gsa-fade-in .5s ease-out',
                }}
            >
                <MaterialIcon name={icon} size="text-lg" />
            </div>
            <div
                className="absolute"
                style={{
                    top: 28,
                    left: 28,
                    fontFamily: '"Instrument Serif", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 96,
                    lineHeight: 0.9,
                    color: 'rgba(222,226,242,0.25)',
                    letterSpacing: -2,
                }}
            >
                {num}
            </div>
            <div
                aria-hidden
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,13,24,0.5) 100%)',
                }}
            />
        </div>
    )
}
