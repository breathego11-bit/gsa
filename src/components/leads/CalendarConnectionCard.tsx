import { CalendarPlus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { countFutureMeetings } from '@/lib/calendar/transfer'
import { GoogleCalendarActions } from '@/components/leads/GoogleCalendarActions'

/**
 * Tarjeta de conexión del Google Calendar **del propio usuario**: conectar, reconectar y
 * desconectar traspasando sus reuniones.
 *
 * Conectar equivale a entrar al reparto de leads (`lead_booking_enabled` se activa en el callback
 * de OAuth), así que el texto lo dice explícitamente: es la consecuencia que importa.
 */
export async function CalendarConnectionCard({ userId }: { userId: string }) {
    const [connection, futureMeetings, members] = await Promise.all([
        prisma.calendarConnection.findUnique({
            where: { user_id_provider: { user_id: userId, provider: 'GOOGLE' } },
            select: { status: true, account_email: true },
        }),
        // Reuniones futuras propias: hay que saberlas ANTES de ofrecer la desconexión, porque son
        // las que quedarían atrapadas en el calendario si se suelta la conexión sin traspasarlas.
        countFutureMeetings(userId),
        /*
         * A quién se le puede traspasar una reunión: solo miembros con el calendario ACTIVO. Sin
         * conexión activa no hay dónde crear el evento, así que ofrecerlos sería ofrecer un error.
         */
        prisma.user.findMany({
            where: {
                id: { not: userId },
                calendars: { some: { provider: 'GOOGLE', status: 'active' } },
            },
            select: { id: true, name: true, last_name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const connected = connection?.status === 'active'
    const transferTargets = members.map((m) => ({ id: m.id, name: `${m.name} ${m.last_name}`.trim() }))

    return (
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
                                ? `Conectado · ${connection?.account_email || 'tu cuenta'} — ya entras en el reparto de leads`
                                : connection?.status === 'error'
                                  ? 'Conexión con error — reconéctala para volver a recibir reuniones'
                                  : 'Conecta tu Google para que te asignen leads y se creen tus reuniones'}
                        </p>
                    </div>
                </div>
                <GoogleCalendarActions
                    connected={connected}
                    futureMeetings={futureMeetings}
                    transferTargets={transferTargets}
                />
            </div>
        </Card>
    )
}
