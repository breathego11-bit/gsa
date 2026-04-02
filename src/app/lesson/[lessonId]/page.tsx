import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { VideoPlaceholder } from '@/components/video/VideoPlaceholder'
import { MarkCompleteButton } from '@/components/lesson/MarkCompleteButton'
import { PrivateNotes } from '@/components/lesson/PrivateNotes'
import { TextContent } from '@/components/lesson/TextContent'
import { FormContent } from '@/components/lesson/FormContent'
import { ExamContent } from '@/components/lesson/ExamContent'
import type { FormField, ExamQuestion } from '@/types'

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            module: { include: { course: true } },
            progress: { where: { user_id: session.user.id } },
        },
    })

    if (!lesson) notFound()

    // Check enrollment
    if (session.user.role !== 'ADMIN') {
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                user_id_course_id: {
                    user_id: session.user.id,
                    course_id: lesson.module.course_id,
                },
            },
        })
        if (!enrollment) redirect(`/course/${lesson.module.course_id}`)
    }

    // Note
    const note = await prisma.lessonNote.findUnique({
        where: {
            user_id_lesson_id: { user_id: session.user.id, lesson_id: lessonId },
        },
    })

    // Type-specific data
    let formSubmission: Record<string, any> | null = null
    let examAttemptCount = 0
    let examHasPassed = false
    let examBestScore: number | null = null

    if (lesson.type === 'FORM') {
        const sub = await prisma.formSubmission.findUnique({
            where: { user_id_lesson_id: { user_id: session.user.id, lesson_id: lessonId } },
        })
        formSubmission = sub ? (sub.data as Record<string, any>) : null
    }

    if (lesson.type === 'EXAM') {
        const attempts = await prisma.examAttempt.findMany({
            where: { user_id: session.user.id, lesson_id: lessonId },
            select: { score: true, passed: true },
        })
        examAttemptCount = attempts.length
        examHasPassed = attempts.some((a) => a.passed)
        examBestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null
    }

    // All modules + lessons for sidebar
    const courseModules = await prisma.module.findMany({
        where: { course_id: lesson.module.course_id },
        orderBy: { order: 'asc' },
        include: {
            lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, order: true, duration: true, type: true },
            },
        },
    })

    // Progress for all lessons in course
    const allLessonIds = courseModules.flatMap((m) => m.lessons.map((l) => l.id))
    const progressRecords = await prisma.lessonProgress.findMany({
        where: { user_id: session.user.id, lesson_id: { in: allLessonIds } },
        select: { lesson_id: true, completed: true },
    })
    const progressMap = new Map(progressRecords.map((p) => [p.lesson_id, p.completed]))

    // Course progress
    const totalLessons = allLessonIds.length
    const completedLessons = progressRecords.filter((p) => p.completed).length
    const coursePercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Prev/Next navigation (across all modules, not just current)
    const flatLessons = courseModules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })))
    const currentIdx = flatLessons.findIndex((l) => l.id === lessonId)
    const prev = currentIdx > 0 ? flatLessons[currentIdx - 1] : null
    const next = currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null

    const isCompleted = lesson.progress[0]?.completed ?? false
    const durationMin = lesson.duration ?? null

    return (
        <div className="min-h-screen bg-surface flex flex-col">
            {/* ── Top Nav ─────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 glass-header shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center px-4 sm:px-8 h-16 w-full max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-3">
                            <img src="/logo_dark.png" alt="GSA" className="h-8 w-auto" />
                            <span className="text-lg font-bold tracking-tighter text-slate-100">
                                Growth Sales Academy
                            </span>
                        </Link>
                        <Link
                            href={`/course/${lesson.module.course_id}`}
                            className="hidden md:flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            <MaterialIcon name="arrow_back" size="text-sm" />
                            {lesson.module.course.title}
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <MaterialIcon name="search" className="text-on-surface-variant cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all" />
                        <MaterialIcon name="notifications" className="text-on-surface-variant cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all" />
                        <Link
                            href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                            className="h-9 w-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden"
                        >
                            {session.user.profile_image ? (
                                <img src={session.user.profile_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <MaterialIcon name="person" size="text-sm" className="text-on-surface-variant" />
                            )}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Main Content ────────────────────────────── */}
            <div className="pt-16 flex flex-1 overflow-hidden">
                {/* Left: Video + Info + Notes */}
                <div className="flex-1 overflow-y-auto pb-24">
                    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
                        {/* Lesson Content by Type */}
                        {lesson.type === 'VIDEO' && (
                            <VideoPlaceholder
                                videoUrl={lesson.video_url}
                                thumbnail={lesson.thumbnail}
                                title={lesson.title}
                            />
                        )}
                        {lesson.type === 'TEXT' && lesson.content && (
                            <TextContent content={lesson.content} />
                        )}
                        {lesson.type === 'FORM' && (
                            <FormContent
                                lessonId={lessonId}
                                schema={(lesson.form_schema as unknown as FormField[]) || []}
                                existingSubmission={formSubmission}
                            />
                        )}
                        {lesson.type === 'EXAM' && (
                            <ExamContent
                                lessonId={lessonId}
                                questions={((lesson.exam_schema as unknown as ExamQuestion[]) || []).map(({ id, text, options }) => ({ id, text, options }))}
                                passingScore={lesson.passing_score ?? 70}
                                maxAttempts={lesson.max_attempts}
                                attemptCount={examAttemptCount}
                                hasPassed={examHasPassed}
                                bestScore={examBestScore}
                            />
                        )}

                        {/* Lesson Info */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center px-3 py-1 bg-primary-container/20 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
                                    Módulo {String(lesson.module.order).padStart(2, '0')}
                                </span>
                                {durationMin && (
                                    <span className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                                        <MaterialIcon name="schedule" size="text-sm" />
                                        {durationMin} min
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                                {lesson.title}
                            </h1>
                            {lesson.description && (
                                <p className="text-on-surface-variant leading-relaxed">
                                    {lesson.description}
                                </p>
                            )}
                        </div>

                        {/* Resources */}
                        {Array.isArray(lesson.resources) && lesson.resources.length > 0 && (
                            <div className="bg-surface-container-low rounded-3xl p-4 sm:p-8 border border-white/5">
                                <div className="flex items-center gap-3 mb-6">
                                    <MaterialIcon name="folder_open" size="text-2xl" className="text-tertiary" />
                                    <div>
                                        <h3 className="font-bold text-on-surface">Recursos</h3>
                                        <p className="text-xs text-on-surface-variant">Material complementario de la lección</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(lesson.resources as Array<{ id: string; name: string; url: string; type: string }>).map((r) => (
                                        <a
                                            key={r.id}
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group"
                                        >
                                            <MaterialIcon
                                                name={r.type === 'link' ? 'link' : 'description'}
                                                size="text-xl"
                                                className="text-blue-400 shrink-0"
                                            />
                                            <span className="flex-1 text-sm font-medium text-on-surface group-hover:text-blue-400 transition-colors truncate">
                                                {r.name}
                                            </span>
                                            <MaterialIcon
                                                name={r.type === 'link' ? 'open_in_new' : 'download'}
                                                size="text-sm"
                                                className="text-on-surface-variant shrink-0"
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Private Notes */}
                        <div className="bg-surface-container-low rounded-3xl p-4 sm:p-8 border border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <MaterialIcon name="edit_note" size="text-2xl" className="text-secondary" />
                                <div>
                                    <h3 className="font-bold text-on-surface">Notas Privadas</h3>
                                    <p className="text-xs text-on-surface-variant">Se guardan automáticamente</p>
                                </div>
                            </div>
                            <PrivateNotes lessonId={lessonId} initialContent={note?.content ?? ''} />
                        </div>
                        {/* Mobile Course Outline */}
                        <details className="lg:hidden bg-surface-container-low rounded-3xl border border-white/5 overflow-hidden">
                            <summary className="flex items-center gap-3 p-4 sm:p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                <MaterialIcon name="menu_book" size="text-2xl" className="text-primary" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-on-surface text-sm">Contenido del curso</h3>
                                    <p className="text-xs text-on-surface-variant">{coursePercent}% completado • {completedLessons}/{totalLessons} lecciones</p>
                                </div>
                                <MaterialIcon name="expand_more" size="text-xl" className="text-on-surface-variant transition-transform [[open]>&]:rotate-180" />
                            </summary>
                            <div className="p-4 pt-0 space-y-2 border-t border-white/5">
                                {courseModules.map((mod) => (
                                    <div key={mod.id}>
                                        <div className="px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
                                                Módulo {String(mod.order).padStart(2, '0')}: {mod.title}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            {mod.lessons.map((l) => {
                                                const isCurrent = l.id === lessonId
                                                const isDone = progressMap.get(l.id) ?? false
                                                return (
                                                    <Link
                                                        key={l.id}
                                                        href={`/lesson/${l.id}`}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                                                            isCurrent ? 'border-l-2 border-primary bg-primary-container/5' : 'hover:bg-white/5'
                                                        }`}
                                                    >
                                                        {isDone ? (
                                                            <span className="material-symbols-outlined text-blue-500 text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                        ) : isCurrent ? (
                                                            <MaterialIcon name="play_circle" size="text-lg" className="text-primary shrink-0" />
                                                        ) : (
                                                            <MaterialIcon name="radio_button_unchecked" size="text-lg" className="text-on-surface-variant/40 shrink-0" />
                                                        )}
                                                        <span className={`flex-1 truncate ${isCurrent ? 'text-on-surface font-semibold' : isDone ? 'text-on-surface-variant' : 'text-on-surface-variant/70'}`}>
                                                            {l.title}
                                                        </span>
                                                        {l.duration && <span className="text-[10px] text-on-surface-variant/50 shrink-0">{l.duration}m</span>}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                </div>

                {/* Right: Course Sidebar */}
                <aside className="w-96 shrink-0 hidden lg:flex flex-col bg-surface-container-low border-l border-white/5 overflow-y-auto">
                    {/* Course header + progress */}
                    <div className="p-6 border-b border-white/5">
                        <h2 className="font-bold text-on-surface mb-3 line-clamp-2">
                            {lesson.module.course.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-blue-500">
                                {coursePercent}% Completado
                            </span>
                            <span className="text-[10px] text-on-surface-variant">
                                • {completedLessons}/{totalLessons} Lecciones
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full transition-all"
                                style={{ width: `${coursePercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Module tree */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {courseModules.map((mod) => {
                            const isCurrentModule = mod.id === lesson.module_id

                            return (
                                <div key={mod.id}>
                                    {/* Module header */}
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant">
                                            Módulo {String(mod.order).padStart(2, '0')}: {mod.title}
                                        </p>
                                        <p className="text-[10px] text-on-surface-variant/60">
                                            {mod.lessons.length} {mod.lessons.length === 1 ? 'lección' : 'lecciones'}
                                        </p>
                                    </div>

                                    {/* Lessons */}
                                    <div className="space-y-0.5">
                                        {mod.lessons.map((l) => {
                                            const isCurrent = l.id === lessonId
                                            const isDone = progressMap.get(l.id) ?? false
                                            const mins = l.duration ?? null

                                            return (
                                                <Link
                                                    key={l.id}
                                                    href={`/lesson/${l.id}`}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                                                        isCurrent
                                                            ? 'border-l-2 border-primary bg-primary-container/5'
                                                            : 'hover:bg-white/5'
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <span
                                                            className="material-symbols-outlined text-blue-500 text-lg shrink-0"
                                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                                        >
                                                            check_circle
                                                        </span>
                                                    ) : isCurrent ? (
                                                        <MaterialIcon name="play_circle" size="text-lg" className="text-primary shrink-0" />
                                                    ) : (
                                                        <MaterialIcon name="radio_button_unchecked" size="text-lg" className="text-on-surface-variant/40 shrink-0" />
                                                    )}
                                                    <span
                                                        className={`flex-1 truncate ${
                                                            isCurrent
                                                                ? 'text-on-surface font-semibold'
                                                                : isDone
                                                                    ? 'text-on-surface-variant'
                                                                    : 'text-on-surface-variant/70'
                                                        }`}
                                                    >
                                                        {l.title}
                                                    </span>
                                                    {mins && (
                                                        <span className="text-[10px] text-on-surface-variant/50 shrink-0">
                                                            {mins}m
                                                        </span>
                                                    )}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Help CTA */}
                    <div className="p-4 border-t border-white/5">
                        <div className="bg-gradient-to-br from-primary-container/20 to-secondary-container/20 rounded-xl p-5 border border-white/5">
                            <p className="font-bold text-on-surface text-sm mb-1">¿Necesitas ayuda?</p>
                            <p className="text-xs text-on-surface-variant mb-3">
                                Nuestro equipo de soporte está disponible para ti.
                            </p>
                            <button className="text-xs font-bold text-primary hover:underline">
                                Contactar soporte
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── Footer Nav ─────────────────────────────── */}
            <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container/80 backdrop-blur-xl border-t border-white/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    {prev ? (
                        <Link
                            href={`/lesson/${prev.id}`}
                            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            <MaterialIcon name="chevron_left" size="text-lg" />
                            <span className="hidden sm:block max-w-[160px] truncate">Anterior</span>
                        </Link>
                    ) : (
                        <span />
                    )}

                    {next ? (
                        <Link
                            href={`/lesson/${next.id}`}
                            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            <span className="hidden sm:block max-w-[160px] truncate">Siguiente</span>
                            <MaterialIcon name="chevron_right" size="text-lg" />
                        </Link>
                    ) : (
                        <Link
                            href={`/course/${lesson.module.course_id}`}
                            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            Ver curso completo
                            <MaterialIcon name="chevron_right" size="text-lg" />
                        </Link>
                    )}

                    <MarkCompleteButton
                        lessonId={lessonId}
                        initialCompleted={isCompleted}
                        nextLessonId={next?.id}
                        courseId={lesson.module.course_id}
                        lessonType={lesson.type}
                    />
                </div>
            </footer>
        </div>
    )
}
