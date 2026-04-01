import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const courses = await prisma.course.findMany({
            where: { published: true },
            include: {
                _count: {
                    select: { modules: true, enrollments: true },
                },
            },
            orderBy: { created_at: 'desc' },
        })
        return NextResponse.json(courses)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const body = await req.json()
        const { title, description, thumbnail, hero_image, price, instructor_id } = body

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
        }

        const course = await prisma.course.create({
            data: {
                title,
                description,
                thumbnail: thumbnail || null,
                hero_image: hero_image || null,
                price: price ? Number(price) : null,
                instructor_id: instructor_id || null,
                published: false,
            },
        })
        return NextResponse.json(course, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
