import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { loadAgenda, loadMeetingStats } from '@/lib/calendar/agenda'
import { AgendaView } from '@/components/agenda/AgendaView'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agenda · GSA' }

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const sp = await searchParams
    // Las métricas salen del CRM, no de Google: se piden en paralelo y no dependen de la conexión.
    const [agenda, stats] = await Promise.all([loadAgenda(session.user.id, sp.week), loadMeetingStats(session.user.id)])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Agenda</h1>
                <p className="section-subtitle">
                    {agenda.accountEmail ? `Tu Google Calendar · ${agenda.accountEmail}` : 'Tu Google Calendar'} · horas en{' '}
                    {agenda.week.tz}
                </p>
            </div>

            <AgendaView agenda={agenda} stats={stats} basePath="/admin/agenda" leadHrefBase="/admin/leads" />
        </div>
    )
}
