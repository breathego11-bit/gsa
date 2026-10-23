import Link from 'next/link'
import { Prisma } from '@prisma/client'
import type { LeadStatus, LeadSituation, LeadUrgency, LeadInvestment } from '@prisma/client'
import { ArrowLeft, Mail, MessageCircle, Instagram, MapPin, Video, CalendarDays, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
    situationLabel,
    urgencyLabel,
    investmentLabel,
    questionLabel,
    sourceLabel,
} from '@/lib/leads/options'
import { LEAD_STATUS_META, fmtMeetingLong, igHandle, waLink } from '@/lib/leads/display'

/**
 * Detalle de un lead, compartido por el panel del admin y el del closer.
 *
 * Las dos vistas enseñan lo mismo (contacto, cualificación y reunión) y se diferencian en los
 * bloques que se pasan por props: el admin añade el control de responsable y la atribución de
 * campaña; el closer, el selector de estado de su propio lead. Antes esto vivía entero en
 * `/admin/leads/[id]`, y duplicarlo habría obligado a mantener dos diseños en paralelo.
 */

/** Campos que necesita la vista. Lo usan las dos páginas para que no se desincronicen. */
export const LEAD_DETAIL_SELECT = {
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
} satisfies Prisma.LeadSelect

export type LeadDetail = Prisma.LeadGetPayload<{ select: typeof LEAD_DETAIL_SELECT }>

export function LeadDetailView({
    lead,
    backHref,
    backLabel,
    meetingFooter,
    children,
}: {
    lead: LeadDetail
    backHref: string
    backLabel: string
    /** Bloque al pie de la tarjeta de reunión: responsable (admin) o estado (closer). */
    meetingFooter?: React.ReactNode
    /** Tarjetas extra al final, como la atribución de campaña del admin. */
    children?: React.ReactNode
}) {
    const st = LEAD_STATUS_META[lead.status as LeadStatus]
    const ig = igHandle(lead.instagram)
    const igUser = ig.slice(1)

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 text-xs mb-3 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <ArrowLeft size={14} /> {backLabel}
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
                    Recibido el {fmtMeetingLong(lead.submitted_at ?? lead.created_at)}
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
                    <Chip label="Situación" value={situationLabel(lead.situation as LeadSituation, lead.source)} />
                    <Chip label="Urgencia" value={urgencyLabel(lead.urgency as LeadUrgency, lead.source)} />
                    <Chip label="Inversión" value={investmentLabel(lead.investment as LeadInvestment, lead.source)} />
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
                                    {fmtMeetingLong(lead.meeting_at, lead.meeting_tz_iana)}
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

                {meetingFooter && (
                    <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        {meetingFooter}
                    </div>
                )}
            </Card>

            {children}
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
