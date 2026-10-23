import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AttributionCard } from '@/components/leads/AttributionCard'
import { LeadAssigneeControl } from '@/components/leads/LeadAssigneeControl'
import { LeadDetailView, LEAD_DETAIL_SELECT } from '@/components/leads/LeadDetailView'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/auth')

    const { id } = await params

    const [lead, bookableMembers] = await Promise.all([
        prisma.lead.findUnique({ where: { id }, select: LEAD_DETAIL_SELECT }),
        /*
         * Quien puede RECIBIR la reunión: solo miembros con calendario activo, porque sin conexión
         * no hay dónde crear el evento.
         *
         * Se incluye además a cualquiera que esté en el pool de reparto aunque su calendario no
         * esté activo ahora mismo: con el consent screen en modo Testing los tokens caducan cada
         * 7 días, así que el responsable actual de un lead puede tener la conexión caída de forma
         * rutinaria. Si se filtrara solo por activos, su propio lead aparecería como "Sin asignar".
         */
        prisma.user.findMany({
            where: {
                OR: [
                    { calendars: { some: { provider: 'GOOGLE', status: 'active' } } },
                    { lead_booking_enabled: true },
                ],
            },
            select: {
                id: true,
                name: true,
                last_name: true,
                calendars: { where: { provider: 'GOOGLE' }, select: { status: true } },
            },
            orderBy: { name: 'asc' },
        }),
    ])

    if (!lead) notFound()

    /*
     * Opciones del desplegable de responsable.
     *
     * Al responsable ACTUAL se le añade siempre, aunque no salga en la consulta: quien desconecta
     * su calendario pierde la conexión y `lead_booking_enabled`, así que desaparece de las dos
     * ramas del OR. Sin esta línea, el <select> no encontraría su propia opción y sus leads se
     * verían como "Sin asignar" justo mientras la ficha, arriba, sigue diciendo su nombre.
     */
    const assigneeOptions = bookableMembers.map((m) => ({
        id: m.id,
        name: `${m.name} ${m.last_name}`.trim(),
        calendarActive: m.calendars[0]?.status === 'active',
    }))
    if (lead.assignee && !assigneeOptions.some((o) => o.id === lead.assignee!.id)) {
        assigneeOptions.unshift({
            id: lead.assignee.id,
            name: `${lead.assignee.name} ${lead.assignee.last_name}`.trim(),
            calendarActive: false,
        })
    }

    return (
        <LeadDetailView
            lead={lead}
            backHref="/admin/leads"
            backLabel="Volver a leads"
            meetingFooter={
                <>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Responsable
                    </p>
                    <LeadAssigneeControl
                        leadId={lead.id}
                        currentAssigneeId={lead.assignee?.id ?? null}
                        hasMeeting={Boolean(lead.meeting_at)}
                        members={assigneeOptions}
                    />
                </>
            }
        >
            <AttributionCard lead={lead} />
        </LeadDetailView>
    )
}
