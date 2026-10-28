import Link from 'next/link'
import { Video } from 'lucide-react'
import type { LeadStatus, LeadSituation, LeadUrgency, LeadInvestment } from '@prisma/client'
import { situationLabel, urgencyLabel, investmentLabel, sourceLabel } from '@/lib/leads/options'
import { LEAD_STATUS_META, fmtLeadDate, fmtMeetingShort, igHandle } from '@/lib/leads/display'

/**
 * Tabla de leads, compartida por el panel del admin (`/admin/leads`) y el del closer
 * (`/dashboard/leads`). Antes eran dos copias de ~50 líneas de JSX que iban a divergir.
 *
 * El admin ve además la campaña de origen y el responsable (`adminColumns`); el closer, que solo
 * ve sus propios leads, no los necesita.
 */

export interface LeadsTableRow {
    id: string
    full_name: string
    email: string
    instagram: string
    whatsapp: string
    situation: LeadSituation
    urgency: LeadUrgency
    investment: LeadInvestment
    status: LeadStatus
    source: string
    meeting_at: Date | null
    meeting_tz_iana: string | null
    meeting_link: string | null
    created_at: Date
    utm_campaign?: string | null
    utm_source?: string | null
    assignee?: { name: string; last_name: string } | null
}

const TH = 'pb-3.5 text-xs font-semibold uppercase tracking-wider'
const TH_STYLE = { color: 'var(--text-secondary)' }

export function LeadsTable({
    leads,
    hrefBase,
    adminColumns = false,
    emptyText,
}: {
    leads: LeadsTableRow[]
    /** Ruta del detalle: `/admin/leads` o `/dashboard/leads`. */
    hrefBase: string
    /** Columnas de campaña y responsable, solo para el admin. */
    adminColumns?: boolean
    emptyText: string
}) {
    if (leads.length === 0) {
        return (
            <div className="flex flex-col items-center py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {emptyText}
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className={`${TH} text-left`} style={TH_STYLE}>Lead</th>
                        <th className={`${TH} text-left hidden lg:table-cell`} style={TH_STYLE}>WhatsApp</th>
                        <th className={`${TH} text-left hidden xl:table-cell`} style={TH_STYLE}>Situación</th>
                        {adminColumns && <th className={`${TH} text-left hidden xl:table-cell`} style={TH_STYLE}>Campaña</th>}
                        <th className={`${TH} text-left hidden md:table-cell`} style={TH_STYLE}>Cita</th>
                        {adminColumns && <th className={`${TH} text-left hidden sm:table-cell`} style={TH_STYLE}>Asignado</th>}
                        <th className={`${TH} text-center`} style={TH_STYLE}>Estado</th>
                        <th className={`${TH} text-right hidden lg:table-cell`} style={TH_STYLE}>Alta</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => {
                        const st = LEAD_STATUS_META[lead.status]
                        const assignedName = lead.assignee ? `${lead.assignee.name} ${lead.assignee.last_name}`.trim() : '—'
                        return (
                            <tr key={lead.id} className="table-row-base">
                                <td className="py-4 pr-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* El detalle es donde están las respuestas del formulario: lo que hace falta antes de llamar. */}
                                        <Link href={`${hrefBase}/${lead.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
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
                                <td className="py-4 pr-4 hidden xl:table-cell text-xs" style={{ color: 'var(--text-secondary)' }} title={`Inversión: ${investmentLabel(lead.investment, lead.source)}`}>
                                    {situationLabel(lead.situation, lead.source)}
                                </td>
                                {adminColumns && (
                                    <td className="py-4 pr-4 hidden xl:table-cell text-xs font-mono" style={{ color: 'var(--text-secondary)' }} title={lead.utm_source ? `source: ${lead.utm_source}` : undefined}>
                                        {lead.utm_campaign ?? <span style={{ opacity: 0.4 }}>—</span>}
                                    </td>
                                )}
                                <td className="py-4 pr-4 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <div>{fmtMeetingShort(lead.meeting_at, lead.meeting_tz_iana)}</div>
                                    {lead.meeting_link && (
                                        <a href={lead.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5" style={{ color: 'var(--blue-accent)' }}>
                                            <Video size={12} /> Meet
                                        </a>
                                    )}
                                </td>
                                {adminColumns && (
                                    <td className="py-4 pr-4 hidden sm:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>{assignedName}</td>
                                )}
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
    )
}
