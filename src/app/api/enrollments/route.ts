import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActivePayment } from '@/lib/access'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { course_id } = await req.json()
        if (!course_id) return NextResponse.json({ error: 'course_id is required' }, { status: 400 })

        // CRM-only closers never get course access. Hard-block at the API even
        // though middleware already filters their UI routes — defense in depth.
        if (session.user.closer_type === 'CRM_ONLY') {
            return NextResponse.json(
                { error: 'Tu rol (Closer · CRM only) no incluye acceso a los cursos. Habla con un admin para ampliar tu acceso.' },
                { status: 403 },
            )
        }

        // Check payment status (admins bypass)
        if (session.user.role !== 'ADMIN') {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { payment_status: true, blocked: true },
            })
            if (!user || user.blocked || !hasActivePayment(user)) {
                return NextResponse.json({ error: 'Payment required' }, { status: 402 })
            }
        }

        const enrollment = await prisma.enrollment.create({
            data: { user_id: session.user.id, course_id },
        })
        return NextResponse.json(enrollment, { status: 201 })
    } catch (e: unknown) {
        // Unique constraint violation — already enrolled
        if (e instanceof Error && e.message.includes('Unique constraint')) {
            return NextResponse.json({ error: 'Already enrolled' }, { status: 409 })
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
