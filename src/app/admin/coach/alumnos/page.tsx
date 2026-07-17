import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachAdminTabs } from '@/components/coach/CoachAdminTabs'
import { MessageSquare, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Evaluaciones de alumnos · GSA' }

export default async function CoachAlumnosPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const conversations = await prisma.coachConversation.findMany({
        orderBy: { updated_at: 'desc' },
        take: 100,
        select: {
            id: true,
            title: true,
            call_type: true,
            updated_at: true,
            user: { select: { name: true, last_name: true, email: true } },
            _count: { select: { messages: true } },
        },
    })

    return (
        <div>
            <h1 className="text-[22px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                Evaluaciones de alumnos
            </h1>
            <CoachAdminTabs />

            {conversations.length === 0 ? (
                <p className="text-[13.5px]" style={{ color: '#7a8094' }}>
                    Todavía no hay evaluaciones. Cuando un alumno use el Coach IA aparecerán aquí.
                </p>
            ) : (
                <div className="flex flex-col gap-1.5 max-w-3xl">
                    {conversations.map((c) => (
                        <Link
                            key={c.id}
                            href={`/admin/coach/alumnos/${c.id}`}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                            style={{
                                background: 'rgba(20,25,38,0.5)',
                                border: '1px solid rgba(129,140,248,0.12)',
                                textDecoration: 'none',
                            }}
                        >
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(56,189,248,0.12)' }}
                            >
                                <MessageSquare size={16} style={{ color: '#38bdf8' }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[13.5px] font-medium truncate" style={{ color: '#dee2f2' }}>
                                    {c.title}
                                </div>
                                <div className="text-[11.5px] truncate" style={{ color: '#7a8094' }}>
                                    {c.user.name} {c.user.last_name} · {c._count.messages} mensajes
                                    {c.call_type ? ` · ${c.call_type}` : ''}
                                </div>
                            </div>
                            <ChevronRight size={16} style={{ color: '#5a6178' }} />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
