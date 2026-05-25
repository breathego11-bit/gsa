import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { StudentDetailClient, type TimelineEventDTO } from './StudentDetailClient'
import type { CourseEnrollmentProgress } from '@/types'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') redirect('/auth')

    const { id } = await params

    const [student, enrollments, progressRecords, payments, salesCount, recentSales] = await Promise.all([
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
                updated_at: true,
                payment_status: true,
                blocked: true,
                closer_enabled: true,
            },
        }),
        prisma.enrollment.findMany({
            where: { user_id: id },
            include: {
                course: {
                    include: {
                        instructors: {
                            orderBy: { order: 'asc' },
                            include: { user: { select: { name: true, last_name: true } } },
                        },
                        modules: {
                            include: {
                                lessons: {
                                    select: { id: true, is_final_exam: true, title: true },
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
            select: {
                lesson_id: true,
                completed: true,
                completed_at: true,
                score: true,
                passed: true,
                lesson: { select: { title: true } },
            },
            orderBy: { completed_at: 'desc' },
        }),
        prisma.payment.findMany({
            where: { user_id: id },
            select: {
                id: true,
                payment_type: true,
                amount: true,
                currency: true,
                status: true,
                installment_number: true,
                installment_plan_id: true,
                due_date: true,
                created_at: true,
            },
            orderBy: [{ installment_plan_id: 'asc' }, { installment_number: 'asc' }],
        }),
        prisma.sale.count({ where: { closer_id: id } }),
        prisma.sale.findMany({
            where: { closer_id: id },
            select: { id: true, total_amount: true, created_at: true, customer_first_name: true, customer_last_name: true },
            orderBy: { created_at: 'desc' },
            take: 5,
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

        const courseInstructors = enrollment.course.instructors
        let instructorName: string | null = null
        if (courseInstructors.length === 1) {
            instructorName = `${courseInstructors[0].user.name} ${courseInstructors[0].user.last_name}`
        } else if (courseInstructors.length === 2) {
            instructorName = `${courseInstructors[0].user.name} ${courseInstructors[0].user.last_name} · ${courseInstructors[1].user.name} ${courseInstructors[1].user.last_name}`
        } else if (courseInstructors.length > 2) {
            instructorName = `${courseInstructors[0].user.name} ${courseInstructors[0].user.last_name} · +${courseInstructors.length - 1} más`
        }

        return {
            enrollmentId: enrollment.id,
            courseId: enrollment.course.id,
            courseTitle: enrollment.course.title,
            instructorName,
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

    // Aggregated stats for the new UI
    const totalLessonsAll = courses.reduce((s, c) => s + c.totalLessons, 0)
    const completedLessonsAll = courses.reduce((s, c) => s + c.completedLessons, 0)
    const progressGlobal = totalLessonsAll > 0 ? completedLessonsAll / totalLessonsAll : 0

    const lastCompleted = progressRecords.find((p) => p.completed && p.completed_at)
    const lastConnectionAt = lastCompleted?.completed_at?.toISOString() ?? null

    const programName = enrollments[0]?.course.title ?? null
    const startedAt = (enrollments[enrollments.length - 1]?.created_at ?? student.created_at).toISOString()

    // Build timeline events (top 5 most recent across all sources)
    type RawEvent = TimelineEventDTO & { sortDate: number }
    const events: RawEvent[] = []

    for (const e of enrollments) {
        const date = e.approved_at ?? e.created_at
        events.push({
            type: 'enrollment',
            tone: 'indigo',
            label: `Inscrito en "${e.course.title}"`,
            date: date.toISOString(),
            sortDate: date.getTime(),
        })
    }
    for (const p of progressRecords) {
        if (p.completed && p.completed_at) {
            const lessonTitle = p.lesson?.title ?? 'una lección'
            events.push({
                type: 'lesson',
                tone: 'cyan',
                label: `Completó "${lessonTitle}"`,
                date: p.completed_at.toISOString(),
                sortDate: p.completed_at.getTime(),
            })
        }
    }
    for (const p of payments) {
        if (p.status === 'completed') {
            const amountStr = (p.amount / 100).toLocaleString('es-ES', { style: 'currency', currency: p.currency.toUpperCase() })
            events.push({
                type: 'payment',
                tone: 'green',
                label: `Pago recibido · ${amountStr}`,
                date: p.created_at.toISOString(),
                sortDate: p.created_at.getTime(),
            })
        }
    }
    if (student.closer_enabled) {
        for (const s of recentSales) {
            const customer = `${s.customer_first_name} ${s.customer_last_name}`.trim()
            const amountStr = `€${(s.total_amount / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
            events.push({
                type: 'sale',
                tone: 'cyan',
                label: `Registró venta · ${amountStr} (${customer})`,
                date: s.created_at.toISOString(),
                sortDate: s.created_at.getTime(),
            })
        }
    }

    const timeline: TimelineEventDTO[] = events
        .sort((a, b) => b.sortDate - a.sortDate)
        .slice(0, 5)
        .map(({ sortDate: _sortDate, ...rest }) => rest)

    const paymentData = payments.map((p) => ({
        id: p.id,
        payment_type: p.payment_type,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        installment_number: p.installment_number,
        installment_plan_id: p.installment_plan_id,
        due_date: p.due_date?.toISOString() ?? null,
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
                blocked: student.blocked,
                closer_enabled: student.closer_enabled,
            }}
            stats={{
                programName,
                startedAt,
                progressGlobal,
                completedLessons: completedLessonsAll,
                totalLessons: totalLessonsAll,
                salesCount,
                lastConnectionAt,
            }}
            timeline={timeline}
            courses={courses}
            payments={paymentData}
        />
    )
}
