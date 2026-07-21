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
        const { title, description, thumbnail, hero_image, price, instructor_ids, included_items } = body

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
        }

        const ids: string[] = Array.isArray(instructor_ids) ? instructor_ids.filter((s) => typeof s === 'string') : []
        const items: string[] | null = Array.isArray(included_items)
            ? included_items.filter((s) => typeof s === 'string' && s.trim().length > 0)
            : null

        // Nuevos cursos van al final del catálogo (order = max + 1) para la división por cuotas.
        const last = await prisma.course.findFirst({ orderBy: { order: 'desc' }, select: { order: true } })
        const nextOrder = (last?.order ?? -1) + 1

        const course = await prisma.course.create({
            data: {
                title,
                description,
                thumbnail: thumbnail || null,
                hero_image: hero_image || null,
                price: price ? Number(price) : null,
                published: false,
                order: nextOrder,
                included_items: items && items.length > 0 ? items : undefined,
                instructors: ids.length
                    ? { create: ids.map((user_id, idx) => ({ user_id, order: idx })) }
                    : undefined,
            },
        })
        return NextResponse.json(course, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
