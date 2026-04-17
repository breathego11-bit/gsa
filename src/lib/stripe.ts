import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

let _stripe: Stripe | null = null

export function getStripe() {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            typescript: true,
        })
    }
    return _stripe
}

export interface PricingConfig {
    totalPrice: number       // cents
    firstInstallment: number // cents
    installmentCount: number // 1 = no installments
    interestRate: number     // percentage (e.g. 10 = 10%)
}

const DEFAULT_PRICING: PricingConfig = {
    totalPrice: 188800,
    firstInstallment: 188800,
    installmentCount: 1,
    interestRate: 0,
}

export async function getPricing(): Promise<PricingConfig> {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    if (!settings) return DEFAULT_PRICING
    return settings.pricing as unknown as PricingConfig
}

export function computeInstallments(config: PricingConfig): { number: number; amount: number }[] {
    if (config.installmentCount <= 1) {
        return [{ number: 1, amount: config.totalPrice }]
    }
    const totalWithInterest = Math.round(config.totalPrice * (1 + (config.interestRate || 0) / 100))
    const remaining = totalWithInterest - config.firstInstallment
    const perRemainder = Math.ceil(remaining / (config.installmentCount - 1))
    const installments = [{ number: 1, amount: config.firstInstallment }]
    for (let i = 2; i <= config.installmentCount; i++) {
        installments.push({ number: i, amount: perRemainder })
    }
    return installments
}
