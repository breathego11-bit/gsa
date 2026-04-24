'use client'

import { useEffect, useState } from 'react'

type Slide = {
    key: string
    title: string
    role: string
    image: string
    alt: string
}

const SLIDES: Slide[] = [
    {
        key: 'ivan',
        title: 'IVÁN ABAD',
        role: 'Cofundador · Visión y liderazgo comercial',
        image: '/ivan.PNG',
        alt: 'Retrato de Iván Abad',
    },
    {
        key: 'pau',
        title: 'PAU OLMOS',
        role: 'Cofundador · De alumno a socio',
        image: '/pau.png',
        alt: 'Retrato de Pau Olmos',
    },
]

const AUTO_MS = 7000

export function AboutSection() {
    return (
        <section
            id="about"
            className="relative overflow-hidden lg:h-screen lg:min-h-[720px]"
            style={{ color: '#dee2f2' }}
        >
            <style>{`
                @keyframes somosProgress { from { width: 0%; } to { width: 100%; } }
            `}</style>

            {/* Ambient glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 600, height: 600,
                    top: '-8%', left: '-8%',
                    filter: 'blur(90px)',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 60%)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 650, height: 650,
                    bottom: '-10%', right: '-5%',
                    filter: 'blur(100px)',
                    background: 'radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 60%)',
                }}
            />

            <div
                className="relative z-10 h-full max-w-[1280px] mx-auto flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,0.85fr)_1.15fr] lg:grid-rows-[auto_auto_auto_auto] lg:content-center lg:gap-x-12 lg:gap-y-4"
                style={{
                    padding: 'clamp(48px, 7vh, 88px) clamp(24px, 5vw, 72px)',
                }}
            >
                {/* ── Foto (móvil: 3º · desktop: col-1 spans all rows) ── */}
                <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-end-5 relative">
                    <div
                        aria-hidden
                        className="absolute pointer-events-none"
                        style={{
                            inset: -30,
                            borderRadius: 32,
                            background: 'radial-gradient(ellipse, rgba(56,189,248,0.22) 0%, transparent 65%)',
                            filter: 'blur(40px)',
                            zIndex: 0,
                        }}
                    />
                    <FoundersCarousel />
                </div>

                {/* Header (móvil: 1º · desktop: col-2 row-1) */}
                <header className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 flex flex-col gap-2">
                        <div
                            className="self-start inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full backdrop-blur-xl"
                            style={{
                                background: 'rgba(27,31,43,0.7)',
                                border: '1px solid rgba(129,140,248,0.25)',
                                fontSize: 11.5,
                                fontWeight: 500,
                                color: '#c4c5d5',
                            }}
                        >
                            <span
                                className="rounded-full"
                                style={{ width: 5, height: 5, background: '#38bdf8', boxShadow: '0 0 12px #38bdf8' }}
                            />
                            Quiénes estamos detrás
                        </div>
                        <h1
                            className="font-semibold m-0"
                            style={{
                                fontSize: 'clamp(32px, 4.2vw, 56px)',
                                lineHeight: 1.05,
                                letterSpacing: '-1.8px',
                            }}
                        >
                            Somos <span style={titleAccent}>Iván Abad</span> y{' '}
                            <span style={titleAccent}>Pau Olmos</span>
                        </h1>
                        <p
                            className="m-0"
                            style={{
                                fontSize: 'clamp(14px, 1.35vw, 17px)',
                                lineHeight: 1.5,
                                color: '#dee2f2',
                                maxWidth: 620,
                            }}
                        >
                            Growth Sales Academy nació de una verdad muy simple: una habilidad puede
                            cambiarte la vida, pero solo si también cambia la persona que la sostiene.
                        </p>
                    </header>

                {/* Cuerpo (móvil: 2º · desktop: col-2 row-2) */}
                <div
                    className="order-2 lg:order-none lg:col-start-2 lg:row-start-2 flex flex-col gap-2 pt-2"
                    style={{ borderTop: '1px solid rgba(129,140,248,0.18)' }}
                >
                        <p style={paraStyle}>
                            Creamos esta academia para personas que sienten que no han venido a
                            esta vida a conformarse. <em style={emStyle}>Personas con hambre, con
                            sensibilidad, con ambición</em> y con algo dentro que les dice que
                            pueden vivir de otra manera. Personas que quieren una profesión real,
                            ingresos reales y una transformación real.
                        </p>
                        <p style={paraStyle}>
                            <strong style={strongStyle}>Iván</strong> aporta la visión, la
                            experiencia, el liderazgo comercial y más de 7 años dedicados al mundo
                            de las ventas. <strong style={strongStyle}>Pau</strong> representa una
                            parte muy especial de esta historia: empezó como alumno, creció dentro
                            del proceso, demostró su nivel y hoy construye esta academia mano a
                            mano como socio. Eso resume perfectamente lo que creemos: que{' '}
                            <em style={emStyle}>
                                cuando alguien recibe la guía correcta y se compromete de verdad,
                                puede evolucionar hasta convertirse en referente.
                            </em>
                        </p>
                    </div>

                {/* Misión / Visión (móvil: 4º · desktop: col-2 row-3) */}
                <div
                    className="order-4 lg:order-none lg:col-start-2 lg:row-start-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-2.5"
                    style={{
                        borderTop: '1px dashed rgba(129,140,248,0.2)',
                        borderBottom: '1px dashed rgba(129,140,248,0.2)',
                    }}
                >
                        <div className="flex flex-col gap-1.5">
                            <div style={pillarLabelStyle}>MISIÓN</div>
                            <div style={pillarTextStyle}>
                                Formar closers{' '}
                                <strong style={pillarStrongStyle}>
                                    sólidos, humanos y preparados.
                                </strong>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div style={pillarLabelStyle}>VISIÓN</div>
                            <div style={pillarTextStyle}>
                                Una nueva generación de vendedores que no solo gane dinero, sino
                                también{' '}
                                <strong style={pillarStrongStyle}>
                                    dirección, identidad y libertad.
                                </strong>
                            </div>
                        </div>
                    </div>

                {/* Manifesto (móvil: 5º · desktop: col-2 row-4) */}
                <div
                    className="order-5 lg:order-none lg:col-start-2 lg:row-start-4 relative overflow-hidden backdrop-blur-xl"
                    style={{
                        padding: 'clamp(16px, 2vw, 22px) clamp(18px, 2.2vw, 24px)',
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.06) 100%)',
                        border: '1px solid rgba(129,140,248,0.22)',
                    }}
                >
                        <div
                            aria-hidden
                            className="absolute pointer-events-none"
                            style={{
                                top: -8,
                                left: 16,
                                fontFamily: '"Instrument Serif", Georgia, serif',
                                fontSize: 88,
                                lineHeight: 1,
                                color: 'rgba(56,189,248,0.22)',
                            }}
                        >
                            “
                        </div>
                        <p
                            className="relative m-0 mb-1"
                            style={{
                                fontSize: 'clamp(13px, 1.15vw, 15px)',
                                lineHeight: 1.45,
                                color: '#c4c5d5',
                            }}
                        >
                            No estamos aquí para enseñarte a{' '}
                            <em
                                style={{
                                    textDecoration: 'line-through',
                                    textDecorationColor: 'rgba(248,113,113,0.8)',
                                    textDecorationThickness: 2,
                                    fontStyle: 'italic',
                                    opacity: 0.75,
                                }}
                            >
                                &quot;vender más&quot;
                            </em>
                            .
                        </p>
                        <p
                            className="relative m-0 font-medium"
                            style={{
                                fontSize: 'clamp(15px, 1.55vw, 19px)',
                                lineHeight: 1.35,
                                color: '#dee2f2',
                                letterSpacing: '-0.2px',
                            }}
                        >
                        Estamos aquí para ayudarte a convertirte en alguien capaz de
                        <span style={mfAccent}> sostener una vida más grande.</span>
                    </p>
                </div>
            </div>
        </section>
    )
}

