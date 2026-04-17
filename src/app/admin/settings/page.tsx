import { prisma } from '@/lib/prisma'
import type { PricingConfig } from '@/lib/stripe'
import { SettingsClient } from './SettingsClient'

export default async function AdminSettingsPage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    const pricing: PricingConfig = (settings?.pricing as unknown as PricingConfig) ?? {
        totalPrice: 188800,
        firstInstallment: 188800,
        installmentCount: 1,
    }

    return <SettingsClient initialPricing={pricing} />
}
