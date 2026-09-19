import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { InvitationEmail } from '@/emails/InvitationEmail'
import type { CloserType } from '@prisma/client'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const invitations = await prisma.invitation.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            redeemer: { select: { name: true, last_name: true, email: true } },
        },
    })

    return NextResponse.json(invitations)
}

const VALID_CLOSER_TYPES: CloserType[] = ['CRM_ONLY', 'CRM_AND_COURSES']

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as {
        paymentType?: 'one_time' | 'installment'
        amountPaid?: number // cents
        // "Ya pagó por fuera": fecha fija. "Pagará al registrarse": días después del primer pago.
        pendingInstallments?: { amount: number; dueDate?: string; offsetDays?: number }[]
        closerType?: CloserType | null
        isFree?: boolean
        payOnSignup?: boolean // true = aún no pagó nada; amountPaid es la cuota 1 a cobrar
        inviteeEmail?: string
        inviteeName?: string
    }

    const closerType: CloserType | null =
        body.closerType && VALID_CLOSER_TYPES.includes(body.closerType) ? body.closerType : null
    const isFree = body.isFree === true
    const payOnSignup = !isFree && body.payOnSignup === true
    const inviteeEmail = body.inviteeEmail?.trim().toLowerCase() || null
    const inviteeName = body.inviteeName?.trim() || null

    // Paid validation only applies when the invite is not free. En "pagará al registrarse"
    // amountPaid es lo que se le cobrará en la cuota 1; en "ya pagó por fuera", lo ya cobrado.
    if (!isFree) {
        if (
            (body.paymentType !== 'one_time' && body.paymentType !== 'installment') ||
            !Number.isInteger(body.amountPaid) || (body.amountPaid ?? 0) <= 0
        ) {
            return NextResponse.json({ error: 'Datos de pago inválidos' }, { status: 400 })
        }
        const badInstallment = (body.pendingInstallments ?? []).some(
            (inst) =>
                !Number.isInteger(inst.amount) || inst.amount <= 0 ||
                (payOnSignup
                    ? !Number.isInteger(inst.offsetDays) || inst.offsetDays! < 1 || inst.offsetDays! > 730
                    : typeof inst.dueDate !== 'string' || Number.isNaN(new Date(inst.dueDate).getTime())),
        )
        if (badInstallment) {
            return NextResponse.json(
                {
                    error: payOnSignup
                        ? 'Cada cuota siguiente necesita importe y los días tras el primer pago (1 a 730)'
                        : 'Cada cuota pendiente necesita importe y fecha',
                },
                { status: 400 },
            )
        }
    }

    // El correo del invitado es obligatorio: la invitación se envía por ahí.
    if (!inviteeEmail) {
        return NextResponse.json({ error: 'Falta el correo del invitado' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const paymentType = body.paymentType ?? 'one_time'
    const amountPaid = isFree ? 0 : (body.amountPaid ?? 0)

    const installmentsData =
        !isFree && paymentType === 'installment' && body.pendingInstallments?.length
            ? body.pendingInstallments.map((inst, i) => ({
                  number: i + 2, // la cuota 1 es amount_paid (cobrada o, con pay_on_signup, a cobrar)
                  amount: inst.amount,
                  // Con pay_on_signup las fechas se cuentan desde el primer pago (se fijan al cobrarlo).
                  ...(payOnSignup ? { offsetDays: inst.offsetDays } : { dueDate: inst.dueDate }),
              }))
            : null

    const invitation = await prisma.invitation.create({
        data: {
            created_by: session.user.id,
            payment_type: paymentType,
            amount_paid: amountPaid,
            installments: installmentsData as any,
            closer_type: closerType,
            is_free: isFree,
            pay_on_signup: payOnSignup,
        },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/register?invite=${invitation.id}`

    // Fire-and-forget email if invitee provided one.
    // Email failure does NOT block the response — admin still gets the link to share manually.
    let emailSent = false
    let emailError: string | null = null
    if (inviteeEmail) {
        const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo_dark.png`
        const result = await sendEmail({
            to: inviteeEmail,
            subject: closerType
                ? 'Te invitamos como Closer · Growth Sales Academy'
                : 'Te invitamos a Growth Sales Academy',
            react: InvitationEmail({
                inviteeName,
                inviteUrl,
                closerType,
                isFree,
                payOnSignup,
                logoUrl,
            }),
        })
        emailSent = result.ok
        emailError = result.ok ? null : (result.error ?? 'Error desconocido al enviar el correo')
    }

    return NextResponse.json({
        id: invitation.id,
        link: inviteUrl,
        emailRequested: !!inviteeEmail,
        emailSent,
        emailError,
    }, { status: 201 })
}
