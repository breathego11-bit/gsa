import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { CSSProperties } from 'react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextStepsSection } from '@/components/onboarding/NextStepsSection'
import { completeOnboarding } from './actions'

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (session.user.role === 'ADMIN') redirect('/admin')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            name: true,
            last_name: true,
            onboarded_at: true,
            created_at: true,
            welcome_video_uploaded_at: true,
        },
    })
    if (!user) redirect('/api/auth/clear-session')
    if (user.onboarded_at) redirect('/dashboard')

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [memberNumber, totalStudents, cashAgg, recentStudents] = await Promise.all([
        prisma.user.count({
            where: { role: 'STUDENT', created_at: { lte: user.created_at } },
        }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.saleInstallment.aggregate({
            where: { collected: true, collected_at: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
        }),
        prisma.user.findMany({
            where: { role: 'STUDENT', id: { not: session.user.id } },
            select: { name: true, last_name: true },
            orderBy: { created_at: 'desc' },
            take: 5,
        }),
    ])

    const studentName = user.name
    const monthCashCents = cashAgg._sum.amount ?? 0
    const monthCashLabel = formatCash(monthCashCents)
    const moreCount = Math.max(0, totalStudents - recentStudents.length)
    const moreLabel = moreCount >= 1000 ? `+${(moreCount / 1000).toFixed(1)}k` : `+${moreCount}`

    const checklist = [
        { id: 1, label: 'Pago confirmado', sub: 'Ya tienes acceso completo a GSA', done: true, icon: 'check' as const },
        { id: 2, label: 'Mira el video de bienvenida', sub: '4 min · esencial para empezar bien', done: false, icon: 'play' as const, active: true },
        { id: 3, label: 'Completa tu perfil', sub: 'Para personalizar tu experiencia', done: false, icon: 'user' as const },
        { id: 4, label: 'Únete a la comunidad', sub: '+1,800 closers activos', done: false, icon: 'message' as const },
    ]

    return (
        <div style={ob.page}>
            <style>{`@keyframes gsa-pulseRing { 0% { transform: scale(1); opacity: .6; } 70% { transform: scale(1.8); opacity: 0; } 100% { transform: scale(1.8); opacity: 0; } }`}</style>
            <div style={ob.glowA} />
            <div style={ob.glowB} />
            <div style={ob.grid} />

            <main style={ob.main}>
                <div style={ob.layout}>
                    <div style={ob.left}>
                        <section style={ob.hero}>
                            <div style={ob.kicker}>
                                <span style={ob.kickerDot} />
                                <span>PAGO CONFIRMADO · MEMBER #{String(memberNumber).padStart(4, '0')}</span>
                            </div>
                            <h1 style={ob.title}>
                                Bienvenido a casa,
                                <br />
                                <span style={ob.titleAccent}>{studentName}</span>
                            </h1>
                            <p style={ob.subtitle}>
                                Acabas de dar el primer paso para convertirte en un{' '}
                                <strong style={ob.subStrong}>closer consciente</strong>.
                                {' '}Antes de entrar al dashboard, mira este video — te enseña cómo aprovechar al máximo lo que viene.
                            </p>
                        </section>

                        <section style={ob.videoSection}>
                            <div style={ob.videoHeader}>
                                <div style={ob.videoHeaderLeft}>
                                    <Icon name="play-circle" size={16} />
                                    <div>
                                        <div style={ob.videoHeaderKey}>VIDEO DE BIENVENIDA</div>
                                        <div style={ob.videoHeaderTitle}>Cómo aprovechar GSA al máximo · por Iván Abad</div>
                                    </div>
                                </div>
                                <div style={ob.videoHeaderRight}>
                                    <span style={ob.videoChip}>
                                        <Icon name="clock" size={11} />
                                        <span>4:12</span>
                                    </span>
                                    <span style={ob.videoChip}>
                                        <Icon name="hd" size={11} />
                                        <span>HD</span>
                                    </span>
                                </div>
                            </div>

                            <div style={ob.videoFrame}>
                                {/* Placeholder. Drop /public/onboarding-welcome.mp4 and replace this block with a <video> element. */}
                                <div style={ob.videoBg}>
                                    <div style={ob.videoBgGlow} />
                                    <div style={ob.videoBgPattern} />
                                </div>

                                <div style={ob.playBtn} aria-label="Video pronto disponible">
                                    <span style={ob.playBtnRing} />
                                    <span style={ob.playBtnRing2} />
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="#0a1020">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>

                                <div style={ob.comingSoon}>
                                    <span style={ob.comingDot} />
                                    <span>PRÓXIMAMENTE</span>
                                </div>

                                <div style={ob.videoControls}>
                                    <span style={ob.vcBtn}><Icon name="play" size={14} /></span>
                                    <div style={ob.vcTrack}>
                                        <div style={ob.vcTrackFill} />
                                        <div style={ob.vcTrackBuffer} />
                                    </div>
                                    <span style={ob.vcTime}>0:00 / 4:12</span>
                                    <span style={ob.vcBtn}><Icon name="volume" size={14} /></span>
                                    <span style={ob.vcBtn}><Icon name="settings" size={14} /></span>
                                    <span style={ob.vcBtn}><Icon name="expand" size={14} /></span>
                                </div>

                                <div style={ob.videoInstructor}>
                                    <div style={ob.instructorAvatar}>IA</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={ob.instructorName}>Iván Abad</div>
                                        <div style={ob.instructorRole}>Founder · GSA · Lección 0</div>
                                    </div>
                                    <div style={ob.chapters}>
                                        <span style={ob.chapterLabel}>3 capítulos</span>
                                        <div style={ob.chapterDots}>
                                            <span style={{ ...ob.cdot, ...ob.cdotActive }} />
                                            <span style={ob.cdot} />
                                            <span style={ob.cdot} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={ob.transcriptHint}>
                                <Icon name="captions" size={13} />
                                <span>Subtítulos disponibles en ES · Lectura transcrita activable</span>
                            </div>
                        </section>

                        <NextStepsSection welcomeVideoUploaded={!!user.welcome_video_uploaded_at} />
                    </div>

                    <aside style={ob.right}>
                        <div style={ob.rightSticky}>
                            <div style={ob.checklistCard}>
                                <div style={ob.clHead}>
                                    <div>
                                        <div style={ob.clKicker}>TU PROGRESO</div>
                                        <div style={ob.clTitle}>Primer día en GSA</div>
                                    </div>
                                    <div style={ob.clRing}>
                                        <svg width="46" height="46" viewBox="0 0 46 46">
                                            <circle cx="23" cy="23" r="20" stroke="rgba(129,140,248,0.15)" strokeWidth="3" fill="none" />
                                            <circle cx="23" cy="23" r="20" stroke="url(#ringGrad)" strokeWidth="3" fill="none" strokeDasharray="125.66" strokeDashoffset="94.24" strokeLinecap="round" transform="rotate(-90 23 23)" />
                                            <defs>
                                                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor="#38bdf8" />
                                                    <stop offset="100%" stopColor="#818cf8" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <span style={ob.clRingTxt}>25%</span>
                                    </div>
                                </div>

                                <ul style={ob.clList}>
                                    {checklist.map((c) => (
                                        <li key={c.id} style={{ ...ob.clItem, ...(c.active ? ob.clItemActive : {}) }}>
                                            <div style={{ ...ob.clIcon, ...(c.done ? ob.clIconDone : c.active ? ob.clIconActive : {}) }}>
                                                <Icon name={c.done ? 'check' : c.icon} size={12} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ ...ob.clLabel, ...(c.done ? ob.clLabelDone : {}) }}>{c.label}</div>
                                                <div style={ob.clSub}>{c.sub}</div>
                                            </div>
                                            {c.active && <span style={ob.clActivePill}>AHORA</span>}
                                        </li>
                                    ))}
                                </ul>

                                <div style={ob.clFoot}>
                                    <form action={completeOnboarding}>
                                        <button type="submit" style={ob.primaryCta}>
                                            <span>Ir al dashboard</span>
                                            <Icon name="arrow-right" size={15} />
                                        </button>
                                    </form>
                                    <div style={ob.ctaHint}>
                                        <Icon name="info" size={11} />
                                        <span>Puedes volver a este video desde tu dashboard cuando quieras</span>
                                    </div>
                                </div>
                            </div>

                            <div style={ob.statsCard}>
                                <div style={ob.statsTitle}>Te unes a</div>
                                <div style={ob.statsRow}>
                                    <div>
                                        <div style={ob.statBig}>{totalStudents.toLocaleString('es-ES')}</div>
                                        <div style={ob.statSub}>closers en formación</div>
                                    </div>
                                    <div style={ob.statsDivider} />
                                    <div>
                                        <div style={{ ...ob.statBig, color: '#34d399' }}>{monthCashLabel}</div>
                                        <div style={ob.statSub}>cerrados este mes</div>
                                    </div>
                                </div>
                                {recentStudents.length > 0 && (
                                    <div style={ob.avatarStack}>
                                        {recentStudents.map((s, i) => (
                                            <span key={i} style={{ ...ob.avtStack, marginLeft: i ? -8 : 0, zIndex: 10 - i }}>
                                                {initials(s.name, s.last_name)}
                                            </span>
                                        ))}
                                        {moreCount > 0 && <span style={ob.avtMore}>{moreLabel}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <footer style={ob.footer}>
                <span>¿Algún problema con tu acceso? <a href="mailto:soporte@gsa.com" style={ob.footLink}>Escríbenos a soporte</a></span>
                <span>GSA · v2026.05 · welcome flow</span>
            </footer>
        </div>
    )
}

function initials(name: string, lastName: string) {
    const a = (name || '').trim()[0] ?? ''
    const b = (lastName || '').trim()[0] ?? ''
    return (a + b).toUpperCase() || '··'
}

function formatCash(cents: number) {
    if (cents <= 0) return '€0'
    const euros = cents / 100
    if (euros >= 1_000_000) return `€${(euros / 1_000_000).toFixed(1)}M`
    if (euros >= 1_000) return `€${(euros / 1_000).toFixed(1)}k`
    return `€${Math.round(euros)}`
}

type IconName =
    | 'check' | 'play' | 'play-circle' | 'user' | 'message' | 'clock' | 'hd'
    | 'volume' | 'mute' | 'settings' | 'expand' | 'captions' | 'arrow-right'
    | 'info' | 'compass' | 'video' | 'users' | 'route'

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
        case 'check':
            return <svg {...common}><path d="M5 12l5 5 9-11" /></svg>
        case 'play':
            return <svg {...common}><path d="M8 5v14l11-7z" fill="currentColor" stroke="none" /></svg>
        case 'play-circle':
            return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M10 8l6 4-6 4z" fill="currentColor" /></svg>
        case 'user':
            return <svg {...common}><circle cx="12" cy="9" r="4" /><path d="M4 21c0-4 3-7 8-7s8 3 8 7" /></svg>
        case 'message':
            return <svg {...common}><path d="M21 12a8 8 0 1 1-3-6L21 5l-1 3.5A8 8 0 0 1 21 12z" /></svg>
        case 'clock':
            return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        case 'hd':
            return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M7 10v4M10 10v4M7 12h3M14 10v4M14 10h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2" /></svg>
        case 'volume':
            return <svg {...common}><path d="M3 9v6h4l5 4V5L7 9z" /><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" /></svg>
        case 'mute':
            return <svg {...common}><path d="M3 9v6h4l5 4V5L7 9z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
        case 'settings':
            return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        case 'expand':
            return <svg {...common}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        case 'captions':
            return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 14a3 3 0 1 1 0-4M16 14a3 3 0 1 1 0-4" /></svg>
        case 'arrow-right':
            return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        case 'info':
            return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
        case 'compass':
            return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M16 8l-2 6-6 2 2-6z" fill="currentColor" fillOpacity=".2" /></svg>
        case 'video':
            return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
        case 'users':
            return <svg {...common}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><path d="M17 4a4 4 0 0 1 0 8M22 21a6 6 0 0 0-5-6" /></svg>
        case 'route':
            return <svg {...common}><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M9 6h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H9a4 4 0 0 0-4 4" /></svg>
    }
}

