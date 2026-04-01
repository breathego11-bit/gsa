import { prisma } from '@/lib/prisma'

export async function checkCourseApproval(userId: string, courseId: string) {
    const allLessons = await prisma.lesson.findMany({
        where: { module: { course_id: courseId } },
        select: { id: true, type: true, is_final_exam: true },
    })

    if (allLessons.length === 0) return

    const progress = await prisma.lessonProgress.findMany({
        where: { user_id: userId, lesson_id: { in: allLessons.map((l) => l.id) } },
    })

    const allCompleted = allLessons.every((lesson) =>
        progress.some((p) => p.lesson_id === lesson.id && p.completed),
    )

    const finalExam = allLessons.find((l) => l.is_final_exam)
    const finalExamPassed = finalExam
        ? progress.some((p) => p.lesson_id === finalExam.id && p.completed && p.passed)
        : true

    if (allCompleted && finalExamPassed) {
        await prisma.enrollment.update({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
            data: { approved: true, approved_at: new Date() },
        })
    }
}
