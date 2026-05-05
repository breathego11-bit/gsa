import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import LiquidEther from '@/components/ui/LiquidEther'
import { AboutSection } from '@/components/landing/AboutSection'
import { ProgramIncludesSection } from '@/components/landing/ProgramIncludesSection'
import { CoursesSection } from '@/components/landing/CoursesSection'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { ManifestoSection } from '@/components/landing/ManifestoSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'


export const dynamic = 'force-dynamic'

export default async function LandingPage() {
    const featuredCoursesRaw = await prisma.course.findMany({
        where: { published: true },
        take: 2,
        include: {
            modules: {
                select: { id: true, title: true, order: true },
                orderBy: { order: 'asc' },
                take: 3,
            },
            _count: { select: { modules: true } },
        },
        orderBy: { created_at: 'desc' },
    })

    const featuredCourses = featuredCoursesRaw.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail,
        hero_image: c.hero_image,
        published: c.published,
        created_at: c.created_at,
        tagline: c.tagline,
        tier: c.tier,
        level: c.level,
        duration: c.duration,
        year: c.year,
        hue: c.hue,
        accent: c.accent,
        trajectory: c.trajectory,
        modules: c.modules,
        moduleCount: c._count.modules,
    }))

    const testimonials = await prisma.testimonial.findMany({
        where: { published: true },
        orderBy: [{ order: 'asc' }, { created_at: 'desc' }],
        select: {
            id: true,
            name: true,
            role: true,
            metric: true,
            quote: true,
            duration: true,
            video_url: true,
            hue: true,
            poster_bg: true,
            poster_accent: true,
        },
    })

    return (
        <>
            {/* ── Nav ─────────────────────────────────────── */}
            <LandingNavbar />

            {/* ── Global LiquidEther background ─────────── */}
            <div className="fixed inset-0 z-0" aria-hidden="true">
                <LiquidEther
                    colors={['#0563fa', '#0532e6', '#f4f5f6']}
                    mouseForce={20}
                    cursorSize={100}
                    isViscous
                    viscous={30}
                    iterationsViscous={32}
                    iterationsPoisson={32}
                    resolution={0.5}
                    isBounce={false}
                    autoDemo
                    autoSpeed={0.5}
                    autoIntensity={2.2}
                    takeoverDuration={0.25}
                    autoResumeDelay={3000}
                    autoRampDuration={0.6}
                />
            </div>
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, var(--bg-base) 100%)' }}
            />

            <main className="relative z-10 pt-16">
                {/* ── Hero ────────────────────────────────────── */}
                <section className="relative h-[calc(100vh-64px)] flex items-center justify-center px-4 sm:px-8 overflow-hidden">

                    {/* Content */}
                    <div className="z-10 text-center max-w-4xl">
                        <span className="uppercase tracking-[0.2em] text-secondary font-bold mb-4 block text-sm">
                            Growth Sales Academy
                        </span>
                        <h1 className="text-4xl md:text-6xl lg:text-[5.5rem] font-black tracking-tighter text-on-surface mb-6 leading-tight">
                            <span className="whitespace-nowrap">No cerramos ventas,</span>
                            <br />
                            <span className="whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-secondary to-tertiary">
                               ayudamos a personas.
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10">
                            La academia de formación que convierte personas normales en vendedores expertos.
                            Domina las técnicas de cierre, desarrolla tu
                            mentalidad y escala tu vida un siguiente nivel en
                            todas las áreas con los mejores del sector a
                            través del método GSA.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                href="/auth?mode=register"
                                className="hero-cta-primary px-8 py-4 rounded-xl font-bold text-lg transition-all"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                                    color: '#080d18',
                                    boxShadow: '0 12px 32px rgba(56,189,248,0.4)',
                                }}
                            >
                                Comenzar Ahora
                            </Link>
                            <Link
                                href="/courses"
                                className="bg-transparent border border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-all"
                            >
                                Ver Cursos
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Features / Qué incluye el programa ──────── */}
                <ProgramIncludesSection />

                {/* ── Manifesto + 10 pilares ─────────────────── */}
                <ManifestoSection />

                {/* ── About / Quiénes somos ──────────────────── */}
                <AboutSection />

                {/* ── Featured Courses (redesign) ─────────────── */}
                <CoursesSection courses={featuredCourses} />

                {/* ── Testimonios + stats + pre-CTA (redesign) ── */}
                <TestimonialsSection testimonials={testimonials} />

                {/* ── Final CTA ──────────────────────────────── */}
                <section className="relative py-16 sm:py-32 px-4 sm:px-8">
                    <div className="max-w-5xl mx-auto glass p-8 sm:p-16 rounded-xl text-center border border-secondary-container/20">
                        <h2 className="text-3xl sm:text-5xl font-black text-on-surface mb-6">
                            ¿Listo para Escalar Tu Carrera?
                        </h2>
                        <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto">
                            Únete a más de 12,000 profesionales de ventas dominando la economía
                            de alto crecimiento. Obtén acceso instantáneo a la academia hoy.
                        </p>
                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            <input
                                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-6 py-4 w-full md:w-80 focus:ring-2 focus:ring-secondary outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50"
                                placeholder="Ingresa tu correo electrónico"
                                type="email"
                            />
                            <Link
                                href="/auth?mode=register"
                                className="bg-gradient-to-br from-primary-container to-secondary-container text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all text-center"
                            >
                                Obtener Acceso
                            </Link>
                        </div>
                        <p className="mt-6 text-sm text-slate-500">
                            Garantía de devolución de 7 días sin riesgos. Acceso completo a todos los módulos.
                        </p>
                    </div>
                </section>
            </main>

            {/* ── Footer ─────────────────────────────────── */}
            <footer className="relative z-10 bg-[#0e131e]/80 backdrop-blur-sm border-t border-white/5 py-16 px-4 sm:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 max-w-7xl mx-auto">
                    <div className="space-y-6">
                        <div className="text-md font-bold text-slate-300">Growth Sales Academy</div>
                        <p className="text-slate-500 max-w-xs text-sm">
                            Creando la próxima generación de vendedores conscientes que transforman su vida y la de sus clientes a través del arte de la venta consciente
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        <div className="flex flex-col gap-4">
                            <span className="text-slate-100 font-bold text-sm tracking-wider uppercase">
                                Academia
                            </span>
                            <Link href="/courses" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Programas
                            </Link>
                            <Link href="/courses" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Certificaciones
                            </Link>
                            <Link href="/courses" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Casos de Estudio
                            </Link>
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-slate-100 font-bold text-sm tracking-wider uppercase">
                                Compañía
                            </span>
                            <Link href="#" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Política de Privacidad
                            </Link>
                            <Link href="#" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Términos de Servicio
                            </Link>
                            <Link href="#" className="text-slate-500 hover:text-blue-400 transition-colors text-sm">
                                Contacto
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-slate-500">
                        © {new Date().getFullYear()} Growth Sales Academy. Todos los derechos reservados.
                    </div>
                    <div className="flex gap-6 items-center">
                        <a href="https://www.instagram.com/growthsalesacademy?igsh=cnlpdWI1dzR0M3dz" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-pink-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>
        </>
    )
}
