import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { CourseBuilderClient } from './CourseBuilderClient'

export const dynamic = 'force-dynamic'

export default async function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/login')

    const { id } = await params

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            instructor: { select: { id: true, name: true, last_name: true, profile_image: true } },
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
                            video_url: true,
                            thumbnail: true,
                            content: true,
                            form_schema: true,
                            exam_schema: true,
                            passing_score: true,
                            max_attempts: true,
                            is_final_exam: true,
                            order: true,
                            duration: true,
                            bunny_video_id: true,
                            bunny_status: true,
                        },
                    },
                },
            },
        },
    })

    if (!course) notFound()

    const instructors = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, last_name: true },
        orderBy: { name: 'asc' },
    })

    // Compute stats
    const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0)
    const totalDuration = course.modules.reduce(
        (s, m) => s + m.lessons.reduce((ls, l) => ls + (l.duration || 0), 0),
        0,
    )
    const hasFinalExam = course.modules.some((m) => m.lessons.some((l) => l.is_final_exam))

    return (
        <CourseBuilderClient
            course={course}
            instructors={instructors}
            stats={{ totalModules: course.modules.length, totalLessons, totalDuration, hasFinalExam }}
        />
    )
}
