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
        pendingInstallments?: { amount: number; dueDate: string }[]
        closerType?: CloserType | null
        isFree?: boolean
        inviteeEmail?: string
        inviteeName?: string
    }

    const closerType: CloserType | null =
        body.closerType && VALID_CLOSER_TYPES.includes(body.closerType) ? body.closerType : null
    const isFree = body.isFree === true
    const inviteeEmail = body.inviteeEmail?.trim().toLowerCase() || null
    const inviteeName = body.inviteeName?.trim() || null

    // Paid validation only applies when the invite is not free.
    if (!isFree) {
        if (!body.paymentType || !body.amountPaid || body.amountPaid <= 0) {
            return NextResponse.json({ error: 'Datos de pago inválidos' }, { status: 400 })
        }
    }

    // Basic email format validation if provided
    if (inviteeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const paymentType = body.paymentType ?? 'one_time'
    const amountPaid = isFree ? 0 : (body.amountPaid ?? 0)

    const installmentsData =
        !isFree && paymentType === 'installment' && body.pendingInstallments?.length
            ? body.pendingInstallments.map((inst, i) => ({
                  number: i + 2, // starts at 2 (cuota 1 is the amount already paid)
                  amount: inst.amount,
                  dueDate: inst.dueDate,
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
