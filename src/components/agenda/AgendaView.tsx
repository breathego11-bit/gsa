import { AlertTriangle, CalendarPlus, CalendarCheck, CalendarRange, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/sales/KpiCard'
import { parseWorkingHours } from '@/lib/calendar/working-hours'
import { AgendaWeek } from '@/components/agenda/AgendaWeek'
import { WorkingHoursEditor } from '@/components/agenda/WorkingHoursEditor'
import type { loadAgenda, loadMeetingStats } from '@/lib/calendar/agenda'

/**
 * Cuerpo de la agenda: métricas de reuniones, estado de la conexión, semana y horario de atención.
 *
 * La usan el panel del admin (`/admin/agenda`) y el del closer (`/dashboard/agenda`). Las dos
 * cargan los datos del **propio** usuario, así que lo único que cambia es la ruta sobre la que
 * navegan las flechas de semana y adónde abren las fichas de los leads.
 */

type Agenda = Awaited<ReturnType<typeof loadAgenda>>
type Stats = Awaited<ReturnType<typeof loadMeetingStats>>

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

export function AgendaView({
    agenda,
    stats,
    basePath,
    leadHrefBase,
    connection,
}: {
    agenda: Agenda
    stats: Stats
    /** Ruta de esta agenda, para la navegación entre semanas. */
    basePath: string
    /** Dónde abre la ficha de un lead desde su reunión. */
    leadHrefBase: string
    /**
     * Bloque de conexión de Google propio de la página (el closer lo tiene en su agenda). Si se
     * pasa, **sustituye** a los avisos de "conecta / reconecta": con los dos saldrían dos botones de
     * conectar, y el texto de los avisos da por hecho que el usuario está en el reparto, cosa que en
     * un closer depende de que un admin lo autorice. El bloque propio ya explica bien su caso.
     */
    connection?: React.ReactNode
}) {
    const connectionStatus = agenda.status === 'not-connected' || agenda.status === 'connection-error'
    const banner =
        agenda.status === 'ok' || (connection && connectionStatus) ? null : STATUS_BANNER[agenda.status]
    const isCustom = agenda.workingHours !== null && agenda.workingHours !== undefined
    const effective = parseWorkingHours(agenda.workingHours)

    return (
        <>
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

            {connection}

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
                <AgendaWeek
                    week={agenda.week}
                    canCreate={agenda.status === 'ok'}
                    basePath={basePath}
                    leadHrefBase={leadHrefBase}
                />
            </Card>

            <Card>
                {/* Sin `key` a propósito: remontar el editor tras guardar borraba el aviso de
                    "Horario guardado" nada más aparecer. El editor ya conserva en su estado lo que
                    acaba de guardar, y `initial` / `isCustom` le llegan actualizados por props. */}
                <WorkingHoursEditor initial={effective} isCustom={isCustom} tz={agenda.week.tz} />
            </Card>
        </>
    )
}

function leadsWord(n: number): string {
    return n === 1 ? '1 lead' : `${n} leads`
}
