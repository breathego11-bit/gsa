import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { CourseCard } from '@/components/courses/CourseCard'

export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
    const session = await getServerSession(authOptions)

    const courses = await prisma.course.findMany({
        where: { published: true },
        include: {
            _count: { select: { enrollments: true } },
            modules: {
                include: {
                    lessons: { select: { id: true, duration: true } },
                },
            },
        },
        orderBy: { created_at: 'desc' },
    })

    // Get user's enrollments and payment status if logged in
    let enrolledCourseIds: string[] = []
    let hasPaid = false
    if (session) {
        const [enrollments, user] = await Promise.all([
            prisma.enrollment.findMany({
                where: { user_id: session.user.id },
                select: { course_id: true },
            }),
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: { payment_status: true, role: true, blocked: true },
            }),
        ])
        enrolledCourseIds = enrollments.map((e) => e.course_id)
        hasPaid = user?.role === 'ADMIN' || (user?.payment_status === 'active' && !user?.blocked)
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* ── Nav ─────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 bg-[#0e131e]/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center px-4 sm:px-8 h-20 w-full max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-3">
                            <img src="/logo_dark.png" alt="GSA" className="h-9 w-auto" />
                            <span className="text-xl font-bold tracking-tighter text-slate-100">
                                Growth Sales Academy
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6 tracking-tight font-medium">
                            <Link
                                href="/courses"
                                className="text-blue-400 font-semibold border-b-2 border-blue-500 pb-1"
                            >
                                Programas
                            </Link>
                            <Link href="/#features" className="text-slate-400 hover:text-slate-100 transition-colors">
                                Recursos
                            </Link>
                            <Link
                                href="/#testimonials"
                                className="text-slate-400 hover:text-slate-100 transition-colors"
                            >
                                Comunidad
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant/15">
                            <MaterialIcon name="search" size="text-sm" className="text-on-surface-variant" />
                            <input
                                className="bg-transparent border-none text-sm focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 w-48 outline-none ml-2"
                                placeholder="Buscar cursos..."
                                type="text"
                            />
                        </div>
                        <button className="p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-all">
                            <MaterialIcon name="notifications" size="text-xl" />
                        </button>
                        {session ? (
                            <Link
                                href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                                className="bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-2.5 rounded-full font-semibold text-sm active:scale-90 transition-transform"
                            >
                                Mi Panel
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-2.5 rounded-full font-semibold text-sm active:scale-90 transition-transform"
                            >
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-4 sm:px-8 max-w-[1440px] mx-auto">
                {/* ── Header ──────────────────────────────────── */}
                <header className="mb-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="max-w-2xl">
                            <span className="uppercase tracking-[0.1em] text-[12px] font-bold text-secondary mb-4 block">
                                Catálogo de la Academia
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-on-surface mb-6">
                                Domina el arte de las{' '}
                                <span className="bg-gradient-to-r from-secondary to-tertiary bg-clip-text text-transparent">
                                    ventas de alto ticket.
                                </span>
                            </h1>
                            <p className="text-on-surface-variant text-lg leading-relaxed">
                                Frameworks sistemáticos diseñados para closers de élite. Desde
                                psicología fundamental hasta técnicas avanzadas de negociación.
                            </p>
                        </div>
                        {/* Filter pills (decorative) */}
                        <div className="flex flex-wrap gap-3">
                            <button className="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full text-sm font-medium transition-all">
                                Todos los Cursos
                            </button>
                            <button className="bg-surface-container-high text-on-surface-variant px-5 py-2 rounded-full text-sm font-medium hover:bg-surface-variant transition-all">
                                Cierre
                            </button>
                            <button className="bg-surface-container-high text-on-surface-variant px-5 py-2 rounded-full text-sm font-medium hover:bg-surface-variant transition-all">
                                Prospección
                            </button>
                            <button className="bg-surface-container-high text-on-surface-variant px-5 py-2 rounded-full text-sm font-medium hover:bg-surface-variant transition-all">
                                Psicología
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Course Grid ─────────────────────────────── */}
                {courses.length === 0 ? (
                    <div className="glass rounded-xl p-16 text-center border border-outline-variant/10">
                        <MaterialIcon name="school" size="text-5xl" className="text-secondary mb-4" />
                        <h3 className="text-xl font-bold text-on-surface mb-2">Próximamente</h3>
                        <p className="text-on-surface-variant">
                            Estamos preparando cursos exclusivos para ti. ¡Vuelve pronto!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {courses.map((course) => {
                            const lessonCount = course.modules.reduce(
                                (sum, m) => sum + m.lessons.length,
                                0,
                            )
                            const totalDurationMinutes = course.modules.reduce(
                                (sum, m) =>
                                    sum +
                                    m.lessons.reduce((ls, l) => ls + (l.duration || 0), 0),
                                0,
                            )

                            return (
                                <CourseCard
                                    key={course.id}
                                    id={course.id}
                                    title={course.title}
                                    description={course.description}
                                    thumbnail={course.thumbnail}
                                    published={course.published}
                                    lessonCount={lessonCount}
                                    totalDurationMinutes={totalDurationMinutes}
                                    isEnrolled={enrolledCourseIds.includes(course.id)}
                                    isAuthenticated={!!session}
                                    hasPaid={hasPaid}
                                />
                            )
                        })}

                        {/* CTA Card */}
                        <div className="lg:col-span-1 bg-gradient-to-br from-primary-container to-secondary-container rounded-xl p-10 flex flex-col justify-center relative overflow-hidden group shadow-2xl">
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black text-on-primary-container leading-tight mb-4">
                                    ¿No encuentras lo que buscas?
                                </h2>
                                <p className="text-on-primary-container/80 mb-8">
                                    Agenda una llamada estratégica gratuita para encontrar el
                                    programa ideal para tus metas profesionales.
                                </p>
                                <Link
                                    href="/register"
                                    className="bg-white text-primary-container px-8 py-4 rounded-full font-bold flex items-center gap-3 w-fit hover:shadow-xl hover:translate-x-2 transition-all"
                                >
                                    Agendar Llamada
                                    <MaterialIcon name="arrow_forward" size="text-xl" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ─────────────────────────────────── */}
            <footer className="bg-[#0e131e] w-full py-12 px-4 sm:px-8 border-t border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-2">
                        <span className="text-md font-bold text-slate-300">Growth Sales Academy</span>
                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} Growth Sales Academy. Todos los derechos reservados.
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                            Política de Privacidad
                        </Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                            Términos de Servicio
                        </Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                            Soporte
                        </Link>
                        <Link href="#" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                            Contacto
                        </Link>
                    </div>
                    <div className="flex gap-4">
                        <MaterialIcon
                            name="language"
                            className="text-slate-500 hover:text-blue-400 cursor-pointer transition-all"
                        />
                        <MaterialIcon
                            name="share"
                            className="text-slate-500 hover:text-blue-400 cursor-pointer transition-all"
                        />
                    </div>
                </div>
            </footer>
        </div>
    )
}