function FoundersCarousel() {
    const [i, setI] = useState(0)
    const [dir, setDir] = useState<1 | -1>(1)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        if (paused) return
        const t = setInterval(() => {
            setDir(1)
            setI((p) => (p + 1) % SLIDES.length)
        }, AUTO_MS)
        return () => clearInterval(t)
    }, [paused])

    const go = (d: 1 | -1) => {
        setDir(d)
        setI((prev) => (prev + d + SLIDES.length) % SLIDES.length)
    }

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative w-full max-w-[400px] mx-auto overflow-hidden aspect-[4/5] lg:max-w-none lg:mx-0 lg:aspect-auto lg:h-full"
            style={{
                borderRadius: 20,
                zIndex: 1,
                boxShadow:
                    '0 30px 80px -20px rgba(56,189,248,0.35), 0 0 0 1px rgba(129,140,248,0.22), inset 0 0 80px rgba(56,189,248,0.08)',
            }}
        >
            {/* Slides stack */}
            {SLIDES.map((s, idx) => (
                <div
                    key={s.key}
                    className="absolute inset-0"
                    style={{
                        transition:
                            'opacity .7s cubic-bezier(.4,0,.2,1), transform .9s cubic-bezier(.4,0,.2,1)',
                        willChange: 'opacity, transform',
                        opacity: idx === i ? 1 : 0,
                        transform:
                            idx === i ? 'scale(1)' : `scale(1.04) translateX(${dir * 12}px)`,
                        zIndex: idx === i ? 1 : 0,
                    }}
                >
                    <img
                        src={s.image}
                        alt={s.alt}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse at center, transparent 40%, rgba(8,13,24,0.55) 100%)',
                        }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            opacity: 0.13,
                            mixBlendMode: 'overlay',
                            backgroundImage:
                                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.5'/></svg>\")",
                        }}
                    />
                </div>
            ))}

            {/* Top: counter */}
            <div
                className="absolute top-3.5 left-3.5 right-3.5 z-[4] flex justify-between items-center pointer-events-none"
            >
                <div
                    className="inline-flex items-baseline gap-[3px] backdrop-blur-md"
                    style={{
                        padding: '5px 11px',
                        borderRadius: 999,
                        background: 'rgba(8,13,24,0.7)',
                        border: '1px solid rgba(129,140,248,0.22)',
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        fontSize: 10,
                        letterSpacing: 1,
                        fontWeight: 600,
                    }}
                >
                    <span style={{ color: '#38bdf8' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ color: '#c4c5d5', opacity: 0.5 }}>/</span>
                    <span style={{ color: '#c4c5d5' }}>{String(SLIDES.length).padStart(2, '0')}</span>
                </div>
                <div
                    className="backdrop-blur-md"
                    style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'rgba(8,13,24,0.6)',
                        border: '1px solid rgba(129,140,248,0.22)',
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        fontSize: 9.5,
                        letterSpacing: 1.2,
                        color: '#c4c5d5',
                    }}
                >
                    ● fundadores
                </div>
            </div>

            {/* Arrows */}
            <button
                aria-label="Foto anterior"
                onClick={() => go(-1)}
                className="absolute top-1/2 z-[5] flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:scale-105"
                style={{
                    left: 14,
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(8,13,24,0.55)',
                    border: '1px solid rgba(222,226,242,0.25)',
                    color: '#dee2f2',
                    padding: 0,
                    boxShadow: '0 6px 20px rgba(8,13,24,0.4)',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3L4.5 7 9 11" />
                </svg>
            </button>
            <button
                aria-label="Foto siguiente"
                onClick={() => go(1)}
                className="absolute top-1/2 z-[5] flex items-center justify-center cursor-pointer backdrop-blur-md transition-all hover:scale-105"
                style={{
                    right: 14,
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(8,13,24,0.55)',
                    border: '1px solid rgba(222,226,242,0.25)',
                    color: '#dee2f2',
                    padding: 0,
                    boxShadow: '0 6px 20px rgba(8,13,24,0.4)',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l4.5 4L5 11" />
                </svg>
            </button>

            {/* Bottom caption + dots */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[4] flex justify-between items-end gap-3">
                <div
                    className="flex flex-col gap-0.5 min-w-0 backdrop-blur-lg"
                    style={{
                        padding: '9px 13px',
                        borderRadius: 12,
                        background: 'rgba(8,13,24,0.65)',
                        border: '1px solid rgba(129,140,248,0.22)',
                    }}
                >
                    <div className="flex items-center gap-[7px]">
                        <span
                            className="flex-shrink-0 rounded-full"
                            style={{ width: 5, height: 5, background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}
                        />
                        <span
                            className="truncate font-semibold"
                            style={{
                                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                fontSize: 10.5,
                                letterSpacing: 1.3,
                                color: '#dee2f2',
                            }}
                        >
                            {SLIDES[i].title}
                        </span>
                    </div>
                    <div
                        style={{
                            fontSize: 10,
                            color: '#c4c5d5',
                            opacity: 0.85,
                            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                            letterSpacing: 0.5,
                        }}
                    >
                        {SLIDES[i].role}
                    </div>
                </div>
                <div
                    className="flex items-center gap-1.5 backdrop-blur-md"
                    style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        background: 'rgba(8,13,24,0.55)',
                        border: '1px solid rgba(129,140,248,0.22)',
                    }}
                >
                    {SLIDES.map((s, idx) => {
                        const isActive = idx === i
                        return (
                            <button
                                key={s.key}
                                aria-label={`Ir a foto ${idx + 1}`}
                                onClick={() => {
                                    setDir(idx > i ? 1 : -1)
                                    setI(idx)
                                }}
                                className="border-0 p-0 cursor-pointer transition-all"
                                style={{
                                    height: 6,
                                    width: isActive ? 20 : 6,
                                    borderRadius: 4,
                                    background: isActive
                                        ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
                                        : 'rgba(222,226,242,0.3)',
                                    boxShadow: isActive ? '0 0 8px rgba(56,189,248,0.6)' : 'none',
                                }}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Progress bar */}
            <div
                aria-hidden
                className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none"
                style={{ height: 2, background: 'rgba(222,226,242,0.08)' }}
            >
                <div
                    key={`${i}-${paused ? 'p' : 'r'}`}
                    style={{
                        height: '100%',
                        width: 0,
                        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                        boxShadow: '0 0 10px #38bdf8',
                        animation: paused ? 'none' : `somosProgress ${AUTO_MS}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    )
}

const titleAccent: React.CSSProperties = {
    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontStyle: 'italic',
    fontWeight: 400,
}

const paraStyle: React.CSSProperties = {
    fontSize: 'clamp(13px, 1.15vw, 15px)',
    lineHeight: 1.55,
    color: '#c4c5d5',
    margin: 0,
}

const emStyle: React.CSSProperties = {
    color: '#dee2f2',
    fontStyle: 'italic',
    fontWeight: 500,
}

const strongStyle: React.CSSProperties = {
    fontWeight: 600,
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
}

const pillarLabelStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#38bdf8',
}

const pillarTextStyle: React.CSSProperties = {
    fontSize: 'clamp(12.5px, 1.1vw, 14px)',
    lineHeight: 1.45,
    color: '#c4c5d5',
}

const pillarStrongStyle: React.CSSProperties = {
    color: '#dee2f2',
    fontWeight: 500,
}

const mfAccent: React.CSSProperties = {
    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontStyle: 'italic',
    fontWeight: 400,
    letterSpacing: '-0.5px',
}
