import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCloser } from '@/lib/access'
import { LeadDetailView, LEAD_DETAIL_SELECT } from '@/components/leads/LeadDetailView'
import { LeadStatusControl } from '@/components/leads/LeadStatusControl'

export const dynamic = 'force-dynamic'

/**
 * Detalle de un lead del closer: lo que necesita leer antes de la llamada, y el estado para
 * marcar en qué va.
 *
 * El filtro `assigned_to` va en el `where`, así que el lead de otro miembro responde **404 y no
 * 403**: así no se confirma que ese lead existe. Reasignarlo y ver su atribución de campaña
 * siguen siendo cosa del admin.
 */
export default async function CloserLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')
    if (!isCloser(session.user)) redirect(session.user.role === 'ADMIN' ? '/admin/leads' : '/dashboard')

    const { id } = await params
    const lead = await prisma.lead.findFirst({
        where: { id, assigned_to: session.user.id },
        select: LEAD_DETAIL_SELECT,
    })
    if (!lead) notFound()

    return (
        <LeadDetailView
            lead={lead}
            backHref="/dashboard/leads"
            backLabel="Volver a mis leads"
            meetingFooter={<LeadStatusControl leadId={lead.id} current={lead.status} />}
        />
    )
}
