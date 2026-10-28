import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCloser } from '@/lib/access'
import { isLeadAuthorized } from '@/lib/calendar/pool'
import { getAccessProfile } from '@/lib/access-profile'
import { Card } from '@/components/ui/Card'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { sortOwnLeads } from '@/lib/leads/display'

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

    const [leads, connection, me] = await Promise.all([
        prisma.lead.findMany({
            // Sin `orderBy`: el orden lo decide `sortOwnLeads` (próxima reunión primero).
            where: { assigned_to: session.user.id },
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
        getAccessProfile(session.user.id),
    ])

    const sorted = sortOwnLeads(leads)

    const nuevos = leads.filter((l) => l.status === 'NUEVO').length
    const connected = connection?.status === 'active'
    // Recibir leads lo autoriza un admin; conectar el calendario no basta (ver pool.ts).
    const authorized = me ? isLeadAuthorized(me) : false

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
              * Sin autorización no le llega ningún lead nuevo. Se dice claramente para que no lo
              * interprete como un fallo: los que ya tenía siguen aquí y los puede gestionar.
              */}
            {!authorized && (
                <div
                    className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)' }}
                >
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        Ahora mismo no recibes leads nuevos
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        El reparto de reuniones lo activa un admin. Los leads que ya tienes asignados siguen siendo
                        tuyos y los puedes gestionar desde aquí.
                    </p>
                </div>
            )}

            {/*
              * Autorizado pero sin calendario: el reparto no le asigna nada, así que vería esta
              * pantalla vacía sin entender por qué. El aviso lo manda a conectarlo.
              */}
            {authorized && !connected && (
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
                <LeadsTable
                    leads={sorted}
                    hrefBase="/dashboard/leads"
                    emptyText="Todavía no tienes leads asignados. Llegan solos cuando alguien reserva una llamada y le toca tu turno en el reparto."
                />
            </Card>
        </div>
    )
}
