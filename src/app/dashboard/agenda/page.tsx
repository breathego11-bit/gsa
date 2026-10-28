import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { isCloser } from '@/lib/access'
import { loadAgenda, loadMeetingStats } from '@/lib/calendar/agenda'
import { AgendaView } from '@/components/agenda/AgendaView'
import { CalendarConnectionRow } from '@/components/leads/CalendarConnectionRow'
import { GoogleConnectBanner } from '@/components/leads/GoogleConnectBanner'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi agenda · GSA' }

/**
 * Agenda del closer: su Google Calendar dentro de GSA.
 *
 * Es la pantalla donde **conecta su calendario**: hasta tenerla, el botón solo existía en `/admin`.
 * Conectarlo no lo mete en el reparto de leads —eso lo autoriza un admin desde su ficha
 * (`pool.ts`)—, pero el reparto sí exige calendario conectado, así que sin esta pantalla un closer
 * autorizado no tenía forma de empezar a recibir.
 */
export default async function CloserAgendaPage({
    searchParams,
}: {
    searchParams: Promise<{ week?: string; google?: string }>
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    // Los admins tienen su propia agenda en el panel; aquí solo entran los closers.
    if (!isCloser(session.user)) redirect(session.user.role === 'ADMIN' ? '/admin/agenda' : '/dashboard')

    const sp = await searchParams
    const [agenda, stats] = await Promise.all([
        loadAgenda(session.user.id, sp.week, { ownLeadsOnly: true }),
        loadMeetingStats(session.user.id),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Mi agenda</h1>
                <p className="section-subtitle">
                    {agenda.accountEmail ? `Tu Google Calendar · ${agenda.accountEmail}` : 'Tu Google Calendar'} · horas en{' '}
                    {agenda.week.tz}
                </p>
            </div>

            <GoogleConnectBanner status={sp.google} />

            <AgendaView
                agenda={agenda}
                stats={stats}
                basePath="/dashboard/agenda"
                leadHrefBase="/dashboard/leads"
                connection={
                    <Card>
                        <CalendarConnectionRow userId={session.user.id} />
                    </Card>
                }
            />
        </div>
    )
}
