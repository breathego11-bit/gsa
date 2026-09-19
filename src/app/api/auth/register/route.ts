import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Invitation, Prisma } from "@prisma/client";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { WelcomeEmail } from "@/emails/WelcomeEmail";

class InvitationAlreadyUsedError extends Error {}

/**
 * Pagos que genera una invitación de pago al registrarse. La cuota 1 (o el pago único) es
 * `amount_paid`: cobrada por fuera, o con `pay_on_signup` pendiente y con vencimiento hoy.
 * Las demás cuotas vienen de `installments`, siempre pendientes: con fecha fija ("ya pagó por
 * fuera") o, con `pay_on_signup`, sin fecha y con `offsetDays` — la fecha se fija al cobrarse el
 * primer pago (`anchorPlanDueDates`).
 */
function invitationPayments(invitation: Invitation, userId: string): Prisma.PaymentCreateManyInput[] {
    const isInstallment = invitation.payment_type === 'installment';
    const planId = isInstallment ? crypto.randomUUID() : null;
    const first: Prisma.PaymentCreateManyInput = {
        user_id: userId,
        payment_type: invitation.payment_type,
        amount: invitation.amount_paid,
        currency: 'eur',
        status: invitation.pay_on_signup ? 'pending' : 'completed',
        installment_number: isInstallment ? 1 : null,
        installment_plan_id: planId,
        due_date: invitation.pay_on_signup ? new Date() : null,
    };
    if (!isInstallment) return [first];

    const rest = (invitation.installments as { number: number; amount: number; dueDate?: string; offsetDays?: number }[] | null) ?? [];
    return [
        first,
        ...rest.map((inst) => ({
            user_id: userId,
            payment_type: 'installment',
            amount: inst.amount,
            currency: 'eur',
            status: 'pending',
            installment_number: inst.number,
            installment_plan_id: planId,
            due_date: inst.offsetDays ? null : new Date(inst.dueDate!),
            due_offset_days: inst.offsetDays ?? null,
        })),
    ];
}

export async function POST(req: Request) {
    try {
        const { name, last_name, username, email, phone, password, invite } = await req.json();

        if (!name || !last_name || !username || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
        }

        // Validate invitation if provided
        let invitation = null;
        if (invite) {
            invitation = await prisma.invitation.findUnique({ where: { id: invite } });
            if (!invitation) {
                return NextResponse.json({ error: "Invitación inválida" }, { status: 400 });
            }
            if (invitation.used) {
                return NextResponse.json({ error: "Esta invitación ya fue utilizada" }, { status: 400 });
            }
            if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
                return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 });
            }
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        // Derive payment + closer fields from invitation (if any).
        // - is_free       → 'complimentary', sin registros de pago.
        // - pay_on_signup → 'none': todo el plan nace pendiente y la cuota 1 vence hoy; el acceso
        //                   llega al pagarla por Stripe (spec_invitation_payment.md §3).
        // - "ya pagó"     → 'active': cuota 1 (o pago único) completada + resto pendiente.
        // - closer_type from invitation flips closer_enabled = true automatically.
        const paymentStatus = !invitation
            ? 'none'
            : invitation.is_free
                ? 'complimentary'
                : invitation.pay_on_signup ? 'none' : 'active';
        const closerEnabled = invitation?.closer_type != null;
        const closerType = invitation?.closer_type ?? null;

        // Usuario, plan de pagos e invitación en una sola transacción: un fallo a mitad no deja
        // un usuario con medio plan creado ni una invitación consumida sin cuenta.
        const user = await prisma.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    name,
                    last_name,
                    username,
                    email,
                    phone,
                    password: hashedPassword,
                    role: 'STUDENT',
                    payment_status: paymentStatus,
                    closer_enabled: closerEnabled,
                    closer_type: closerType,
                }
            });

            if (invitation) {
                // Reclamo atómico: dos registros simultáneos con el mismo enlace no pueden usarlo ambos.
                const claimed = await tx.invitation.updateMany({
                    where: { id: invitation.id, used: false },
                    data: { used: true, used_by: created.id, used_at: new Date() },
                });
                if (claimed.count === 0) throw new InvitationAlreadyUsedError();
            }

            if (invitation && !invitation.is_free) {
                await tx.payment.createMany({ data: invitationPayments(invitation, created.id) });
            }

            return created;
        });

        // Fire-and-forget welcome email. Failure logs but doesn't block account creation.
        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo_dark.png`;
        await sendEmail({
            to: user.email,
            subject: 'Bienvenido a Growth Sales Academy',
            react: WelcomeEmail({
                firstName: user.name,
                dashboardUrl: `${appUrl}/dashboard`,
                logoUrl,
            }),
        });

        return NextResponse.json({ message: "Account created" }, { status: 201 });
    } catch (error) {
        if (error instanceof InvitationAlreadyUsedError) {
            return NextResponse.json({ error: "Esta invitación ya fue utilizada" }, { status: 400 });
        }
        console.error("[POST /api/auth/register] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
