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

/**
 * Devuelve el Stripe Customer del usuario, creándolo si hace falta.
 *
 * Comprueba que el id guardado siga existiendo en la cuenta de Stripe ACTIVA. Los ids de cliente
 * pertenecen a una cuenta concreta: al cambiar de cuenta —o al pasar de test a live— los que
 * tenemos guardados dejan de existir, Stripe rechaza el checkout con `resource_missing` y se queda
 * sin poder pagar justo quien ya lo había intentado alguna vez. Con esta comprobación el cambio de
 * cuenta se arregla solo, sin tocar la base de datos.
 *
 * Solo se recrea ante `resource_missing`: un fallo de red o una clave mal puesta se propaga, para
 * no ir dejando clientes duplicados en Stripe cada vez que la API falle.
 */
export async function ensureStripeCustomer(user: {
    id: string
    email: string | null
    name: string | null
    stripe_customer_id: string | null
}): Promise<string> {
    const stripe = getStripe()

    if (user.stripe_customer_id) {
        try {
            const existing = await stripe.customers.retrieve(user.stripe_customer_id)
            if (!('deleted' in existing) || !existing.deleted) return user.stripe_customer_id
        } catch (err) {
            if ((err as { code?: string }).code !== 'resource_missing') throw err
        }
        console.warn(
            `[stripe] el cliente ${user.stripe_customer_id} no existe en la cuenta actual; se crea uno nuevo para el usuario ${user.id}`,
        )
    }

    const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { user_id: user.id },
    })
    await prisma.user.update({ where: { id: user.id }, data: { stripe_customer_id: customer.id } })
    return customer.id
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
