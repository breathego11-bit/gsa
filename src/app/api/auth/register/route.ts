import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { name, last_name, username, email, phone, password } = await req.json();

        if (!name || !last_name || !username || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        await prisma.user.create({
            data: { name, last_name, username, email, phone, password: hashedPassword, role: 'STUDENT' }
        });

        return NextResponse.json({ message: "Account created" }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/auth/register] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
