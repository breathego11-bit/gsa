import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const [totalStudents, activeCourses, totalLessons, totalEnrollments] = await prisma.$transaction([
            prisma.user.count({ where: { role: 'STUDENT' } }),
            prisma.course.count({ where: { published: true } }),
            prisma.lesson.count(),
            prisma.enrollment.count(),
        ])

        return NextResponse.json({ totalStudents, activeCourses, totalLessons, totalEnrollments })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
