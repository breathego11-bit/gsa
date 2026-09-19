import { getPricing } from '@/lib/stripe'
import { InvitationsClient } from './InvitationsClient'

export const dynamic = 'force-dynamic'

export default async function AdminInvitationsPage() {
    // Precios por defecto del formulario: pago único = precio del curso; en cuotas, lo que cuesta
    // el curso pagando a plazos (con el recargo configurado, si lo hay).
    const pricing = await getPricing()
    const inInstallments = pricing.installmentCount > 1
    const installmentPlanTotal = inInstallments
        ? Math.round(pricing.totalPrice * (1 + (pricing.interestRate || 0) / 100))
        : pricing.totalPrice

    return (
        <InvitationsClient
            coursePrice={pricing.totalPrice}
            installmentPlanTotal={installmentPlanTotal}
            followingInstallments={inInstallments ? pricing.installmentCount - 1 : 2}
        />
    )
}
