import { CalendarPlus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SELF_SERVICE_TARGET_WHERE, isLeadAuthorized } from '@/lib/calendar/pool'
import { getAccessProfile } from '@/lib/access-profile'
import { countFutureMeetings } from '@/lib/calendar/transfer'
import { GoogleCalendarActions } from '@/components/leads/GoogleCalendarActions'

/**
 * Fila de conexión del Google Calendar **del propio usuario**: conectar, reconectar y desconectar
 * traspasando sus reuniones. Sin tarjeta alrededor, para que la usen tanto la agenda del closer como
 * la tarjeta de calendarios del admin en `/admin/leads` (antes cada una tenía su copia).
 *
 * Para un closer, conectar NO lo mete en el reparto: eso lo autoriza un admin (ver `pool.ts`). El
 * texto distingue los casos, porque "conectado" a secas hacía pensar que ya iban a llegarle leads.
 */
export async function CalendarConnectionRow({ userId }: { userId: string }) {
    const [me, connection, futureMeetings, members] = await Promise.all([
        getAccessProfile(userId),
        prisma.calendarConnection.findUnique({
            where: { user_id_provider: { user_id: userId, provider: 'GOOGLE' } },
            select: { status: true, account_email: true },
        }),
        // Reuniones futuras propias: hay que saberlas ANTES de ofrecer la desconexión, porque son
        // las que quedarían atrapadas en el calendario si se suelta la conexión sin traspasarlas.
        countFutureMeetings(userId),
        /*
         * A quién se le puede traspasar una reunión: miembros del pool (`lead_booking_enabled`)
         * con el calendario ACTIVO. Sin conexión activa no hay dónde crear el evento, y a quien
         * se sacó del reparto no se le deben meter reuniones por la puerta de atrás. Es el mismo
         * criterio que usa `/admin/leads`.
         */
        prisma.user.findMany({
            // La misma condición que exige la API al desconectar (SELF_SERVICE_TARGET_WHERE).
            where: { ...SELF_SERVICE_TARGET_WHERE, id: { not: userId } },
            select: { id: true, name: true, last_name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const connected = connection?.status === 'active'
    const authorized = me ? isLeadAuthorized(me) : false
    const account = connection?.account_email || 'tu cuenta'

    const status = connected
        ? authorized
            ? `Conectado · ${account} — ya entras en el reparto de leads`
            : `Conectado · ${account} — ves tu agenda aquí. Recibir leads lo activa un admin`
        : connection?.status === 'error'
          ? authorized
              ? 'Conexión con error — reconéctala para volver a recibir reuniones'
              : 'Conexión con error — reconéctala para volver a ver tu agenda'
          : authorized
            ? 'Conecta tu Google para empezar a recibir leads y que se creen tus reuniones'
            : 'Conecta tu Google para ver tu agenda aquí'
    const transferTargets = members.map((m) => ({ id: m.id, name: `${m.name} ${m.last_name}`.trim() }))

    return (
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
                            {status}
                        </p>
                    </div>
                </div>
                <GoogleCalendarActions
                    connected={connected}
                    futureMeetings={futureMeetings}
                    transferTargets={transferTargets}
                />
        </div>
    )
}
