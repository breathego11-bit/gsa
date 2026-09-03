import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import {
    situationLabel,
    urgencyLabel,
    investmentLabel,
    questionLabel,
    sourceLabel,
} from '@/lib/leads/options'
import { AttributionCard } from '@/components/leads/AttributionCard'
import type { LeadStatus } from '@prisma/client'
import { ArrowLeft, Mail, MessageCircle, Instagram, MapPin, Video, CalendarDays, ExternalLink } from 'lucide-react'

const STATUS_META: Record<LeadStatus, { label: string; bg: string; color: string }> = {
    NUEVO: { label: 'Nuevo', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    CONTACTADO: { label: 'Contactado', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    AGENDADO: { label: 'Agendado', bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    DESCARTADO: { label: 'Descartado', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
}

function fmtDateTime(d: Date | null, tz?: string | null): string {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz ?? undefined,
        })
    } catch {
        return new Date(d).toLocaleString('es-ES')
    }
}

/** El WhatsApp llega como texto libre con prefijos y espacios; wa.me solo acepta dígitos. */
function waLink(raw: string): string {
    return `https://wa.me/${raw.replace(/\D/g, '')}`
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/auth')

    const { id } = await params

    const lead = await prisma.lead.findUnique({
        where: { id },
        select: {
            id: true,
            full_name: true,
            email: true,
            whatsapp: true,
            instagram: true,
            country: true,
            situation: true,
            desired_change: true,
            objectives: true,
            cafe_vision: true,
            urgency: true,
            investment: true,
            status: true,
            source: true,
            meeting_at: true,
            meeting_tz_iana: true,
            meeting_link: true,
            google_event_url: true,
            submitted_at: true,
            created_at: true,
            assigned_at: true,
            utm_source: true,
            utm_medium: true,
            utm_campaign: true,
            utm_content: true,
            utm_term: true,
            fbclid: true,
            landing_url: true,
            referrer: true,
            attribution_first: true,
            attribution_last: true,
            assignee: { select: { id: true, name: true, last_name: true } },
        },
    })

    if (!lead) notFound()

    const st = STATUS_META[lead.status]
    const ig = lead.instagram.startsWith('@') ? lead.instagram : `@${lead.instagram}`
    const igUser = ig.slice(1)

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href="/admin/leads"
                    className="inline-flex items-center gap-1.5 text-xs mb-3 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <ArrowLeft size={14} /> Volver a leads
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="section-title">{lead.full_name}</h1>
                    <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: st.bg, color: st.color }}
                    >
                        {st.label}
                    </span>
                    <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}
                        title={`source: ${lead.source}`}
                    >
                        {sourceLabel(lead.source)}
                    </span>
                </div>
                <p className="section-subtitle">
                    Recibido el {fmtDateTime(lead.submitted_at ?? lead.created_at)}
                </p>
            </div>

            {/* ---------------- Contacto ---------------- */}
            <Card>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Contacto
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <ContactRow icon={<Mail size={14} />} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
                    <ContactRow icon={<MessageCircle size={14} />} label="WhatsApp" value={lead.whatsapp} href={waLink(lead.whatsapp)} />
                    <ContactRow icon={<Instagram size={14} />} label="Instagram" value={ig} href={`https://instagram.com/${igUser}`} />
                    <ContactRow icon={<MapPin size={14} />} label="País" value={lead.country} />
                </div>
            </Card>

            {/* ---------------- Cualificación ---------------- */}
            <Card>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Cualificación
                </h2>

                {/* Las etiquetas dependen del embudo: los mismos códigos significan cosas
                    distintas en Aplica y en la VSL. */}
                <div className="flex flex-wrap gap-2 mb-5">
                    <Chip label="Situación" value={situationLabel(lead.situation, lead.source)} />
                    <Chip label="Urgencia" value={urgencyLabel(lead.urgency, lead.source)} />
                    <Chip label="Inversión" value={investmentLabel(lead.investment, lead.source)} />
                </div>

                <div className="space-y-4">
                    <Answer question={questionLabel('desired_change', lead.source)} answer={lead.desired_change} />
                    <Answer question={questionLabel('objectives', lead.source)} answer={lead.objectives} />
                    <Answer question={questionLabel('cafe_vision', lead.source)} answer={lead.cafe_vision} />
                </div>
            </Card>

            {/* ---------------- Reunión ---------------- */}
            <Card>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Reunión
                </h2>
                {lead.meeting_at ? (
                    <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                            <CalendarDays size={15} style={{ color: 'var(--text-secondary)', marginTop: 2 }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {fmtDateTime(lead.meeting_at, lead.meeting_tz_iana)}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    Hora del lead ({lead.meeting_tz_iana ?? 'zona desconocida'})
                                    {lead.assignee && ` · con ${`${lead.assignee.name} ${lead.assignee.last_name}`.trim()}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lead.meeting_link && (
                                <a
                                    href={lead.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                    style={{ background: 'var(--bg-raised)', color: 'var(--blue-accent)', border: '1px solid var(--border)' }}
                                >
                                    <Video size={13} /> Abrir Meet
                                </a>
                            )}
                            {lead.google_event_url && (
                                <a
                                    href={lead.google_event_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                    style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                >
                                    <ExternalLink size={13} /> Ver en Google Calendar
                                </a>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Este lead completó el formulario pero no llegó a agendar.
                    </p>
                )}
            </Card>

            {/* ---------------- Atribución ---------------- */}
            <AttributionCard lead={lead} />
        </div>
    )
}

function ContactRow({
    icon,
    label,
    value,
    href,
}: {
    icon: React.ReactNode
    label: string
    value: string
    href?: string
}) {
    const body = (
        <div className="flex items-start gap-2.5">
            <span style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                </p>
                <p className="text-sm break-words" style={{ color: href ? 'var(--blue-accent)' : 'var(--text-primary)' }}>
                    {value || '—'}
                </p>
            </div>
        </div>
    )
    if (!href) return body
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {body}
        </a>
    )
}

function Chip({ label, value }: { label: string; value: string }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
        >
            <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {value}
            </span>
        </span>
    )
}

function Answer({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="p-3.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
            {/* La pregunta va encima de la respuesta: sin ella, "objetivos" no significa lo
                mismo en Aplica que en la VSL y el closer lee el dato fuera de contexto. */}
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                {question}
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {answer || '—'}
            </p>
        </div>
    )
}
