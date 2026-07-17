import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessCoach } from '@/lib/access'
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
    if (
        !canAccessCoach({
            role: u.role,
            closer_enabled: u.closer_enabled ?? false,
            closer_type: u.closer_type ?? null,
            payment_status: u.payment_status ?? 'none',
        })
    ) {
        redirect('/dashboard')
    }

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

    // Conversación activa: la de la URL (si es del alumno) o una nueva.
    let activeConversationId: string = randomUUID()
    let initialMessages: CoachUIMessage[] = []

    if (c && conversations.some((conv) => conv.id === c)) {
        activeConversationId = c
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

    return (
        <CoachClient
            basePath="/dashboard/coach"
            activeConversationId={activeConversationId}
            initialMessages={initialMessages}
            conversations={conversations}
            firstName={u.name ?? 'alumno'}
        />
    )
}
