import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarPlus, Video } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCloser } from '@/lib/access'
import { Card } from '@/components/ui/Card'
import { situationLabel, urgencyLabel, investmentLabel, sourceLabel } from '@/lib/leads/options'
import { LEAD_STATUS_META, fmtLeadDate, fmtMeetingShort, igHandle, sortOwnLeads } from '@/lib/leads/display'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis leads · GSA' }

/**
 * Leads asignados al closer.
 *
 * Solo los suyos: la consulta filtra por `assigned_to`, así que no hay forma de ver los de otro
 * miembro del equipo. La atribución de campaña y la reasignación se quedan en el panel del admin.
 */
export default async function CloserLeadsPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (!isCloser(session.user)) redirect(session.user.role === 'ADMIN' ? '/admin/leads' : '/dashboard')

    const [leads, connection] = await Promise.all([
        prisma.lead.findMany({
            where: { assigned_to: session.user.id },
            orderBy: [{ meeting_at: 'asc' }, { created_at: 'desc' }],
            select: {
                id: true,
                full_name: true,
                email: true,
                whatsapp: true,
                instagram: true,
                situation: true,
                urgency: true,
                investment: true,
                status: true,
                source: true,
                meeting_at: true,
                meeting_tz_iana: true,
                meeting_link: true,
                created_at: true,
            },
        }),
        prisma.calendarConnection.findUnique({
            where: { user_id_provider: { user_id: session.user.id, provider: 'GOOGLE' } },
            select: { status: true },
        }),
    ])

    const sorted = sortOwnLeads(leads)

    const nuevos = leads.filter((l) => l.status === 'NUEVO').length
    const connected = connection?.status === 'active'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Mis leads</h1>
                <p className="section-subtitle">
                    {leads.length} {leads.length === 1 ? 'lead asignado' : 'leads asignados'}
                    {nuevos > 0 && ` · ${nuevos} sin contactar`}
                </p>
            </div>

            {/*
              * Sin calendario conectado el reparto no le asigna nada, así que un closer nuevo
              * vería esta pantalla vacía sin entender por qué. El aviso lo manda a conectarlo.
              */}
            {!connected && (
                <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}
                >
                    <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Conecta tu Google Calendar para recibir leads
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Las reuniones se reparten entre quien tiene el calendario conectado. Mientras no lo conectes,
                            no te van a asignar ninguna.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/agenda"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', color: '#fff' }}
                    >
                        <CalendarPlus size={14} />
                        Ir a mi agenda
                    </Link>
                </div>
            )}

            <Card>
                {leads.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Todavía no tienes leads asignados. Llegan solos cuando alguien reserva una llamada y le toca
                            tu turno en el reparto.
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
                                    <th className="pb-3.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                                    <th className="pb-3.5 text-right text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Alta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((lead) => {
                                    const st = LEAD_STATUS_META[lead.status]
                                    return (
                                        <tr key={lead.id} className="table-row-base">
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* El detalle es donde están las respuestas del formulario: lo que necesita antes de llamar. */}
                                                    <Link href={`/dashboard/leads/${lead.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                                                        {lead.full_name}
                                                    </Link>
                                                    <span
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                                                        style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}
                                                        title={`source: ${lead.source}`}
                                                    >
                                                        {sourceLabel(lead.source)}
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{lead.email}</p>
                                                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{igHandle(lead.instagram)}</p>
                                            </td>
                                            <td className="py-4 pr-4 hidden lg:table-cell text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{lead.whatsapp}</td>
                                            <td className="py-4 pr-4 hidden xl:table-cell text-xs" style={{ color: 'var(--text-secondary)' }} title={`Inversión: ${investmentLabel(lead.investment, lead.source)}`}>{situationLabel(lead.situation, lead.source)}</td>
                                            <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <div>{fmtMeetingShort(lead.meeting_at, lead.meeting_tz_iana)}</div>
                                                {lead.meeting_link && (
                                                    <a href={lead.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5" style={{ color: 'var(--blue-accent)' }}>
                                                        <Video size={12} /> Meet
                                                    </a>
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }} title={`Urgencia: ${urgencyLabel(lead.urgency, lead.source)}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtLeadDate(lead.created_at)}</td>
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
