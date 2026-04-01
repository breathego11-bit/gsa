import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { current_password, new_password, confirm_password } = await req.json()

        if (!current_password || !new_password || !confirm_password) {
            return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
        }

        if (new_password !== confirm_password) {
            return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
        }

        if (new_password.length < 8) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const isValid = await bcryptjs.compare(current_password, user.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
        }

        const hashed = await bcryptjs.hash(new_password, 10)
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashed },
        })

        return NextResponse.json({ message: 'Contraseña actualizada' })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
