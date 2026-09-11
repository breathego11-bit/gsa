import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarPlus, CalendarCheck, CalendarRange, CalendarDays } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { Card } from '@/components/ui/Card'
import { loadAgenda, loadMeetingStats } from '@/lib/calendar/agenda'
import { KpiCard } from '@/components/sales/KpiCard'
import { parseWorkingHours } from '@/lib/calendar/working-hours'
import { AgendaWeek } from '@/components/agenda/AgendaWeek'
import { WorkingHoursEditor } from '@/components/agenda/WorkingHoursEditor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agenda · GSA' }

const STATUS_BANNER = {
    'not-connected': {
        title: 'Conecta tu Google Calendar para ver tu agenda',
        body: 'Mientras no lo conectes, la agenda aparece vacía y no puedes crear eventos. El horario de abajo sí se puede editar.',
        cta: 'Conectar Google Calendar',
    },
    'connection-error': {
        title: 'Tu conexión con Google Calendar ha caducado',
        body: 'Mientras la app de Google esté en modo de pruebas, la conexión se corta cada 7 días. Reconéctala para volver a ver tu agenda — y para que aplica y VSL puedan volver a asignarte reuniones.',
        cta: 'Reconectar',
    },
    'google-error': {
        title: 'No se pudo cargar tu agenda ahora mismo',
        body: 'Google Calendar no respondió. Recarga la página en un momento.',
        cta: null,
    },
} as const

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const sp = await searchParams
    // Las métricas salen del CRM, no de Google: se piden en paralelo y no dependen de la conexión.
    const [agenda, stats] = await Promise.all([loadAgenda(session.user.id, sp.week), loadMeetingStats(session.user.id)])
    const banner = agenda.status === 'ok' ? null : STATUS_BANNER[agenda.status]
    const isCustom = agenda.workingHours !== null && agenda.workingHours !== undefined
    const effective = parseWorkingHours(agenda.workingHours)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Agenda</h1>
                <p className="section-subtitle">
                    {agenda.accountEmail ? `Tu Google Calendar · ${agenda.accountEmail}` : 'Tu Google Calendar'} · horas en{' '}
                    {agenda.week.tz}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                    icon={<CalendarCheck size={16} />}
                    accent="cyan"
                    label="Hoy"
                    value={stats.day.total}
                    sub={
                        stats.day.total === 0
                            ? 'No tienes reuniones con leads hoy'
                            : `Reuniones con ${leadsWord(stats.day.total)}` +
                              (stats.day.next
                                  ? ` · la próxima a las ${stats.day.next.time} con ${stats.day.next.name}`
                                  : ' · ya no te queda ninguna')
                    }
                />
                <KpiCard
                    icon={<CalendarRange size={16} />}
                    accent="indigo"
                    label="Esta semana"
                    value={stats.week.total}
                    sub={
                        stats.week.total === 0
                            ? 'Sin reuniones con leads'
                            : `Reuniones con ${leadsWord(stats.week.total)} · ${stats.week.upcoming} por delante`
                    }
                />
                <KpiCard
                    icon={<CalendarDays size={16} />}
                    accent="violet"
                    label={`Este mes · ${stats.monthLabel}`}
                    value={stats.month.total}
                    sub={
                        stats.month.total === 0
                            ? 'Sin reuniones con leads'
                            : `Reuniones con ${leadsWord(stats.month.total)} · ${stats.month.upcoming} por delante`
                    }
                />
            </div>

            {banner && (
                <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}
                >
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                        <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {banner.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                {banner.body}
                            </p>
                        </div>
                    </div>
                    {banner.cta && (
                        <a
                            href="/api/integrations/google/connect"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', color: '#fff' }}
                        >
                            <CalendarPlus size={14} />
                            {banner.cta}
                        </a>
                    )}
                </div>
            )}

            <Card>
                <AgendaWeek week={agenda.week} canCreate={agenda.status === 'ok'} />
            </Card>

            <Card>
                {/* Sin `key` a propósito: remontar el editor tras guardar borraba el aviso de
                    "Horario guardado" nada más aparecer. El editor ya conserva en su estado lo que
                    acaba de guardar, y `initial` / `isCustom` le llegan actualizados por props. */}
                <WorkingHoursEditor initial={effective} isCustom={isCustom} tz={agenda.week.tz} />
            </Card>
        </div>
    )
}

function leadsWord(n: number): string {
    return n === 1 ? '1 lead' : `${n} leads`
}
