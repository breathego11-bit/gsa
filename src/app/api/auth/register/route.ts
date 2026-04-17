import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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

        const user = await prisma.user.create({
            data: {
                name,
                last_name,
                username,
                email,
                phone,
                password: hashedPassword,
                role: 'STUDENT',
                payment_status: invitation ? 'active' : 'none',
            }
        });

        // If invitation, create payment records and mark as used
        if (invitation) {
            const planId = crypto.randomUUID();

            // Create completed payment for amount already paid
            await prisma.payment.create({
                data: {
                    user_id: user.id,
                    payment_type: invitation.payment_type,
                    amount: invitation.amount_paid,
                    currency: 'eur',
                    status: 'completed',
                    installment_number: invitation.payment_type === 'installment' ? 1 : null,
                    installment_plan_id: invitation.payment_type === 'installment' ? planId : null,
                },
            });

            // Create pending installments if any
            const pendingInstallments = invitation.installments as { number: number; amount: number; dueDate: string }[] | null;
            if (pendingInstallments?.length) {
                for (const inst of pendingInstallments) {
                    await prisma.payment.create({
                        data: {
                            user_id: user.id,
                            payment_type: 'installment',
                            amount: inst.amount,
                            currency: 'eur',
                            status: 'pending',
                            installment_number: inst.number,
                            installment_plan_id: planId,
                            due_date: new Date(inst.dueDate),
                        },
                    });
                }
            }

            // Mark invitation as used
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: { used: true, used_by: user.id, used_at: new Date() },
            });
        }

        return NextResponse.json({ message: "Account created" }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/auth/register] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
