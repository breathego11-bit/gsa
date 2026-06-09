import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getBunnyThumbnailUrl } from '@/lib/bunny'
import { hasUniversalCourseAccess } from '@/lib/access'
import { CourseDetailClient } from './CourseDetailClient'

export const dynamic = 'force-dynamic'

export default async function DashboardCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    const { id } = await params

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            instructors: {
                orderBy: { order: 'asc' },
                include: {
                    user: { select: { id: true, name: true, last_name: true, profile_image: true, bio: true, title: true } },
                },
            },
            modules: {
                orderBy: { order: 'asc' },
                include: {
                    lessons: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true, title: true, order: true, duration: true, type: true,
                            thumbnail: true, bunny_video_id: true, resources: true,
                        },
                    },
                },
            },
            _count: { select: { enrollments: true } },
        },
    })

    if (!course) notFound()

    // Check course access (admins + CRM_AND_COURSES closers bypass enrollment)
    if (session.user.role !== 'ADMIN') {
        const me = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, closer_enabled: true, closer_type: true, payment_status: true },
        })
        if (!me) redirect('/auth')

        if (!hasUniversalCourseAccess(me)) {
            const enrollment = await prisma.enrollment.findUnique({
                where: { user_id_course_id: { user_id: session.user.id, course_id: id } },
            })
            if (!enrollment) redirect(`/course/${id}`)
        }
    }

    // Get progress for this user across all lessons in this course
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const progressRecords = await prisma.lessonProgress.findMany({
        where: { user_id: session.user.id, lesson_id: { in: allLessons.map((l) => l.id) } },
        select: { lesson_id: true, completed: true },
    })
    const completedSet = new Set(progressRecords.filter((p) => p.completed).map((p) => p.lesson_id))

    const completedCount = completedSet.size
    const totalLessonsCount = allLessons.length
    const percent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0

    // Total duration computed from lesson durations
    const totalDurationMin = allLessons.reduce((sum, l) => sum + (l.duration || 0), 0)

    // Find current (first incomplete, walking the curriculum in order)
    let currentLessonId: string | null = null
    let currentLessonModuleTitle: string | null = null
    let currentLessonNumberInModule = 0
    let currentLessonTitle: string | null = null
    let currentLessonDuration: number | null = null
    let currentLessonType: string | null = null

    for (const m of course.modules) {
        for (let i = 0; i < m.lessons.length; i++) {
            const l = m.lessons[i]
            if (!completedSet.has(l.id)) {
                currentLessonId = l.id
                currentLessonModuleTitle = m.title
                currentLessonNumberInModule = i + 1
                currentLessonTitle = l.title
                currentLessonDuration = l.duration
                currentLessonType = l.type
                break
            }
        }
        if (currentLessonId) break
    }

    // Cohort: last 6 enrolled users (besides self) with avatars
    const cohort = await prisma.enrollment.findMany({
        where: { course_id: id, user_id: { not: session.user.id } },
        orderBy: { created_at: 'desc' },
        take: 6,
        select: {
            user: { select: { id: true, name: true, last_name: true, profile_image: true } },
        },
    })

    // Instructor stats — courses they teach + total distinct students across those courses
    const instructorStats = new Map<string, { courses: number; students: number }>()
    await Promise.all(
        course.instructors.map(async ({ user }) => {
            const instructedCourses = await prisma.courseInstructor.findMany({
                where: { user_id: user.id },
                select: { course_id: true },
            })
            const courseIds = instructedCourses.map((c) => c.course_id)
            let studentsCount = 0
            if (courseIds.length > 0) {
                const distinctStudents = await prisma.enrollment.findMany({
                    where: { course_id: { in: courseIds } },
                    distinct: ['user_id'],
                    select: { user_id: true },
                })
                studentsCount = distinctStudents.length
            }
            instructorStats.set(user.id, { courses: courseIds.length, students: studentsCount })
        }),
    )

    // Aggregate resources from all lessons (deduplicate by id)
    type Resource = { id: string; name: string; url: string; type: string; lessonTitle: string }
    const resources: Resource[] = []
    const seenResourceIds = new Set<string>()
    for (const m of course.modules) {
        for (const l of m.lessons) {
            if (!Array.isArray(l.resources)) continue
            for (const r of l.resources as Array<{ id?: string; name?: string; url?: string; type?: string }>) {
                if (!r || typeof r.url !== 'string' || typeof r.name !== 'string') continue
                const key = r.id || `${l.id}:${r.url}`
                if (seenResourceIds.has(key)) continue
                seenResourceIds.add(key)
                resources.push({
                    id: key,
                    name: r.name,
                    url: r.url,
                    type: r.type === 'link' ? 'link' : 'file',
                    lessonTitle: l.title,
                })
            }
        }
    }

    // Map modules with per-module progress
    const modulesView = course.modules.map((m) => {
        const moduleLessons = m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order,
            duration: l.duration,
            type: l.type as string,
            thumbnail: l.thumbnail || (l.bunny_video_id ? getBunnyThumbnailUrl(l.bunny_video_id) : null),
            completed: completedSet.has(l.id),
            current: l.id === currentLessonId,
        }))
        const moduleCompletedCount = moduleLessons.filter((l) => l.completed).length
        const moduleDurationMin = moduleLessons.reduce((s, l) => s + (l.duration || 0), 0)
        const moduleProgress = moduleLessons.length > 0
            ? Math.round((moduleCompletedCount / moduleLessons.length) * 100)
            : 0
        return {
            id: m.id,
            title: m.title,
            order: m.order,
            locked: m.locked,
            lessons: moduleLessons,
            completedCount: moduleCompletedCount,
            progress: moduleProgress,
            durationMin: moduleDurationMin,
        }
    })

    const requirementsList: string[] = Array.isArray(course.requirements)
        ? (course.requirements as unknown as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        : []
    const includedItemsList: string[] = Array.isArray(course.included_items)
        ? (course.included_items as unknown as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        : []

    return (
        <CourseDetailClient
            course={{
                id: course.id,
                title: course.title,
                description: course.description,
                tagline: course.tagline,
                hero_image: course.hero_image,
                tier: course.tier,
                level: course.level,
                language: course.language,
                certificate: course.certificate,
                rating: course.rating,
                includedItems: includedItemsList,
                requirements: requirementsList,
            }}
            stats={{
                totalModules: course.modules.length,
                totalLessons: totalLessonsCount,
                totalDurationMin,
                completedCount,
                percent,
                enrollmentsCount: course._count.enrollments,
            }}
            currentLesson={
                currentLessonId
                    ? {
                          id: currentLessonId,
                          moduleTitle: currentLessonModuleTitle!,
                          numberInModule: currentLessonNumberInModule,
                          title: currentLessonTitle!,
                          duration: currentLessonDuration,
                          type: currentLessonType!,
                      }
                    : null
            }
            instructors={course.instructors.map(({ user }) => ({
                id: user.id,
                name: user.name,
                lastName: user.last_name,
                title: user.title,
                bio: user.bio,
                profileImage: user.profile_image,
                coursesCount: instructorStats.get(user.id)?.courses ?? 0,
                studentsCount: instructorStats.get(user.id)?.students ?? 0,
            }))}
            cohort={cohort.map(({ user }) => ({
                id: user.id,
                name: user.name,
                lastName: user.last_name,
                profileImage: user.profile_image,
            }))}
            modules={modulesView}
            resources={resources}
        />
    )
}
