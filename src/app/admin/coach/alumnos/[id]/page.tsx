import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MessageBubble } from '@/components/coach/CoachClient'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Evaluación · GSA' }

export default async function CoachAlumnoDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const { id } = await params

    const conversation = await prisma.coachConversation.findUnique({
        where: { id },
        select: {
            title: true,
            call_type: true,
            user: { select: { name: true, last_name: true, email: true } },
            messages: {
                orderBy: { created_at: 'asc' },
                select: { id: true, role: true, content: true },
            },
        },
    })

    if (!conversation) notFound()

    return (
        <div className="max-w-3xl">
            <Link
                href="/admin/coach/alumnos"
                className="inline-flex items-center gap-1.5 text-[12.5px] mb-4"
                style={{ color: '#7a8094', textDecoration: 'none' }}
            >
                <ArrowLeft size={14} /> Volver a evaluaciones
            </Link>

            <h1 className="text-[19px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                {conversation.title}
            </h1>
            <p className="text-[12.5px] mb-6" style={{ color: '#7a8094' }}>
                {conversation.user.name} {conversation.user.last_name} · {conversation.user.email}
                {conversation.call_type ? ` · ${conversation.call_type}` : ''}
            </p>

            <div className="flex flex-col gap-5">
                {conversation.messages.map((m) => (
                    <MessageBubble key={m.id} role={m.role} text={m.content} />
                ))}
            </div>
        </div>
    )
}
