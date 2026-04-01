import { prisma } from '@/lib/prisma'
import { AdminCoursesClient } from './AdminCoursesClient'

export default async function AdminCoursesPage() {
    const courses = await prisma.course.findMany({
        include: {
            _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { created_at: 'desc' },
    })

    return <AdminCoursesClient courses={courses} />
}
