import { prisma } from '@/lib/prisma'
import { AdminCoursesClient } from './AdminCoursesClient'

export default async function AdminCoursesPage() {
    const courses = await prisma.course.findMany({
        include: {
            _count: { select: { modules: true, enrollments: true } },
            instructors: {
                orderBy: { order: 'asc' },
                select: { user_id: true },
            },
        },
        orderBy: { created_at: 'desc' },
    })

    const mapped = courses.map((c) => ({
        ...c,
        instructor_ids: c.instructors.map((i) => i.user_id),
        included_items: Array.isArray(c.included_items)
            ? (c.included_items as unknown as string[]).filter((s) => typeof s === 'string')
            : [],
        requirements: Array.isArray(c.requirements)
            ? (c.requirements as unknown as string[]).filter((s) => typeof s === 'string')
            : [],
    }))

    return <AdminCoursesClient courses={mapped} />
}
