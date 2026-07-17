import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachAdminTabs } from '@/components/coach/CoachAdminTabs'
import { CoachSettingsForm } from '@/components/coach/CoachSettingsForm'

export const metadata = { title: 'Ajustes del Coach · GSA' }

export default async function CoachAjustesPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const setting = await prisma.coachSetting.findUnique({ where: { id: 'singleton' } })

    return (
        <div>
            <h1 className="text-[22px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                Ajustes del Coach IA
            </h1>
            <CoachAdminTabs />
            <CoachSettingsForm initial={setting?.extra_instructions ?? ''} />
        </div>
    )
}
