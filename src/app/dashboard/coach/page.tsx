import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadCoachAccess } from '@/lib/coach/access'
import { CoachClient, type CoachUIMessage, type CoachConversationBrief } from '@/components/coach/CoachClient'

export const metadata = { title: 'Coach IA · GSA' }

export default async function CoachPage({
    searchParams,
}: {
    searchParams: Promise<{ c?: string }>
}) {
    const session = await getServerSession(authOptions)
    if (!session?.user) redirect('/auth')

    const u = session.user
    /*
     * Ya no se redirige a quien no ha pagado: ahora entra en modo prueba. Si agotó sus
     * evaluaciones gratuitas entra igual, ve su historial y recibe el popup de bloqueo
     * (que es lo que pidió el cliente: "un pop up cada que lo intenten abrir").
     */
    const access = await loadCoachAccess(u.id, {
        role: u.role,
        closer_enabled: u.closer_enabled ?? false,
        closer_type: u.closer_type ?? null,
        payment_status: u.payment_status ?? 'none',
    })

    const { c } = await searchParams

    // Historial de conversaciones del alumno (panel lateral).
    const conversations: CoachConversationBrief[] = (
        await prisma.coachConversation.findMany({
            where: { user_id: u.id },
            orderBy: { updated_at: 'desc' },
            take: 40,
            select: { id: true, title: true, updated_at: true },
        })
    ).map((conv) => ({
        id: conv.id,
        title: conv.title,
        updated_at: conv.updated_at.toISOString(),
    }))

    // Conversación activa. Se HONRA el id `c` de la URL tal cual, aunque todavía no
    // esté persistido: al crear un chat nuevo hay una carrera entre el POST que lo
    // guarda y el router.replace(?c=…). Si se re-generara un id aquí, los mensajes
    // siguientes irían a otra conversación (chats que se juntan / mensajes perdidos).
    // Solo se descarta el `c` si pertenece a OTRO usuario. Sin `c` → chat nuevo.
    let activeConversationId: string = randomUUID()
    let initialMessages: CoachUIMessage[] = []

    if (c) {
        const owner = await prisma.coachConversation.findUnique({
            where: { id: c },
            select: { user_id: true },
        })
        if (!owner || owner.user_id === u.id) {
            activeConversationId = c
            if (owner) {
                const dbMessages = await prisma.coachMessage.findMany({
                    where: { conversation_id: c },
                    orderBy: { created_at: 'asc' },
                    select: { id: true, role: true, content: true },
                })
                initialMessages = dbMessages.map((m) => ({
                    id: m.id,
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    parts: [{ type: 'text', text: m.content }],
                }))
            }
        }
    }

    return (
        // key: al cambiar de conversación se remonta el chat para que useChat
        // recargue los mensajes correctos y no arrastre los del chat anterior.
        <CoachClient
            key={activeConversationId}
            basePath="/dashboard/coach"
            activeConversationId={activeConversationId}
            initialMessages={initialMessages}
            conversations={conversations}
            firstName={u.name ?? 'alumno'}
            access={access}
        />
    )
}
