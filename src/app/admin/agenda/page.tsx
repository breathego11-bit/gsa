import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarPlus } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { Card } from '@/components/ui/Card'
import { loadAgenda } from '@/lib/calendar/agenda'
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
    const agenda = await loadAgenda(session.user.id, sp.week)
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
