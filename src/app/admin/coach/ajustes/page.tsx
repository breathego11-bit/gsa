import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CoachAdminTabs } from '@/components/coach/CoachAdminTabs'
import { CoachSettingsForm } from '@/components/coach/CoachSettingsForm'
import { getCoachPromptBreakdown, COACH_MODEL } from '@/lib/coach/prompt'
import { loadCoachConfig, FACTORY_METHODOLOGY } from '@/lib/coach/methodology-source'

export const metadata = { title: 'Ajustes del Coach · GSA' }

export default async function CoachAjustesPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const { methodology, extraInstructions, edited } = await loadCoachConfig()
    const extra = extraInstructions ?? ''

    // El desglose se calcula en el servidor midiendo el prompt REAL (ver
    // getCoachPromptBreakdown), así la pantalla nunca se desincroniza de lo que se envía.
    const breakdown = getCoachPromptBreakdown(methodology, extra)

    return (
        <div>
            <h1 className="text-[22px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                Ajustes del Coach IA
            </h1>
            <CoachAdminTabs />
            <CoachSettingsForm
                initial={extra}
                breakdown={breakdown}
                methodology={methodology}
                methodologyEdited={edited}
                factoryChars={FACTORY_METHODOLOGY.length}
                model={COACH_MODEL}
            />
        </div>
    )
}
