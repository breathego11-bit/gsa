'use client'

import Link from 'next/link'
import { useState, type CSSProperties, type ReactNode } from 'react'

export type CourseCardData = {
    id: string
    title: string
    description: string
    thumbnail: string | null
    hero_image: string | null
    published: boolean
    created_at: Date | string
    tagline: string | null
    tier: string | null
    level: string | null
    duration: string | null
    year: string | null
    hue: number | null
    accent: string | null
    trajectory: string | null
    modules: { id: string; title: string; order: number }[]
    moduleCount: number
    included_items: string[] | null
}

export interface CourseProgress {
    percent: number
    completed: number
    total: number
}

interface Props {
    course: CourseCardData
    index: number
    ctaHref?: string
    ctaLabel?: string
    progress?: CourseProgress
    customCta?: ReactNode
}

const DESC_TRUNCATE_THRESHOLD = 140

export function CourseCardRedesigned({
    course,
    index,
    ctaHref,
    ctaLabel,
    progress,
    customCta,
}: Props) {
    const [isHover, setIsHover] = useState(false)
    const [descExpanded, setDescExpanded] = useState(false)

    const hue = course.hue ?? 205
    const accent = course.accent ?? '#38bdf8'
    const tier = course.tier ?? 'CERTIFICACIÓN'
    const year =
        course.year ??
        new Date(course.created_at).getFullYear().toString()
    const trajectory = course.trajectory ?? '+0%'
    const tagline = course.tagline ?? ''
    const badge = course.published ? 'PUBLICADO' : 'PRÓXIMAMENTE'

    const heroImage = course.hero_image ?? course.thumbnail
    const hasHeroImage = Boolean(heroImage)
    const descTooLong = course.description.length > DESC_TRUNCATE_THRESHOLD

    const stats: { k: string; v: string }[] = [
        { k: 'Módulos', v: String(course.moduleCount) },
        { k: 'Duración', v: course.duration ?? '—' },
        { k: 'Nivel', v: course.level ?? '—' },
    ]

    return (
        <article
            style={{
                ...cr.card,
                ...(isHover ? cr.cardHover : {}),
            }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            {/* Border gradient layer */}
            <div
                style={{
                    ...cr.cardBorder,
                    background: isHover
                        ? `linear-gradient(135deg, ${accent}, rgba(129,140,248,0.3) 40%, ${accent})`
                        : 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(129,140,248,0.08) 50%, rgba(129,140,248,0.2))',
                }}
            />

            <div style={cr.cardInner}>
                {/* Hero visual */}
                <div
                    style={{
                        ...cr.hero,
                        background: hasHeroImage
                            ? `#0a0f1a url("${heroImage}") center/cover no-repeat`
                            : `linear-gradient(155deg, oklch(0.4 0.15 ${hue}) 0%, oklch(0.22 0.1 ${hue + 10}) 50%, oklch(0.12 0.06 ${hue + 20}) 100%)`,
                    }}
                >
                    <div style={cr.year}>{year}</div>

                    <div style={{ ...cr.badge, background: accent }}>
                        <span style={cr.badgeDot} />
                        {badge}
                    </div>

                    {!hasHeroImage && (
                        <HeroChart hue={hue} index={index} trajectory={trajectory} />
                    )}

                    <div style={cr.tier}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill={accent}>
                            <path d="M5 0l1.5 3.5L10 4l-3 2.5L7.5 10 5 8 2.5 10 3 6.5 0 4l3.5-.5z" />
                        </svg>
                        {tier}
                    </div>

                    <div
                        style={
                            hasHeroImage ? cr.heroOverlayImage : cr.heroOverlay
                        }
                    />
                </div>

                {/* Body */}
                <div style={cr.body}>
                    <div>
                        <h3 style={cr.courseTitle}>{course.title}</h3>
                        {tagline && <p style={cr.tagline}>{tagline}</p>}
                        <p
                            style={
                                descExpanded || !descTooLong
                                    ? cr.desc
                                    : { ...cr.desc, ...cr.descClamp }
                            }
                        >
                            {course.description}
                        </p>
                        {descTooLong && (
                            <button
                                type="button"
                                onClick={() => setDescExpanded((v) => !v)}
                                style={{ ...cr.verMas, color: accent }}
                            >
                                {descExpanded ? 'Ver menos' : 'Ver más'}
                                <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    style={{
                                        transform: descExpanded
                                            ? 'rotate(180deg)'
                                            : 'rotate(0deg)',
                                        transition: 'transform .2s',
                                    }}
                                >
                                    <path d="M3 4.5l3 3 3-3" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {(() => {
                        const customItems = course.included_items?.filter((s) => s && s.trim().length > 0) ?? []
                        const fallbackItems = course.modules.slice(0, 3).map((m) => m.title)
                        const items = customItems.length > 0 ? customItems : fallbackItems
                        if (items.length === 0) return null
                        return (
                            <div style={cr.modules}>
                                <div style={cr.modulesLabel}>INCLUYE</div>
                                <ul style={cr.moduleList}>
                                    {items.map((text, i) => (
                                        <li key={i} style={cr.moduleItem}>
                                            <span style={{ ...cr.moduleNum, color: accent }}>
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <span style={cr.moduleText}>{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })()}

                    <div style={cr.stats}>
                        {stats.map((s) => (
                            <div key={s.k} style={cr.statItem}>
                                <div style={cr.statKey}>{s.k}</div>
                                <div style={cr.statVal}>{s.v}</div>
                            </div>
                        ))}
                    </div>

                    {progress && (
                        <div style={cr.progressBlock}>
                            <div style={cr.progressHead}>
                                <span style={cr.progressKey}>
                                    {progress.completed} de {progress.total} lecciones
                                </span>
                                <span style={{ ...cr.progressVal, color: accent }}>
                                    {progress.percent}%
                                </span>
                            </div>
                            <div style={cr.progressTrack}>
                                <div
                                    style={{
                                        ...cr.progressFill,
                                        width: `${Math.min(Math.max(progress.percent, 0), 100)}%`,
                                        background: `linear-gradient(90deg, ${accent}, #818cf8)`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={cr.ctaRow}>
                        {customCta ? (
                            customCta
                        ) : (
                            <Link
                                href={ctaHref ?? `/course/${course.id}`}
                                style={{
                                    ...cr.ctaPrimary,
                                    background: isHover
                                        ? `linear-gradient(135deg, ${accent}, #818cf8)`
                                        : 'rgba(27,31,43,0.9)',
                                    color: isHover ? '#080d18' : '#dee2f2',
                                    borderColor: isHover ? 'transparent' : 'rgba(129,140,248,0.3)',
                                    boxShadow: isHover ? `0 8px 28px ${accent}40` : 'none',
                                }}
                            >
                                {ctaLabel ?? 'Ver detalles'}
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M3 7h8M7 3l4 4-4 4" />
                                </svg>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </article>
    )
}

function HeroChart({
    hue,
    index,
    trajectory,
}: {
    hue: number
    index: number
    trajectory: string
}) {
    const bars = generateBars(hue)

    return (
        <div style={cr.heroChart}>
            <svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`bar-${hue}-${index}`} x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={`oklch(0.55 0.2 ${hue})`} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={`oklch(0.75 0.2 ${hue})`} stopOpacity="0.95" />
                    </linearGradient>
                    <linearGradient id={`line-${hue}-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="1" />
                    </linearGradient>
                    <pattern
                        id={`grid-${hue}-${index}`}
                        width="32"
                        height="20"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M32 0H0v20"
                            fill="none"
                            stroke="rgba(222,226,242,0.07)"
                            strokeWidth="0.5"
                        />
                    </pattern>
                </defs>

                <rect width="320" height="180" fill={`url(#grid-${hue}-${index})`} />

                {bars.map((h, i) => (
                    <rect
                        key={i}
                        x={20 + i * 32}
                        y={170 - h * 1.6}
                        width={20}
                        height={h * 1.6}
                        fill={`url(#bar-${hue}-${index})`}
                        rx={2}
                    />
                ))}

                <polyline
                    points={bars.map((h, i) => `${30 + i * 32},${170 - h * 1.6 - 6}`).join(' ')}
                    fill="none"
                    stroke={`url(#line-${hue}-${index})`}
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {bars.map((h, i) => (
                    <circle
                        key={i}
                        cx={30 + i * 32}
                        cy={170 - h * 1.6 - 6}
                        r={i === bars.length - 1 ? 4 : 2.5}
                        fill="#dee2f2"
                        opacity={i === bars.length - 1 ? 1 : 0.6}
                    />
                ))}
            </svg>

            <div style={cr.dataLabel}>
                <div style={cr.dataLabelKey}>TRAYECTORIA</div>
                <div style={cr.dataLabelVal}>↗ {trajectory}</div>
            </div>
        </div>
    )
}

// Deterministic bar pattern from hue — same hue always produces the same chart
function generateBars(hue: number): number[] {
    const seed = hue || 1
    const out: number[] = []
    let x = seed
    for (let i = 0; i < 9; i++) {
        x = (x * 9301 + 49297) % 233280
        const trend = 25 + (i / 8) * 55
        const noise = (x / 233280) * 25 - 12
        out.push(Math.max(15, Math.min(95, trend + noise)))
    }
    return out
}

const cr: Record<string, CSSProperties> = {
    card: {
        position: 'relative',
        borderRadius: 24,
        padding: 1.5,
        transition: 'all .4s cubic-bezier(.2,.7,.3,1)',
        transform: 'translateY(0)',
    },
    cardHover: {
        transform: 'translateY(-4px)',
    },
    cardBorder: {
        position: 'absolute',
        inset: 0,
        borderRadius: 24,
        padding: 1.5,
        zIndex: 0,
        transition: 'background .3s',
    },
    cardInner: {
        position: 'relative',
        borderRadius: 22.5,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0e131e 0%, #0a0f1a 100%)',
        zIndex: 1,
    },

    hero: {
        position: 'relative',
        height: 200,
        overflow: 'hidden',
        borderBottom: '1px solid rgba(129,140,248,0.12)',
    },
    year: {
        position: 'absolute',
        top: 14,
        right: 18,
        zIndex: 2,
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontSize: 44,
        lineHeight: 1,
        letterSpacing: -2,
        color: 'rgba(222,226,242,0.55)',
        fontStyle: 'italic',
        textShadow: '0 2px 20px rgba(8,13,24,0.6)',
    },
    badge: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        color: '#080d18',
        boxShadow: '0 4px 20px rgba(56,189,248,0.4)',
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#080d18',
        animation: 'gsa-pulse 2s ease-in-out infinite',
    },
    heroChart: {
        position: 'absolute',
        inset: 0,
        opacity: 0.9,
    },
    dataLabel: {
        position: 'absolute',
        bottom: 56,
        right: 22,
        zIndex: 2,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(8,13,24,0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(129,140,248,0.25)',
    },
    dataLabelKey: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9,
        letterSpacing: 1,
        color: '#c4c5d5',
        opacity: 0.7,
        marginBottom: 2,
    },
    dataLabelVal: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 13,
        fontWeight: 600,
        color: '#38bdf8',
    },
    tier: {
        position: 'absolute',
        bottom: 14,
        left: 16,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9.5,
        letterSpacing: 1.2,
        color: '#dee2f2',
        padding: '4px 9px',
        borderRadius: 6,
        background: 'rgba(8,13,24,0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(129,140,248,0.2)',
    },
    heroOverlay: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 40%, rgba(14,19,30,0.4) 100%)',
    },
    heroOverlayImage: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
            'linear-gradient(180deg, rgba(8,13,24,0.35) 0%, rgba(8,13,24,0.1) 30%, rgba(14,19,30,0.6) 100%)',
    },

    body: {
        padding: '24px 26px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
    },
    courseTitle: {
        fontSize: 24,
        lineHeight: 1.15,
        letterSpacing: -0.8,
        fontWeight: 600,
        margin: '0 0 8px',
        color: '#dee2f2',
    },
    tagline: {
        fontSize: 14.5,
        lineHeight: 1.5,
        fontWeight: 500,
        color: '#dee2f2',
        margin: '0 0 10px',
    },
    desc: {
        fontSize: 14,
        lineHeight: 1.6,
        color: '#c4c5d5',
        margin: 0,
    },
    descClamp: {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
    },
    verMas: {
        marginTop: 8,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
    },

    modules: {
        padding: '14px 0',
        borderTop: '1px dashed rgba(129,140,248,0.18)',
        borderBottom: '1px dashed rgba(129,140,248,0.18)',
    },
    modulesLabel: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        letterSpacing: 1.3,
        color: '#c4c5d5',
        opacity: 0.7,
        marginBottom: 10,
    },
    moduleList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    moduleItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 14,
        color: '#dee2f2',
    },
    moduleNum: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 12,
        fontWeight: 500,
        minWidth: 24,
    },
    moduleText: { fontWeight: 500 },

    stats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(129,140,248,0.15)',
    },
    statItem: {
        padding: '12px 12px',
        background: '#0a0f1a',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    statKey: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9.5,
        letterSpacing: 1.2,
        color: '#c4c5d5',
        textTransform: 'uppercase',
        opacity: 0.75,
    },
    statVal: {
        fontSize: 15,
        fontWeight: 600,
        color: '#dee2f2',
        letterSpacing: -0.3,
    },

    progressBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    progressHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    progressKey: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10.5,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#c4c5d5',
        opacity: 0.75,
    },
    progressVal: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: -0.2,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        background: 'rgba(129,140,248,0.12)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        transition: 'width .4s ease-out',
    },

    ctaRow: { display: 'flex', gap: 10 },
    ctaPrimary: {
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 18px',
        borderRadius: 12,
        border: '1px solid',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'none',
        transition: 'all .25s',
    },
}
