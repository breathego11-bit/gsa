import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { situationLabel, urgencyLabel, investmentLabel } from '@/lib/leads/options'
import type { LeadStatus } from '@prisma/client'
import { CheckCircle2, AlertTriangle, CalendarPlus, Video } from 'lucide-react'

const STATUS_META: Record<LeadStatus, { label: string; bg: string; color: string }> = {
    NUEVO: { label: 'Nuevo', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    CONTACTADO: { label: 'Contactado', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    AGENDADO: { label: 'Agendado', bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    DESCARTADO: { label: 'Descartado', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
}

const GOOGLE_BANNER: Record<string, { ok: boolean; msg: string }> = {
    connected: { ok: true, msg: 'Google Calendar conectado correctamente.' },
    denied: { ok: false, msg: 'Conexión cancelada.' },
    norefresh: { ok: false, msg: 'Google no devolvió un refresh token. Revocá el acceso previo en tu cuenta de Google y reconectá.' },
    badstate: { ok: false, msg: 'No se pudo validar la solicitud de conexión. Intentá de nuevo.' },
    error: { ok: false, msg: 'No se pudo conectar con Google. Intentá de nuevo.' },
}

function fmtDate(d: Date): string {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMeeting(d: Date | null, tz: string | null): string {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz ?? undefined,
        })
    } catch {
        return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }
}

interface PageProps {
    searchParams: Promise<{ assignee?: string; google?: string }>
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
    const sp = await searchParams
    const assigneeFilter = typeof sp.assignee === 'string' && sp.assignee ? sp.assignee : undefined
    const banner = sp.google ? GOOGLE_BANNER[sp.google] : undefined

    const session = await getServerSession(authOptions)
    const myUserId = session?.user?.id

    const [leads, members, myConnection] = await Promise.all([
        prisma.lead.findMany({
            where: assigneeFilter ? { assigned_to: assigneeFilter } : {},
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                full_name: true,
                email: true,
                instagram: true,
                whatsapp: true,
                country: true,
                situation: true,
                urgency: true,
                investment: true,
                status: true,
                meeting_at: true,
                meeting_tz_iana: true,
                meeting_link: true,
                created_at: true,
                assignee: { select: { id: true, name: true, last_name: true } },
            },
        }),
        prisma.user.findMany({
            where: { lead_booking_enabled: true },
            select: { id: true, name: true, last_name: true },
            orderBy: { name: 'asc' },
        }),
        myUserId
            ? prisma.calendarConnection.findUnique({
                  where: { user_id_provider: { user_id: myUserId, provider: 'GOOGLE' } },
                  select: { status: true, account_email: true },
              })
            : Promise.resolve(null),
    ])

    const nuevos = leads.filter((l) => l.status === 'NUEVO').length
    const connected = myConnection?.status === 'active'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Leads</h1>
                <p className="section-subtitle">
                    {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
                    {nuevos > 0 && ` · ${nuevos} sin contactar`}
                </p>
            </div>

            {/* Banner de resultado OAuth */}
            {banner && (
                <div
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                    style={{
                        background: banner.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        border: `1px solid ${banner.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                        color: banner.ok ? '#34d399' : '#f87171',
                    }}
                >
                    {banner.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {banner.msg}
                </div>
            )}

            {/* Conexión de Google Calendar (per-member) */}
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                                background: connected ? 'rgba(52,211,153,0.12)' : 'rgba(56,189,248,0.12)',
                                color: connected ? '#34d399' : '#38bdf8',
                            }}
                        >
                            <CalendarPlus size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Google Calendar
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                {connected
                                    ? `Conectado · ${myConnection?.account_email || 'tu cuenta'} — entrás al round-robin de leads`
                                    : myConnection?.status === 'error'
                                      ? 'Conexión con error — reconectá para volver a recibir reuniones'
                                      : 'Conectá tu Google para crear las reuniones de tus leads asignados'}
                            </p>
                        </div>
                    </div>
                    <a
                        href="/api/integrations/google/connect"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{
                            background: connected ? 'var(--bg-raised)' : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            color: connected ? 'var(--text-secondary)' : '#fff',
                            border: connected ? '1px solid var(--border)' : 'none',
                        }}
                    >
                        <CalendarPlus size={14} />
                        {connected ? 'Reconectar' : 'Conectar Google Calendar'}
                    </a>
                </div>
            </Card>

            {/* Filtro por asignado */}
            {members.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <FilterChip label="Todos" href="/admin/leads" active={!assigneeFilter} />
                    {members.map((m) => (
                        <FilterChip
                            key={m.id}
                            label={m.id === myUserId ? `${m.name} (yo)` : `${m.name} ${m.last_name}`.trim()}
                            href={`/admin/leads?assignee=${m.id}`}
                            active={assigneeFilter === m.id}
                        />
                    ))}
                </div>
            )}

            <Card>
                {leads.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {assigneeFilter
                                ? 'No hay leads asignados a este miembro.'
                                : 'Aún no hay leads. Llegan automáticamente desde el formulario de la landing.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Lead</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>WhatsApp</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden xl:table-cell" style={{ color: 'var(--text-secondary)' }}>Situación</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Cita</th>
                                    <th className="pb-3.5 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Asignado</th>
                                    <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                                    <th className="pb-3.5 text-right text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Registrado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => {
                                    const st = STATUS_META[lead.status]
                                    const ig = lead.instagram.startsWith('@') ? lead.instagram : `@${lead.instagram}`
                                    const assignedName = lead.assignee
                                        ? `${lead.assignee.name} ${lead.assignee.last_name}`.trim()
                                        : '—'
                                    return (
                                        <tr key={lead.id} className="table-row-base">
                                            <td className="py-4 pr-4">
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.full_name}</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{lead.email}</p>
                                                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{ig}</p>
                                            </td>
                                            <td className="py-4 pr-4 hidden lg:table-cell text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{lead.whatsapp}</td>
                                            <td className="py-4 pr-4 hidden xl:table-cell text-xs" style={{ color: 'var(--text-secondary)' }} title={`Inversión: ${investmentLabel(lead.investment)}`}>{situationLabel(lead.situation)}</td>
                                            <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <div>{fmtMeeting(lead.meeting_at, lead.meeting_tz_iana)}</div>
                                                {lead.meeting_link && (
                                                    <a href={lead.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5" style={{ color: 'var(--blue-accent)' }}>
                                                        <Video size={12} /> Meet
                                                    </a>
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 hidden sm:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>{assignedName}</td>
                                            <td className="py-4 pr-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }} title={`Urgencia: ${urgencyLabel(lead.urgency)}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtDate(lead.created_at)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
    return (
        <a
            href={href}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={
                active
                    ? { background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }
                    : { background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }
        >
            {label}
        </a>
    )
}
