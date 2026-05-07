import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getServerSession(authOptions)

    try {
        const course = await prisma.course.findUnique({
            where: { id },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                type: true,
                                order: true,
                                duration: true,
                                thumbnail: true,
                                ...(session ? { progress: { where: { user_id: session.user.id } } } : {}),
                            },
                        },
                    },
                },
                instructors: {
                    orderBy: { order: 'asc' },
                    include: {
                        user: {
                            select: { id: true, name: true, last_name: true, profile_image: true, bio: true, title: true },
                        },
                    },
                },
                _count: { select: { enrollments: true } },
            },
        })

        if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (!course.published && (!session || session.user.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json(course)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    try {
        const body = await req.json()
        const { title, description, thumbnail, hero_image, price, published, instructor_ids, included_items } = body

        const data: Record<string, any> = {}
        if (title !== undefined) data.title = title
        if (description !== undefined) data.description = description
        if (thumbnail !== undefined) data.thumbnail = thumbnail || null
        if (hero_image !== undefined) data.hero_image = hero_image || null
        if (price !== undefined) data.price = price != null ? Number(price) : null
        if (published !== undefined) data.published = published
        if (included_items !== undefined) {
            if (Array.isArray(included_items)) {
                const items = included_items.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
                data.included_items = items.length > 0 ? items : null
            } else if (included_items === null) {
                data.included_items = null
            }
        }

        const updateInstructors = Array.isArray(instructor_ids)
        const ids: string[] = updateInstructors
            ? instructor_ids.filter((s: unknown) => typeof s === 'string')
            : []

        const course = await prisma.$transaction(async (tx) => {
            const updated = await tx.course.update({ where: { id }, data })
            if (updateInstructors) {
                await tx.courseInstructor.deleteMany({ where: { course_id: id } })
                if (ids.length) {
                    await tx.courseInstructor.createMany({
                        data: ids.map((user_id, idx) => ({ course_id: id, user_id, order: idx })),
                    })
                }
            }
            return updated
        })

        return NextResponse.json(course)
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    try {
        await prisma.course.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
