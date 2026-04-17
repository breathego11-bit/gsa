import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { EnrollButton } from '@/components/courses/EnrollButton'
import { CourseModuleAccordion } from '@/components/courses/CourseModuleAccordion'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
    const { courseId } = await params
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, description: true, thumbnail: true },
    })
    if (!course) return { title: 'Curso no encontrado' }
    return {
        title: `${course.title} | Growth Sales Academy`,
        description: course.description,
        openGraph: {
            title: course.title,
            description: course.description,
            images: course.thumbnail ? [course.thumbnail] : [],
        },
    }
}

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params
    const session = await getServerSession(authOptions)

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            instructor: {
                select: { id: true, name: true, last_name: true, profile_image: true, bio: true, title: true },
            },
            modules: {
                orderBy: { order: 'asc' },
                include: {
                    lessons: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            title: true,
                            order: true,
                            duration: true,
                            type: true,
                            ...(session ? { progress: { where: { user_id: session.user.id } } } : {}),
                        },
                    },
                },
            },
            _count: { select: { enrollments: true } },
        },
    })

    if (!course) notFound()

    if (!course.published && session?.user.role !== 'ADMIN') {
        redirect('/courses')
    }

    let isEnrolled = false
    let hasPaid = false
    if (session) {
        if (session.user.role === 'ADMIN') {
            isEnrolled = true
            hasPaid = true
        } else {
            const [enrollment, user] = await Promise.all([
                prisma.enrollment.findUnique({
                    where: {
                        user_id_course_id: { user_id: session.user.id, course_id: courseId },
                    },
                }),
                prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { payment_status: true, blocked: true },
                }),
            ])
            isEnrolled = !!enrollment
            hasPaid = user?.payment_status === 'active' && !user?.blocked
        }
    }

    // Compute progress
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const completedCount = allLessons.filter((l) => {
        const p = (l as typeof l & { progress: Array<{ completed: boolean }> }).progress
        return Array.isArray(p) && p[0]?.completed
    }).length
    const percent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

    // Total duration (stored in minutes)
    const totalDurationMin = allLessons.reduce((sum, l) => sum + (l.duration || 0), 0)
    const hours = Math.floor(totalDurationMin / 60)
    const minutes = totalDurationMin % 60
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`

    // First incomplete lesson for "Continue Learning"
    const firstIncomplete = allLessons.find((l) => {
        const p = (l as typeof l & { progress: Array<{ completed: boolean }> }).progress
        return !Array.isArray(p) || !p[0]?.completed
    })

    return (
        <div className="min-h-screen bg-surface">
            {/* ── Nav ─────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 glass-header shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center px-4 sm:px-8 h-20 w-full max-w-[1440px] mx-auto">
                    <Link href="/" className="flex items-center gap-3">
                        <img src="/logo_dark.png" alt="GSA" className="h-9 w-auto" />
                        <span className="text-xl font-bold tracking-tighter text-slate-100">
                            Growth Sales Academy
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/courses" className="text-blue-400 font-semibold border-b-2 border-blue-500 pb-1 tracking-tight">
                            Cursos
                        </Link>
                        <Link href="/#features" className="text-slate-400 hover:text-slate-100 transition-colors font-medium tracking-tight">
                            Recursos
                        </Link>
                        <Link href="/#testimonials" className="text-slate-400 hover:text-slate-100 transition-colors font-medium tracking-tight">
                            Comunidad
                        </Link>
                    </div>
                    <div className="flex items-center gap-6">
                        <MaterialIcon name="search" className="text-on-surface-variant cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all" />
                        <MaterialIcon name="notifications" className="text-on-surface-variant cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all" />
                        {session ? (
                            <Link
                                href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                                className="h-10 w-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden"
                            >
                                {session.user.profile_image ? (
                                    <img src={session.user.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <MaterialIcon name="person" size="text-lg" className="text-on-surface-variant" />
                                )}
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-2.5 rounded-full font-semibold text-sm"
                            >
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-20 min-h-screen">
                {/* ── Hero ────────────────────────────────────── */}
                <header className="relative w-full h-[300px] sm:h-[450px] overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        {course.hero_image ? (
                            <img
                                src={course.hero_image}
                                alt=""
                                className="w-full h-full object-cover opacity-40 grayscale"
                            />
                        ) : (
                            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0c1a3e 0%, #080d18 100%)' }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-8 sm:pb-12">
                        {/* Back button */}
                        <Link
                            href={session?.user.role === 'ADMIN' ? '/admin/courses' : session ? '/dashboard' : '/'}
                            className="absolute top-8 left-8 flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors text-sm"
                        >
                            <MaterialIcon name="arrow_back" size="text-lg" />
                            {session?.user.role === 'ADMIN' ? 'Volver a cursos' : session ? 'Volver al dashboard' : 'Volver al inicio'}
                        </Link>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="space-y-4">
                                <div className="inline-flex items-center px-3 py-1 bg-primary-container/20 text-primary rounded-full text-xs font-bold tracking-[0.1em] uppercase">
                                    Formación en ventas
                                </div>
                                {!course.published && (
                                    <span className="ml-2 inline-flex items-center px-3 py-1 bg-surface-variant/50 text-on-surface-variant rounded-full text-xs font-bold uppercase tracking-wider">
                                        Borrador
                                    </span>
                                )}
                                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter text-on-surface max-w-3xl">
                                    {course.title}
                                </h1>
                                <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl">
                                    {course.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-6 text-on-surface-variant pt-2">
                                    {course.instructor && (
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="person" size="text-lg" className="text-blue-400" />
                                            <span className="font-medium">
                                                {course.instructor.name} {course.instructor.last_name}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <MaterialIcon name="schedule" size="text-lg" className="text-blue-400" />
                                        <span className="font-medium">{durationStr}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MaterialIcon name="school" size="text-lg" className="text-blue-400" />
                                        <span className="font-medium">{course.modules.length} Módulos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Content Layout ──────────────────────────── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Main: Curriculum */}
                        <div className="lg:col-span-8 space-y-12">
                            <section>
                                <h2 className="text-2xl font-bold tracking-tight mb-8 flex items-center gap-3 text-on-surface">
                                    Contenido del curso
                                    <span className="h-1 flex-grow bg-surface-container-highest rounded-full max-w-[100px]" />
                                </h2>

                                {course.modules.length === 0 ? (
                                    <div className="bg-surface-container-low rounded-xl p-12 text-center">
                                        <MaterialIcon name="school" size="text-4xl" className="text-on-surface-variant mb-4" />
                                        <p className="text-on-surface-variant">
                                            El contenido de este curso está siendo preparado.
                                        </p>
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
                                                progress: (l as typeof l & { progress?: Array<{ completed: boolean }> }).progress as Array<{ completed: boolean }> | undefined,
                                            })),
                                        }))}
                                        isEnrolled={isEnrolled}
                                    />
                                )}
                            </section>
                        </div>

                        {/* Sidebar */}
                        <aside className="lg:col-span-4 space-y-8">
                            {/* Progress Card (enrolled) */}
                            {isEnrolled && (
                                <div className="bg-surface-container rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
                                                    Progreso actual
                                                </p>
                                                <h4 className="text-3xl font-black text-on-surface">{percent}%</h4>
                                            </div>
                                            <p className="text-on-surface-variant text-xs">
                                                {completedCount} de {allLessons.length} pasos
                                            </p>
                                        </div>
                                        <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        {firstIncomplete && (
                                            <Link
                                                href={`/lesson/${firstIncomplete.id}`}
                                                className="w-full py-4 bg-gradient-to-br from-primary-container to-secondary-container text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <MaterialIcon name="play_arrow" size="text-xl" />
                                                Continuar aprendiendo
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Enroll Card (not enrolled) */}
                            {!isEnrolled && (
                                <div className="bg-surface-container rounded-2xl p-8 shadow-2xl space-y-4">
                                    <h3 className="font-bold text-lg text-on-surface">¿Quieres acceder?</h3>
                                    <p className="text-sm text-on-surface-variant">
                                        Inscríbete para desbloquear todas las lecciones y seguir tu progreso.
                                    </p>
                                    <EnrollButton courseId={course.id} isAuthenticated={!!session} hasPaid={hasPaid} />
                                </div>
                            )}

                            {/* Instructor Card */}
                            {course.instructor && (
                                <div className="bg-surface-container-low rounded-2xl p-8 space-y-6">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                                        Tu Instructor
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface-container flex items-center justify-center shrink-0">
                                            {course.instructor.profile_image ? (
                                                <img
                                                    src={course.instructor.profile_image}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <MaterialIcon name="person" size="text-2xl" className="text-on-surface-variant" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-on-surface">
                                                {course.instructor.name} {course.instructor.last_name}
                                            </p>
                                            {course.instructor.title && (
                                                <p className="text-xs text-blue-400 font-medium">
                                                    {course.instructor.title}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {course.instructor.bio && (
                                        <p className="text-sm text-on-surface-variant leading-relaxed">
                                            {course.instructor.bio}
                                        </p>
                                    )}
                                    <Link
                                        href={`/instructor/${course.instructor.id}`}
                                        className="w-full py-3 rounded-xl border border-outline-variant text-on-surface text-sm font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        Ver Perfil
                                    </Link>
                                </div>
                            )}

                            {/* Community Stats */}
                            <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <MaterialIcon name="group" size="text-xl" className="text-tertiary" />
                                    <span className="font-bold text-on-surface">Actividad de estudiantes</span>
                                </div>
                                <div className="flex -space-x-3 mb-4">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center"
                                        >
                                            <MaterialIcon name="person" size="text-xs" className="text-on-surface-variant" />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                                        +{course._count.enrollments}
                                    </div>
                                </div>
                                <p className="text-xs text-on-surface-variant">
                                    Únete a {course._count.enrollments}+ estudiantes en este curso.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            {/* ── Footer ─────────────────────────────────── */}
            <footer className="bg-surface border-t border-white/5 py-12 px-4 sm:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-2">
                        <span className="text-md font-bold text-slate-300">Growth Sales Academy</span>
                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} Growth Sales Academy. Todos los derechos reservados.
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">Política de Privacidad</Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">Términos de Servicio</Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">Soporte</Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">Contacto</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
