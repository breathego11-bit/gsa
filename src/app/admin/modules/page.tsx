import { prisma } from '@/lib/prisma'
import { AdminModulesClient } from './AdminModulesClient'

interface Props {
    searchParams: Promise<{ courseId?: string }>
}

export default async function AdminModulesPage({ searchParams }: Props) {
    const { courseId } = await searchParams

    const courses = await prisma.course.findMany({
        select: { id: true, title: true },
        orderBy: { created_at: 'desc' },
    })

    const modules = courseId
        ? await prisma.module.findMany({
              where: { course_id: courseId },
              include: { _count: { select: { lessons: true } } },
              orderBy: { order: 'asc' },
          })
        : []

    return (
        <AdminModulesClient
            courses={courses}
            selectedCourseId={courseId ?? null}
            modules={modules}
        />
    )
}
