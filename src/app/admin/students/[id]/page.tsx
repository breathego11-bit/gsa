import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { StudentDetailClient } from './StudentDetailClient'
import type { CourseEnrollmentProgress } from '@/types'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/login')

    const { id } = await params

    const [student, enrollments, progressRecords, payments] = await Promise.all([
        prisma.user.findUnique({
            where: { id, role: 'STUDENT' },
            select: {
                id: true,
                name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                profile_image: true,
                created_at: true,
                payment_status: true,
            },
        }),
        prisma.enrollment.findMany({
            where: { user_id: id },
            include: {
                course: {
                    include: {
                        instructor: { select: { name: true, last_name: true } },
                        modules: {
                            include: {
                                lessons: {
                                    select: { id: true, is_final_exam: true },
                                    orderBy: { order: 'asc' },
                                },
                            },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        }),
        prisma.lessonProgress.findMany({
            where: { user_id: id },
            select: { lesson_id: true, completed: true, score: true, passed: true },
        }),
        prisma.payment.findMany({
            where: { user_id: id },
            select: {
                id: true,
                payment_type: true,
                amount_total: true,
                currency: true,
                status: true,
                installments_paid: true,
                installments_total: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' },
        }),
    ])

    if (!student) notFound()

    const progressMap = new Map(progressRecords.map((p) => [p.lesson_id, p]))

    const courses: CourseEnrollmentProgress[] = enrollments.map((enrollment) => {
        const allLessons = enrollment.course.modules.flatMap((m) => m.lessons)
        const totalLessons = allLessons.length
        const completedLessons = allLessons.filter((l) => progressMap.get(l.id)?.completed).length
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        const finalExamLesson = allLessons.find((l) => l.is_final_exam)
        const finalExamProgress = finalExamLesson ? progressMap.get(finalExamLesson.id) : null

        const instructor = enrollment.course.instructor

        return {
            enrollmentId: enrollment.id,
            courseId: enrollment.course.id,
            courseTitle: enrollment.course.title,
            instructorName: instructor ? `${instructor.name} ${instructor.last_name}` : null,
            enrolledAt: enrollment.created_at.toISOString(),
            totalLessons,
            completedLessons,
            progressPercent,
            approved: enrollment.approved,
            approvedAt: enrollment.approved_at?.toISOString() ?? null,
            hasFinalExam: !!finalExamLesson,
            finalExamPassed: finalExamProgress?.passed ?? null,
            finalExamScore: finalExamProgress?.score ?? null,
        }
    })

    const paymentData = payments.map((p) => ({
        id: p.id,
        payment_type: p.payment_type,
        amount_total: p.amount_total,
        currency: p.currency,
        status: p.status,
        installments_paid: p.installments_paid,
        installments_total: p.installments_total,
        created_at: p.created_at.toISOString(),
    }))

    return (
        <StudentDetailClient
            student={{
                id: student.id,
                name: student.name,
                last_name: student.last_name,
                username: student.username,
                email: student.email,
                phone: student.phone,
                profile_image: student.profile_image,
                created_at: student.created_at.toISOString(),
                payment_status: student.payment_status,
            }}
            courses={courses}
            payments={paymentData}
        />
    )
}
