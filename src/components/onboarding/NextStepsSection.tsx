'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { WelcomeVideoUploadModal } from './WelcomeVideoUploadModal'

const SLACK_URL =
    'https://growth-sales-academy.slack.com/archives/C0B12LDVAKS'

interface Props {
    welcomeVideoUploaded: boolean
}

export function NextStepsSection({ welcomeVideoUploaded }: Props) {
    const [videoModalOpen, setVideoModalOpen] = useState(false)
    const [videoDone, setVideoDone] = useState(welcomeVideoUploaded)

    return (
        <>
            <section style={s.section}>
                <div style={s.head}>
                    <div>
                        <div style={s.kicker}>QUÉ TE ESPERA</div>
                        <h2 style={s.title}>Tus próximos pasos</h2>
                    </div>
                    <span style={s.hint}>
                        <Icon name="route" size={12} />
                        <span>Acceso disponible al entrar al dashboard</span>
                    </span>
                </div>

                <div style={s.grid}>
                    {/* 1. Slack */}
                    <a href={SLACK_URL} target="_blank" rel="noopener noreferrer" style={s.card}>
                        <div style={{ ...s.iconBox, color: '#38bdf8', borderColor: '#38bdf850', background: '#38bdf814' }}>
                            <Icon name="message" size={16} />
                        </div>
                        <div style={s.cardKicker}>COMUNIDAD</div>
                        <div style={s.cardTitle}>Entra al canal de Slack</div>
                        <div style={s.cardSub}>Preséntate y conoce a tu cohorte.</div>
                        <div style={s.cardCta}>
                            <span>Abrir Slack</span>
                            <Icon name="external" size={11} />
                        </div>
                    </a>

                    {/* 2. Soporte */}
                    <div style={{ ...s.card, ...s.cardStatic }}>
                        <div style={{ ...s.iconBox, color: '#818cf8', borderColor: '#818cf850', background: '#818cf814' }}>
                            <Icon name="phone" size={16} />
                        </div>
                        <div style={s.cardKicker}>SOPORTE</div>
                        <div style={s.cardTitle}>Número de soporte</div>
                        <div style={s.cardSub}>Para dudas urgentes.</div>
                        <div style={{ ...s.cardCta, color: '#7a8094' }}>
                            <span>Próximamente</span>
                        </div>
                    </div>

                    {/* 3. Welcome video */}
                    <button
                        type="button"
                        onClick={() => setVideoModalOpen(true)}
                        style={{
                            ...s.card,
                            ...s.cardButton,
                            ...(videoDone ? s.cardDone : {}),
                        }}
                    >
                        <div
                            style={{
                                ...s.iconBox,
                                color: videoDone ? '#34d399' : '#3b82f6',
                                borderColor: videoDone ? '#34d39950' : '#3b82f650',
                                background: videoDone ? '#34d39914' : '#3b82f614',
                            }}
                        >
                            <Icon name={videoDone ? 'check' : 'video'} size={16} />
                        </div>
                        <div style={s.cardKicker}>{videoDone ? 'COMPLETADO' : 'PROGRESO PERSONAL'}</div>
                        <div style={s.cardTitle}>
                            {videoDone ? 'Tu video de bienvenida' : 'Graba tu video de bienvenida'}
                        </div>
                        <div style={s.cardSub}>
                            Sube un video tuyo de un minuto hablando a cámara explicando quién eres, en qué situación
                            te encuentras, y por qué decidiste unirte. En unos meses, cuando mires atrás, verás la
                            transformación que hoy ya ha comenzado.
                        </div>
                        {!videoDone && (
                            <div style={s.cardHint}>
                                ~1 min · graba en HD (1080p), no 4K · máx. 300 MB
                            </div>
                        )}
                        <div style={{ ...s.cardCta, color: videoDone ? '#34d399' : '#38bdf8' }}>
                            <span>{videoDone ? 'Subido · puedes resubirlo' : 'Subir ahora'}</span>
                            <Icon name="arrow-right" size={11} />
                        </div>
                    </button>
                </div>
            </section>

            <WelcomeVideoUploadModal
                open={videoModalOpen}
                onClose={() => setVideoModalOpen(false)}
                onSaved={() => setVideoDone(true)}
            />
        </>
    )
}

type IconName = 'message' | 'phone' | 'video' | 'route' | 'external' | 'arrow-right' | 'check'

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    }
    switch (name) {
        case 'message':
            return <svg {...common}><path d="M21 12a8 8 0 1 1-3-6L21 5l-1 3.5A8 8 0 0 1 21 12z" /></svg>
        case 'phone':
            return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        case 'video':
            return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
        case 'route':
            return <svg {...common}><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M9 6h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H9a4 4 0 0 0-4 4" /></svg>
        case 'external':
            return <svg {...common}><path d="M14 4h6v6M10 14L20 4M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" /></svg>
        case 'arrow-right':
            return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        case 'check':
            return <svg {...common}><path d="M5 12l5 5 9-11" /></svg>
    }
}

const s: Record<string, CSSProperties> = {
    section: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
    kicker: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.4, color: '#7a8094', marginBottom: 4 },
    title: { fontSize: 22, fontWeight: 500, letterSpacing: -0.6, margin: 0, color: '#dee2f2' },
    hint: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7a8094', fontSize: 11.5, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
    card: {
        padding: 18,
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
        border: '1px solid rgba(129,140,248,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'all .2s',
        textAlign: 'left',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    cardButton: { border: 'none', borderTop: '1px solid rgba(129,140,248,0.12)', borderRight: '1px solid rgba(129,140,248,0.12)', borderBottom: '1px solid rgba(129,140,248,0.12)', borderLeft: '1px solid rgba(129,140,248,0.12)', width: '100%' },
    cardStatic: { cursor: 'default' },
    cardDone: { borderColor: 'rgba(52,211,153,0.30)', background: 'linear-gradient(180deg, rgba(52,211,153,0.06), rgba(14,19,30,0.5))' },
    iconBox: { width: 36, height: 36, borderRadius: 9, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    cardKicker: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9.5, letterSpacing: 1.4, color: '#7a8094' },
    cardTitle: { fontSize: 14.5, fontWeight: 600, color: '#dee2f2', letterSpacing: -0.2, lineHeight: 1.3 },
    cardSub: { fontSize: 12.5, color: '#9ca3b8', lineHeight: 1.5 },
    cardHint: { fontSize: 10.5, color: '#fbbf24', fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3, marginTop: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', alignSelf: 'flex-start' },
    cardCta: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11.5, color: '#38bdf8', fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3 },
}
