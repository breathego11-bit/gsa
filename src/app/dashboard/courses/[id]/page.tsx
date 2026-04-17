import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { CourseModuleAccordion } from '@/components/courses/CourseModuleAccordion'

export default async function DashboardCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const { id } = await params

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            instructor: { select: { id: true, name: true, last_name: true, profile_image: true, bio: true, title: true } },
            modules: {
                orderBy: { order: 'asc' },
                include: {
                    lessons: {
                        orderBy: { order: 'asc' },
                        select: { id: true, title: true, order: true, duration: true, type: true },
                    },
                },
            },
        },
    })

    if (!course) notFound()

    // Check enrollment
    if (session.user.role !== 'ADMIN') {
        const enrollment = await prisma.enrollment.findUnique({
            where: { user_id_course_id: { user_id: session.user.id, course_id: id } },
        })
        if (!enrollment) redirect(`/course/${id}`)
    }

    // Get progress
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const progressRecords = await prisma.lessonProgress.findMany({
        where: { user_id: session.user.id, lesson_id: { in: allLessons.map((l) => l.id) } },
        select: { lesson_id: true, completed: true },
    })
    const progressMap = new Map(progressRecords.map((p) => [p.lesson_id, p.completed]))

    const completedCount = progressRecords.filter((p) => p.completed).length
    const percent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

    // Duration
    const totalDurationMin = allLessons.reduce((sum, l) => sum + (l.duration || 0), 0)
    const hours = Math.floor(totalDurationMin / 60)
    const minutes = totalDurationMin % 60
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`

    // First incomplete lesson
    const firstIncomplete = allLessons.find((l) => !progressMap.get(l.id))

    return (
        <div className="space-y-8">
            {/* Back */}
            <Link
                href="/dashboard/courses"
                className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors text-sm"
            >
                <MaterialIcon name="arrow_back" size="text-lg" />
                Volver a mis cursos
            </Link>

            {/* Hero */}
            <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0">
                    {course.hero_image ? (
                        <img src={course.hero_image} alt="" className="w-full h-full object-cover opacity-30 grayscale" />
                    ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0c1a3e 0%, #080d18 100%)' }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/80 to-transparent" />
                </div>
                <div className="relative z-10 p-6 sm:p-10 space-y-4">
                    <div className="inline-flex items-center px-3 py-1 bg-primary-container/20 text-primary rounded-full text-xs font-bold tracking-[0.1em] uppercase">
                        {course.modules.length} Módulos • {allLessons.length} Lecciones
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tighter text-on-surface max-w-3xl">
                        {course.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 text-on-surface-variant text-sm">
                        {course.instructor && (
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="person" size="text-lg" className="text-blue-400" />
                                <span className="font-medium">{course.instructor.name} {course.instructor.last_name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <MaterialIcon name="schedule" size="text-lg" className="text-blue-400" />
                            <span className="font-medium">{durationStr}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress + Continue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Progreso</p>
                    <p className="text-3xl font-black text-on-surface">{percent}%</p>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <p className="text-xs text-on-surface-variant">{completedCount} de {allLessons.length} lecciones</p>
                </div>
                <div className="sm:col-span-2 bg-surface-container-low rounded-xl p-6 border border-outline-variant/15 flex items-center justify-between gap-4">
                    {firstIncomplete ? (
                        <>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Siguiente lección</p>
                                <p className="text-sm font-bold text-on-surface">{firstIncomplete.title}</p>
                            </div>
                            <Link
                                href={`/lesson/${firstIncomplete.id}`}
                                className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-container to-secondary-container text-white rounded-xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
                            >
                                <MaterialIcon name="play_arrow" size="text-lg" />
                                Continuar
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-emerald-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <div>
                                <p className="text-sm font-bold text-on-surface">Curso completado</p>
                                <p className="text-xs text-on-surface-variant">Has completado todas las lecciones</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            {course.description && (
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-3">Descripción</h2>
                    <p className="text-on-surface-variant leading-relaxed text-justify">{course.description}</p>
                </div>
            )}

            {/* Curriculum */}
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-6 text-on-surface">Contenido del curso</h2>
                {course.modules.length === 0 ? (
                    <div className="bg-surface-container-low rounded-xl p-12 text-center">
                        <MaterialIcon name="school" size="text-4xl" className="text-on-surface-variant mb-4" />
                        <p className="text-on-surface-variant">El contenido está siendo preparado.</p>
                    </div>
                ) : (
                    <CourseModuleAccordion
                        modules={course.modules.map((mod) => ({
                            id: mod.id,
                            title: mod.title,
                            order: mod.order,
                            lessons: mod.lessons.map((l) => ({
                                id: l.id,
                                title: l.title,
                                order: l.order,
                                duration: l.duration,
                                type: l.type,
                                progress: progressMap.has(l.id) ? [{ completed: progressMap.get(l.id)! }] : undefined,
                            })),
                        }))}
                        isEnrolled={true}
                    />
                )}
            </div>

            {/* Instructor */}
            {course.instructor && (
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/15">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Tu Instructor</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center shrink-0">
                            {course.instructor.profile_image ? (
                                <img src={course.instructor.profile_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <MaterialIcon name="person" size="text-2xl" className="text-on-surface-variant" />
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-on-surface">{course.instructor.name} {course.instructor.last_name}</p>
                            {course.instructor.title && <p className="text-xs text-on-surface-variant">{course.instructor.title}</p>}
                        </div>
                    </div>
                    {course.instructor.bio && (
                        <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">{course.instructor.bio}</p>
                    )}
                </div>
            )}
        </div>
    )
}
