import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    typescript: true,
})

// Platform pricing (cents)
export const PRICING = {
    ONE_TIME: {
        amount: 188800, // 1,888.00 EUR
        label: 'Pago Completo',
    },
    INSTALLMENT: {
        amount: 74067, // 740.67 EUR/month x 3
        months: 3,
        label: 'Plan de Pagos (3 cuotas)',
    },
    currency: 'eur',
} as const