const ob: Record<string, CSSProperties> = {
    page: { position: 'relative', minHeight: '100vh', background: '#080d18', color: '#dee2f2', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' },
    glowA: { position: 'absolute', top: -200, right: -200, width: 700, height: 700, background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 60%)', pointerEvents: 'none', filter: 'blur(40px)' },
    glowB: { position: 'absolute', bottom: -200, left: -200, width: 700, height: 700, background: 'radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 60%)', pointerEvents: 'none', filter: 'blur(40px)' },
    grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(129,140,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)', pointerEvents: 'none' },

    topbar: { position: 'relative', zIndex: 2, padding: '20px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(129,140,248,0.08)' },
    brand: { display: 'flex', alignItems: 'center', gap: 12 },
    brandMark: { width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #38bdf8, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px -6px rgba(56,189,248,0.5)' },
    brandTxt: { fontSize: 12, fontWeight: 700, letterSpacing: 1.8, color: '#dee2f2' },
    brandSub: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, color: '#7a8094', letterSpacing: 0.3, marginTop: 1 },
    topRight: { display: 'flex', alignItems: 'center', gap: 14 },
    statusPill: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, letterSpacing: 0.5 },
    statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' },
    skipLink: { fontSize: 12.5, color: '#7a8094', textDecoration: 'none', fontFamily: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },

    main: { position: 'relative', zIndex: 2, padding: '40px 36px 60px' },
    layout: { maxWidth: 1340, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr 400px', gap: 36, alignItems: 'start' },
    left: { display: 'flex', flexDirection: 'column', gap: 30, minWidth: 0 },

    hero: { display: 'flex', flexDirection: 'column', gap: 16 },
    kicker: { display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', padding: '6px 11px', borderRadius: 999, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.28)', color: '#38bdf8', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.4 },
    kickerDot: { width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' },
    title: { fontSize: 'clamp(40px, 5.4vw, 64px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: -1.6, margin: 0, color: '#dee2f2' },
    titleAccent: { background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'},
    subtitle: { fontSize: 16, lineHeight: 1.6, color: '#9ca3b8', margin: 0, maxWidth: 620 },
    subStrong: { color: '#dee2f2', fontWeight: 500 },

    videoSection: { display: 'flex', flexDirection: 'column', gap: 10 },
    videoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
    videoHeaderLeft: { display: 'flex', alignItems: 'center', gap: 11, color: '#38bdf8' },
    videoHeaderKey: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: 1.4, color: '#38bdf8' },
    videoHeaderTitle: { fontSize: 15, fontWeight: 500, color: '#dee2f2', marginTop: 2 },
    videoHeaderRight: { display: 'flex', gap: 6 },
    videoChip: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(27,31,43,0.6)', border: '1px solid rgba(129,140,248,0.16)', color: '#9ca3b8', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, letterSpacing: 0.3 },

    videoFrame: { position: 'relative', aspectRatio: '16 / 9', background: 'linear-gradient(135deg, #0f1729 0%, #050913 100%)', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(129,140,248,0.18)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.05) inset' },
    videoBg: { position: 'absolute', inset: 0, overflow: 'hidden' },
    videoBgGlow: { position: 'absolute', top: '40%', left: '50%', width: 500, height: 500, transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 60%)', filter: 'blur(50px)' },
    videoBgPattern: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(56,189,248,0.18) 1px, transparent 0)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)' },

    playBtn: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 92, height: 92, borderRadius: '50%', background: 'linear-gradient(135deg, #fff, #e8e9f3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 6, boxShadow: '0 20px 60px -10px rgba(56,189,248,0.6), 0 0 0 1px rgba(255,255,255,0.2) inset' },
    playBtnRing: { position: 'absolute', inset: -14, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.18)', animation: 'gsa-pulseRing 2.6s ease-out infinite' },
    playBtnRing2: { position: 'absolute', inset: -28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', animation: 'gsa-pulseRing 2.6s ease-out 0.7s infinite' },

    comingSoon: { position: 'absolute', top: 18, left: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 999, background: 'rgba(8,13,24,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(56,189,248,0.35)', color: '#38bdf8', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.4 },
    comingDot: { width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' },

    videoControls: { position: 'absolute', bottom: 80, left: 18, right: 18, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(8,13,24,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' },
    vcBtn: { width: 28, height: 28, borderRadius: 6, color: '#dee2f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    vcTrack: { flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden' },
    vcTrackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '0%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)' },
    vcTrackBuffer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '15%', background: 'rgba(255,255,255,0.15)' },
    vcTime: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: '#9ca3b8', minWidth: 70, textAlign: 'right' },

    videoInstructor: { position: 'absolute', bottom: 18, left: 18, right: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(8,13,24,0.65)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.06)' },
    instructorAvatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
    instructorName: { fontSize: 13.5, fontWeight: 600, color: '#dee2f2' },
    instructorRole: { fontSize: 11, color: '#9ca3b8', marginTop: 2, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3 },
    chapters: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
    chapterLabel: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: '#7a8094', letterSpacing: 0.4 },
    chapterDots: { display: 'flex', gap: 4 },
    cdot: { width: 14, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)' },
    cdotActive: { background: 'linear-gradient(90deg, #38bdf8, #818cf8)', boxShadow: '0 0 6px #38bdf8' },

    transcriptHint: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px', alignSelf: 'flex-start', color: '#7a8094', fontSize: 11.5, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3 },

    nextSection: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 },
    nextHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
    nextKicker: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, letterSpacing: 1.4, color: '#7a8094', marginBottom: 4 },
    nextTitle: { fontSize: 22, fontWeight: 500, letterSpacing: -0.6, margin: 0, color: '#dee2f2' },
    nextHint: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7a8094', fontSize: 11.5, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.3 },
    nextGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
    nextCard: { padding: 18, borderRadius: 14, background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))', border: '1px solid rgba(129,140,248,0.12)', display: 'flex', flexDirection: 'column', gap: 8, transition: 'all .2s' },
    nextIcon: { width: 36, height: 36, borderRadius: 9, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    nextKickerSm: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9.5, letterSpacing: 1.4, color: '#7a8094' },
    nextCardTitle: { fontSize: 14.5, fontWeight: 600, color: '#dee2f2', letterSpacing: -0.2, lineHeight: 1.3 },
    nextCardSub: { fontSize: 12.5, color: '#9ca3b8', lineHeight: 1.5 },

    right: { minWidth: 0 },
    rightSticky: { position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 },

    checklistCard: { padding: 20, borderRadius: 18, background: 'linear-gradient(180deg, rgba(20,25,38,0.7), rgba(14,19,30,0.7))', border: '1px solid rgba(56,189,248,0.18)', boxShadow: '0 20px 60px -16px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 18 },
    clHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    clKicker: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: 1.4, color: '#38bdf8' },
    clTitle: { fontSize: 16, fontWeight: 600, color: '#dee2f2', marginTop: 3, letterSpacing: -0.3 },
    clRing: { position: 'relative', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    clRingTxt: { position: 'absolute', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 600, color: '#dee2f2' },

    clList: { display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 },
    clItem: { display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, border: '1px solid transparent', transition: 'all .15s' },
    clItemActive: { background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.25)' },
    clIcon: { width: 26, height: 26, borderRadius: '50%', background: 'rgba(27,31,43,0.6)', border: '1px solid rgba(129,140,248,0.2)', color: '#7a8094', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    clIconDone: { background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' },
    clIconActive: { background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: '1px solid transparent', color: '#fff' },
    clLabel: { fontSize: 13.5, fontWeight: 500, color: '#dee2f2' },
    clLabelDone: { color: '#7a8094', textDecoration: 'line-through' },
    clSub: { fontSize: 11.5, color: '#7a8094', marginTop: 2, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.2 },
    clActivePill: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: 1.2, color: '#38bdf8', padding: '3px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)' },

    clFoot: { display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(129,140,248,0.12)', paddingTop: 14 },
    primaryCta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, boxShadow: '0 10px 30px -8px rgba(56,189,248,0.55)', transition: 'all .2s', width: '100%' },
    ctaHint: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7a8094', lineHeight: 1.4, fontFamily: '"JetBrains Mono", ui-monospace, monospace', letterSpacing: 0.2 },

    statsCard: { padding: 16, borderRadius: 14, background: 'rgba(27,31,43,0.4)', border: '1px solid rgba(129,140,248,0.12)', display: 'flex', flexDirection: 'column', gap: 12 },
    statsTitle: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: 1.4, color: '#7a8094' },
    statsRow: { display: 'flex', alignItems: 'center', gap: 14 },
    statBig: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 22, fontWeight: 600, color: '#dee2f2', letterSpacing: -0.4 },
    statSub: { fontSize: 11, color: '#7a8094', marginTop: 1 },
    statsDivider: { width: 1, height: 30, background: 'rgba(129,140,248,0.15)' },
    avatarStack: { display: 'flex', alignItems: 'center', paddingTop: 4 },
    avtStack: { width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: '2px solid #0d1422', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9.5, fontWeight: 600, fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
    avtMore: { marginLeft: 8, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: '#9ca3b8' },

    footer: { position: 'relative', zIndex: 2, padding: '20px 36px', borderTop: '1px solid rgba(129,140,248,0.08)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: '#7a8094', letterSpacing: 0.3 },
    footLink: { color: '#9ca3b8', textDecoration: 'underline', textDecorationColor: 'rgba(129,140,248,0.4)' },
}
