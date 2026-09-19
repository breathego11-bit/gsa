import { sendEmail } from '@/lib/email'
import { paymentLabel } from '@/lib/payment-rules'
import { PaymentRequestEmail, type PaymentRequestVariant } from '@/emails/PaymentRequestEmail'

const SUBJECTS: Record<PaymentRequestVariant, string> = {
    request: 'Tienes un pago pendiente · Growth Sales Academy',
    overdue: 'Tu cuota ha vencido · Growth Sales Academy',
    paused: 'Tu acceso a los cursos está pausado · Growth Sales Academy',
}

/** Manda un correo de cobro de `payment` con enlace a /payment de GSA. */
export async function sendPaymentEmail(opts: {
    variant: PaymentRequestVariant
    user: { name: string; email: string }
    payment: {
        amount: number
        currency: string
        payment_type: string
        installment_number: number | null
        due_date: Date | null
    }
    pauseDate?: Date | null
}) {
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo_dark.png`
    const { payment } = opts
    return sendEmail({
        to: opts.user.email,
        subject: SUBJECTS[opts.variant],
        react: PaymentRequestEmail({
            variant: opts.variant,
            firstName: opts.user.name,
            concept: paymentLabel(payment),
            amountEur: (payment.amount / 100).toLocaleString('es-ES', {
                style: 'currency',
                currency: payment.currency.toUpperCase(),
            }),
            dueDate: payment.due_date,
            pauseDate: opts.pauseDate ?? null,
            paymentUrl: `${appUrl}/payment`,
            logoUrl,
        }),
    })
}
