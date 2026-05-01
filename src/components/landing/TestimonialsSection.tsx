'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type TestimonialData = {
    id: string
    name: string
    role: string | null
    metric: string | null
    quote: string
    duration: string | null
    video_url: string | null
    hue: number | null
    poster_bg: string | null
    poster_accent: string | null
}

const DEFAULT_BG = 'linear-gradient(160deg, #2a3547 0%, #1a1f2e 100%)'
const DEFAULT_ACCENT = '#d9b097'
const DEFAULT_HUE = 215

interface Props {
    testimonials: TestimonialData[]
}

export function TestimonialsSection({ testimonials }: Props) {
    const [active, setActive] = useState(0)
    const [playing, setPlaying] = useState<number | null>(null)

    if (testimonials.length === 0) return null

    const go = (d: number) =>
        setActive((a) => (a + d + testimonials.length) % testimonials.length)

    return (
        <section id="testimonials" style={ts.root}>
            <div style={ts.glow1} />
            <div style={ts.glow2} />

            <div style={ts.inner}>
                {/* Header */}
                <div style={ts.header}>
                    <div>
                        <div style={ts.tag}>
                            <span style={ts.tagDot} />
                            Testimonios · {testimonials.length}{' '}
                            {testimonials.length === 1 ? 'historia real' : 'historias reales'}
                        </div>
                        <h2 style={ts.title}>
                            Historias reales,
                            <br />
                            <span style={ts.titleAccent}>resultados medibles.</span>
                        </h2>
                        <p style={ts.sub}>
                            Estudiantes que aplicaron el método GSA y transformaron su manera
                            de vender. Sin scripts, sin presión, sin trucos.
                        </p>
                    </div>
                    {testimonials.length > 1 && (
                        <div style={ts.arrows}>
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                style={ts.arrow}
                                aria-label="Testimonio anterior"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                >
                                    <path d="M10 3L5 8l5 5" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => go(1)}
                                style={ts.arrow}
                                aria-label="Testimonio siguiente"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                >
                                    <path d="M6 3l5 5-5 5" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Carousel grid */}
                <div style={ts.grid}>
                    {testimonials.map((t, i) => {
                        const offset =
                            (i - active + testimonials.length) % testimonials.length
                        const visible = offset < 3
                        const featured = offset === 0
                        return (
                            <VideoCard
                                key={t.id}
                                t={t}
                                visible={visible}
                                featured={featured}
                                playing={playing === i}
                                onPlay={() => setPlaying(playing === i ? null : i)}
                            />
                        )
                    })}
                </div>

                {/* Dots */}
                {testimonials.length > 1 && (
                    <div style={ts.dots}>
                        {testimonials.map((t, i) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActive(i)}
                                style={{
                                    ...ts.dot,
                                    ...(i === active ? ts.dotActive : {}),
                                }}
                                aria-label={`Ir al testimonio ${i + 1}`}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    )
}

interface VideoCardProps {
    t: TestimonialData
    visible: boolean
    featured: boolean
    playing: boolean
    onPlay: () => void
}

function VideoCard({ t, visible, featured, playing, onPlay }: VideoCardProps) {
    const hue = t.hue ?? DEFAULT_HUE
    const accent = t.poster_accent ?? DEFAULT_ACCENT
    const bg = t.poster_bg ?? DEFAULT_BG
    const gradId = `tg-${t.id}`
    const videoRef = useRef<HTMLVideoElement>(null)
    const hasVideo = Boolean(t.video_url)

    // Drive playback imperatively so we keep the same <video> element across
    // states (preserving the buffered first frame).
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (playing) {
            v.play().catch(() => {})
        } else {
            v.pause()
            // Reset to first frame when the user closes the video.
            if (v.currentTime > 0.05) v.currentTime = 0
        }
    }, [playing])

    return (
        <article
            style={{
                ...ts.card,
                ...(featured ? ts.cardFeatured : {}),
                opacity: visible ? 1 : 0.3,
                transform: featured ? 'scale(1.02)' : 'scale(1)',
            }}
        >
            <div style={ts.cardBorder} />
            <div style={ts.cardInner}>
                {/* Poster / video */}
                <div style={{ ...ts.poster, background: bg }}>
                    {hasVideo ? (
                        <video
                            ref={videoRef}
                            src={t.video_url ?? undefined}
                            preload="metadata"
                            playsInline
                            controls={playing}
                            onEnded={onPlay}
                            // Workaround: nudge currentTime so Safari/some Chromium
                            // builds actually paint the first frame instead of black.
                            onLoadedMetadata={(e) => {
                                const v = e.currentTarget
                                if (v.currentTime === 0) v.currentTime = 0.001
                            }}
                            style={ts.videoEl}
                        />
                    ) : (
                        // Fallback: abstract silhouette when no video is uploaded.
                        <svg
                            viewBox="0 0 100 160"
                            preserveAspectRatio="xMidYMid slice"
                            style={ts.posterSilhouette}
                        >
                            <defs>
                                <radialGradient
                                    id={gradId}
                                    cx="50%"
                                    cy="35%"
                                    r="50%"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={accent}
                                        stopOpacity="0.85"
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor={accent}
                                        stopOpacity="0.1"
                                    />
                                </radialGradient>
                            </defs>
                            <circle
                                cx="50"
                                cy="55"
                                r="22"
                                fill={`url(#${gradId})`}
                            />
                            <path
                                d="M16 160 Q16 105 50 105 Q84 105 84 160 Z"
                                fill={`url(#${gradId})`}
                            />
                        </svg>
                    )}

                    {/* Overlays — hidden while playing so native controls are usable */}
                    {!playing && (
                        <>
                            <div style={ts.posterTop}>
                                <div style={ts.posterBadge}>
                                    <svg
                                        width="9"
                                        height="9"
                                        viewBox="0 0 9 9"
                                        fill="currentColor"
                                    >
                                        <circle
                                            cx="4.5"
                                            cy="4.5"
                                            r="3"
                                            fill="#f87171"
                                        />
                                    </svg>
                                    <span>REEL</span>
                                </div>
                                {t.duration && (
                                    <div style={ts.posterDur}>
                                        <svg
                                            width="10"
                                            height="10"
                                            viewBox="0 0 10 10"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.3"
                                        >
                                            <circle cx="5" cy="5" r="3.8" />
                                            <path d="M5 3v2l1.2 1.2" />
                                        </svg>
                                        {t.duration}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                style={ts.playBtn}
                                onClick={onPlay}
                                aria-label="Reproducir testimonio"
                                disabled={!hasVideo}
                            >
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 22 22"
                                    fill="currentColor"
                                >
                                    <path d="M7 4l11 7-11 7z" />
                                </svg>
                            </button>

                            <div style={ts.posterBottom}>
                                <div style={ts.timeline}>
                                    <div
                                        style={{ ...ts.timelineFill, width: '0%' }}
                                    />
                                </div>
                            </div>

                            <div style={ts.posterOverlay} />
                        </>
                    )}
                </div>

                {/* Body */}
                <div style={ts.body}>
                    <div style={ts.bodyTop}>
                        <div
                            style={{
                                ...ts.avatar,
                                background: `linear-gradient(135deg, oklch(0.6 0.18 ${hue}), oklch(0.4 0.12 ${hue + 15}))`,
                            }}
                        />
                        <div style={ts.bodyMeta}>
                            <div style={ts.bodyName}>{t.name}</div>
                            {t.role && <div style={ts.bodyRole}>{t.role}</div>}
                        </div>
                        {t.metric && <div style={ts.metric}>{t.metric}</div>}
                    </div>
                    <blockquote style={ts.quote}>&ldquo;{t.quote}&rdquo;</blockquote>
                </div>
            </div>
        </article>
    )
}

const ts: Record<string, CSSProperties> = {
    root: {
        width: '100%',
        color: '#dee2f2',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        padding: '120px 0 120px',
    },
    glow1: {
        position: 'absolute',
        top: '15%',
        right: '-8%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(90px)',
        background:
            'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 60%)',
    },
    glow2: {
        position: 'absolute',
        bottom: '5%',
        left: '-8%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(80px)',
        background:
            'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 60%)',
    },
    inner: {
        position: 'relative',
        zIndex: 1,
        padding: '0 clamp(16px, 5vw, 80px)',
        maxWidth: 1320,
        margin: '0 auto',
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 40,
        marginBottom: 56,
        flexWrap: 'wrap',
    },
    tag: {
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
        color: '#c4c5d5',
        marginBottom: 24,
    },
    tagDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#38bdf8',
        boxShadow: '0 0 14px #38bdf8',
    },
    title: {
        fontSize: 'clamp(36px, 5vw, 56px)',
        lineHeight: 1.1,
        letterSpacing: -1.5,
        fontWeight: 600,
        margin: '0 0 18px',
        maxWidth: 640,
    },
    titleAccent: {
        background:
            'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    },
    sub: {
        fontSize: 17,
        lineHeight: 1.6,
        color: '#c4c5d5',
        maxWidth: 540,
        margin: 0,
    },

    arrows: { display: 'flex', gap: 8, marginBottom: 8 },
    arrow: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(27,31,43,0.7)',
        border: '1px solid rgba(129,140,248,0.25)',
        color: '#dee2f2',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .2s',
    },

    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
        gap: 20,
        marginBottom: 32,
    },
    card: {
        position: 'relative',
        borderRadius: 22,
        padding: 1,
        transition: 'all .4s cubic-bezier(.2,.7,.3,1)',
    },
    cardFeatured: {
        boxShadow: '0 20px 60px rgba(56,189,248,0.18)',
    },
    cardBorder: {
        position: 'absolute',
        inset: 0,
        borderRadius: 22,
        padding: 1,
        zIndex: 0,
        background:
            'linear-gradient(135deg, rgba(129,140,248,0.3), rgba(129,140,248,0.08) 50%, rgba(129,140,248,0.25))',
    },
    cardInner: {
        position: 'relative',
        borderRadius: 21,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0e131e 0%, #0a0f1a 100%)',
        zIndex: 1,
    },

    poster: {
        position: 'relative',
        aspectRatio: '9 / 14',
        overflow: 'hidden',
    },
    videoEl: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
        zIndex: 0,
    },
    posterSilhouette: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    posterTop: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    posterBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 999,
        background: 'rgba(8,13,24,0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(248,113,113,0.35)',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9.5,
        letterSpacing: 1.2,
        color: '#f87171',
        fontWeight: 600,
    },
    posterDur: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(8,13,24,0.7)',
        backdropFilter: 'blur(10px)',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
        color: '#dee2f2',
    },
    playBtn: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 3,
        width: 58,
        height: 58,
        borderRadius: '50%',
        background: 'rgba(8,13,24,0.6)',
        backdropFilter: 'blur(14px)',
        border: '1.5px solid rgba(222,226,242,0.5)',
        color: '#dee2f2',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(8,13,24,0.5)',
        transition: 'all .2s',
        padding: 0,
    },
    posterBottom: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 2,
    },
    timeline: {
        width: '100%',
        height: 3,
        borderRadius: 2,
        background: 'rgba(222,226,242,0.2)',
        overflow: 'hidden',
    },
    timelineFill: {
        height: '100%',
        borderRadius: 2,
        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
        transition: 'width .3s',
    },
    posterOverlay: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background:
            'linear-gradient(180deg, rgba(8,13,24,0.3) 0%, transparent 20%, transparent 70%, rgba(8,13,24,0.6) 100%)',
    },

    body: { padding: 18 },
    bodyTop: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        flexShrink: 0,
        border: '1.5px solid rgba(129,140,248,0.3)',
    },
    bodyMeta: { flex: 1, minWidth: 0 },
    bodyName: {
        fontSize: 13,
        fontWeight: 600,
        color: '#dee2f2',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    bodyRole: { fontSize: 11, color: '#c4c5d5', opacity: 0.8 },
    metric: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
        letterSpacing: 0.5,
        color: '#38bdf8',
        fontWeight: 600,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(56,189,248,0.1)',
        border: '1px solid rgba(56,189,248,0.25)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    quote: {
        fontSize: 13,
        lineHeight: 1.5,
        color: '#c4c5d5',
        margin: 0,
        fontStyle: 'italic',
        paddingLeft: 12,
        borderLeft: '2px solid rgba(56,189,248,0.35)',
    },

    dots: {
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 56,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        background: 'rgba(129,140,248,0.25)',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'all .3s',
    },
    dotActive: {
        width: 28,
        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
        boxShadow: '0 0 10px rgba(56,189,248,0.5)',
    },
}
