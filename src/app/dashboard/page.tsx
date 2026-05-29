import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { InstallmentBanner } from '@/components/payment/InstallmentBanner'
import { WelcomeVideoBanner } from '@/components/dashboard/WelcomeVideoBanner'
import {
    CourseCardRedesigned,
    type CourseCardData,
} from '@/components/landing/CourseCardRedesigned'

export const dynamic = 'force-dynamic'

function timeAgo(date: Date | null): string {
    if (!date) return ''
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `hace ${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `hace ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return 'ayer'
    return `hace ${diffD} días`
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    const enrollments = await prisma.enrollment.findMany({
        where: { user_id: session!.user.id },
        include: {
            course: {
                include: {
                    modules: {
                        orderBy: { order: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { order: 'asc' },
                                include: {
                                    progress: {
                                        where: { user_id: session!.user.id },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { created_at: 'desc' },
    })

    const coursesWithProgress = enrollments.map((e) => {
        const allLessons = e.course.modules.flatMap((m) => m.lessons)
        const completed = allLessons.filter((l) => l.progress[0]?.completed).length
        const total = allLessons.length
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0
        return { course: e.course, percent, completed, total, allLessons }
    })

    // Global stats
    const totalLessons = coursesWithProgress.reduce((s, c) => s + c.total, 0)
    const totalCompleted = coursesWithProgress.reduce((s, c) => s + c.completed, 0)
    const overallPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0

    // Next lesson: first incomplete lesson from the most recent in-progress course
    let nextLesson: { lessonId: string; lessonTitle: string; moduleTitle: string; courseTitle: string; courseId: string; coursePercent: number } | null = null
    for (const cp of coursesWithProgress) {
        if (cp.percent >= 100 || cp.percent === 0) continue
        for (const mod of cp.course.modules) {
            for (const lesson of mod.lessons) {
                if (!lesson.progress[0]?.completed) {
                    nextLesson = {
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                        moduleTitle: mod.title,
                        courseTitle: cp.course.title,
                        courseId: cp.course.id,
                        coursePercent: cp.percent,
                    }
                    break
                }
            }
            if (nextLesson) break
        }
        if (nextLesson) break
    }

    // If no in-progress found, try first lesson of first 0% course
    if (!nextLesson) {
        for (const cp of coursesWithProgress) {
            if (cp.percent === 0 && cp.allLessons.length > 0) {
                const firstMod = cp.course.modules[0]
                const firstLesson = firstMod?.lessons[0]
                if (firstLesson) {
                    nextLesson = {
                        lessonId: firstLesson.id,
                        lessonTitle: firstLesson.title,
                        moduleTitle: firstMod.title,
                        courseTitle: cp.course.title,
                        courseId: cp.course.id,
                        coursePercent: 0,
                    }
                }
                break
            }
        }
    }

    // Recent activity: last 5 completed lessons
    const recentActivity = await prisma.lessonProgress.findMany({
        where: { user_id: session!.user.id, completed: true },
        orderBy: { completed_at: 'desc' },
        take: 5,
        include: {
            lesson: {
                include: {
                    module: {
                        include: { course: { select: { title: true } } },
                    },
                },
            },
        },
    })

    // Check for pending installments (all, not just overdue)
    const pendingInstallments = await prisma.payment.findMany({
        where: {
            user_id: session!.user.id,
            payment_type: 'installment',
            status: 'pending',
        },
        orderBy: { installment_number: 'asc' },
    })

    // Welcome video reminder: show if not uploaded and snooze (if any) has expired.
    const me = await prisma.user.findUnique({
        where: { id: session!.user.id },
        select: { welcome_video_bunny_id: true, welcome_video_snoozed_until: true, onboarded_at: true },
    })
    const showWelcomeVideoBanner =
        !!me?.onboarded_at &&
        !me?.welcome_video_bunny_id &&
        (!me?.welcome_video_snoozed_until || me.welcome_video_snoozed_until <= new Date())

    return (
        <div className="space-y-12">
            {/* ── Installment Due Banner ─────────────────── */}
            {pendingInstallments.length > 0 && (
                <InstallmentBanner
                    installments={pendingInstallments.map(p => ({
                        id: p.id,
                        amount: p.amount,
                        installmentNumber: p.installment_number!,
                        dueDate: p.due_date?.toISOString() ?? null,
                    }))}
                />
            )}

            {/* ── Welcome Video Reminder ─────────────────── */}
            {showWelcomeVideoBanner && <WelcomeVideoBanner />}

            {/* ── Hero Bento Grid ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Greeting Card */}
                <div className="lg:col-span-2 relative overflow-hidden rounded-xl bg-surface-container-low p-5 sm:p-8 flex flex-col justify-between min-h-[220px] sm:min-h-[280px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-on-surface mb-2">
                            Bienvenido, {session!.user.name}.
                        </h2>
                        <p className="text-on-surface-variant max-w-md">
                            {coursesWithProgress.length > 0
                                ? `Has completado el ${overallPercent}% de tus cursos. Tienes ${coursesWithProgress.length} ${coursesWithProgress.length === 1 ? 'curso activo' : 'cursos activos'}.`
                                : 'Empieza tu camino de aprendizaje inscribiéndote en un curso.'}
                        </p>
                    </div>
                    <div className="relative z-10 flex gap-6 sm:gap-12 mt-8">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-blue-500 mb-1">Inscripciones</p>
                            <p className="text-2xl sm:text-3xl font-black text-on-surface">{coursesWithProgress.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-blue-500 mb-1">Completación</p>
                            <p className="text-2xl sm:text-3xl font-black text-on-surface">{overallPercent}%</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-blue-500 mb-1">Lecciones</p>
                            <p className="text-2xl sm:text-3xl font-black text-on-surface">{totalCompleted}</p>
                        </div>
                    </div>
                </div>

                {/* Next Lesson Card */}
                <div className="rounded-xl bg-surface-container-high p-8 flex flex-col justify-between border border-white/5">
                    {nextLesson ? (
                        <>
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-bold tracking-wider uppercase mb-4">
                                    Siguiente Lección
                                </span>
                                <h3 className="text-xl font-bold leading-tight mb-2 text-on-surface">
                                    {nextLesson.courseTitle}
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    {nextLesson.moduleTitle}
                                </p>
                            </div>
                            <div className="mt-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold text-on-surface">Progreso</span>
                                    <span className="text-xs font-bold text-secondary">{nextLesson.coursePercent}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-container to-secondary-container transition-all"
                                        style={{ width: `${nextLesson.coursePercent}%` }}
                                    />
                                </div>
                                <Link
                                    href={`/lesson/${nextLesson.lessonId}`}
                                    className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-highest text-on-surface font-bold text-sm transition-all hover:bg-secondary-container hover:text-white"
                                >
                                    Continuar aprendiendo
                                    <MaterialIcon name="play_arrow" size="text-sm" />
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <MaterialIcon name="celebration" size="text-4xl" className="text-secondary mb-3" />
                            <h3 className="text-lg font-bold text-on-surface mb-1">¡Todo al día!</h3>
                            <p className="text-sm text-on-surface-variant">No tienes lecciones pendientes</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active Programs Grid ────────────────────── */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-on-surface">Programas Activos</h2>
                        <p className="text-on-surface-variant text-sm">Profundiza en tu formación actual</p>
                    </div>
                    <Link href="/dashboard/courses" className="text-primary text-sm font-bold hover:underline">
                        Ver todos
                    </Link>
                </div>

                {coursesWithProgress.length === 0 ? (
                    <div className="bg-surface-container-low rounded-xl p-16 text-center">
                        <MaterialIcon name="school" size="text-5xl" className="text-on-surface-variant mb-4" />
                        <h3 className="text-lg font-bold text-on-surface mb-2">
                            Aún no estás inscrito en ningún curso
                        </h3>
                        <p className="text-sm text-on-surface-variant mb-6">
                            Explora el catálogo y empieza tu formación
                        </p>
                        <Link
                            href="/dashboard/courses"
                            className="inline-flex items-center gap-2 bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-3 rounded-full font-semibold text-sm"
                        >
                            Ver cursos disponibles
                            <MaterialIcon name="arrow_forward" size="text-sm" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {coursesWithProgress.map(({ course, percent, completed, total }, idx) => {
                            const cardData: CourseCardData = {
                                id: course.id,
                                title: course.title,
                                description: course.description,
                                thumbnail: course.thumbnail,
                                hero_image: course.hero_image,
                                published: course.published,
                                created_at: course.created_at,
                                tagline: course.tagline,
                                tier: course.tier,
                                level: course.level,
                                duration: course.duration,
                                year: course.year,
                                hue: course.hue,
                                accent: course.accent,
                                trajectory: course.trajectory,
                                modules: course.modules.map((m) => ({
                                    id: m.id,
                                    title: m.title,
                                    order: m.order,
                                })),
                                moduleCount: course.modules.length,
                                included_items: Array.isArray(course.included_items)
                                    ? (course.included_items as string[])
                                    : null,
                            }
                            const ctaLabel =
                                percent === 100
                                    ? 'Repasar curso'
                                    : percent === 0
                                        ? 'Empezar curso'
                                        : 'Continuar curso'
                            return (
                                <CourseCardRedesigned
                                    key={course.id}
                                    course={cardData}
                                    index={idx}
                                    ctaHref={`/dashboard/courses/${course.id}`}
                                    ctaLabel={ctaLabel}
                                    progress={{ percent, completed, total }}
                                />
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Bottom: Activity + Skills ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-3 space-y-6">
                    <h3 className="text-xl font-bold tracking-tight text-on-surface">Actividad Reciente</h3>
                    <div className="bg-surface-container-lowest rounded-xl p-4 divide-y divide-white/5">
                        {recentActivity.length === 0 ? (
                            <div className="py-8 text-center">
                                <MaterialIcon name="history" size="text-3xl" className="text-on-surface-variant mb-2" />
                                <p className="text-sm text-on-surface-variant">
                                    Aún no hay actividad. ¡Empieza tu primera lección!
                                </p>
                            </div>
                        ) : (
                            recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-4 py-4 px-2 hover:bg-white/5 transition-all group rounded-lg"
                                >
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                                        <MaterialIcon name="check_circle" size="text-xl" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-on-surface truncate">
                                            Lección completada: {activity.lesson.title}
                                        </p>
                                        <p className="text-xs text-on-surface-variant truncate">
                                            {activity.lesson.module.course.title} • {timeAgo(activity.completed_at)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Skill Mastery (decorative) */}
                <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-8 border border-white/5">
                    <h3 className="text-xl font-bold tracking-tight text-on-surface mb-8">Dominio de Habilidades</h3>
                    <div className="space-y-6">
                        {[
                            { name: 'Prospección', level: 8, percent: 80 },
                            { name: 'Negociación', level: 4, percent: 45 },
                            { name: 'Cierre', level: 6, percent: 62 },
                        ].map((skill) => (
                            <div key={skill.name} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                        {skill.name}
                                    </span>
                                    <span className="text-xs font-bold text-primary">Nivel {skill.level}</span>
                                </div>
                                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                                        style={{ width: `${skill.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Streak card */}
                    <div className="mt-12 p-4 rounded-xl bg-surface-container-lowest border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-secondary-container/10 text-secondary rounded-full">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                                workspace_premium
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-on-surface-variant">Racha Actual</p>
                            <p className="text-lg font-black text-on-surface">-- Días</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
