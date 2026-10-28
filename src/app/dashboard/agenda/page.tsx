import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { isCloser } from '@/lib/access'
import { loadAgenda, loadMeetingStats } from '@/lib/calendar/agenda'
import { AgendaView } from '@/components/agenda/AgendaView'
import { CalendarConnectionCard } from '@/components/leads/CalendarConnectionCard'
import { GOOGLE_CONNECT_BANNER } from '@/lib/leads/display'

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
    const banner = sp.google ? GOOGLE_CONNECT_BANNER[sp.google] : undefined
    const [agenda, stats] = await Promise.all([loadAgenda(session.user.id, sp.week), loadMeetingStats(session.user.id)])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Mi agenda</h1>
                <p className="section-subtitle">
                    {agenda.accountEmail ? `Tu Google Calendar · ${agenda.accountEmail}` : 'Tu Google Calendar'} · horas en{' '}
                    {agenda.week.tz}
                </p>
            </div>

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

            <AgendaView
                agenda={agenda}
                stats={stats}
                basePath="/dashboard/agenda"
                leadHrefBase="/dashboard/leads"
                connectionCardShown
            >
                <CalendarConnectionCard userId={session.user.id} />
            </AgendaView>
        </div>
    )
}
