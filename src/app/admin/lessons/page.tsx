import { prisma } from '@/lib/prisma'
import { AdminLessonsClient } from './AdminLessonsClient'

interface Props {
    searchParams: Promise<{ courseId?: string; moduleId?: string }>
}

export default async function AdminLessonsPage({ searchParams }: Props) {
    const { courseId, moduleId } = await searchParams

    const courses = await prisma.course.findMany({
        select: { id: true, title: true },
        orderBy: { created_at: 'desc' },
    })

    const modules = courseId
        ? await prisma.module.findMany({
              where: { course_id: courseId },
              select: { id: true, title: true, order: true },
              orderBy: { order: 'asc' },
          })
        : []

    const lessons = moduleId
        ? await prisma.lesson.findMany({
              where: { module_id: moduleId },
              orderBy: { order: 'asc' },
          })
        : []

    return (
        <AdminLessonsClient
            courses={courses}
            modules={modules}
            lessons={lessons}
            selectedCourseId={courseId ?? null}
            selectedModuleId={moduleId ?? null}
        />
    )
}
