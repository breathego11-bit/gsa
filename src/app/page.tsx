import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import LiquidEther from '@/components/ui/LiquidEther'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { FeaturedCourseCard } from '@/components/landing/FeaturedCourseCard'


export const dynamic = 'force-dynamic'

const features = [
    {
        icon: 'psychology',
        title: 'Desarrollo de habilidades de conexión humana y creación de relaciones',
        desc: 'Aprende a generar confianza genuina, escuchar activamente y construir vínculos duraderos con cada cliente.',
        offset: false,
        image: '/feature1.jpg',
    },
    {
        icon: 'trending_up',
        title: 'Técnicas avanzadas de venta consciente',
        desc: 'Domina metodologías de cierre éticas que priorizan el valor real para el cliente, no la presión.',
        offset: true,
        image: '/feature2.jpg',
    },
    {
        icon: 'diamond',
        title: 'Comunidad privada',
        desc: 'Forma parte de un grupo exclusivo de vendedores comprometidos donde compartir experiencias, estrategias y apoyo mutuo.',
        offset: false,
        image: '/feature3.jpg',
    },
    {
        icon: 'hub',
        title: 'Sesiones en vivo',
        desc: 'Participa en sesiones interactivas con mentores expertos para resolver dudas, practicar cierres y recibir feedback en tiempo real.',
        offset: true,
        image: '/feature4.jpg',
    },
]


export default async function LandingPage() {
    const featuredCourses = await prisma.course.findMany({
        where: { published: true },
        take: 3,
        include: { _count: { select: { modules: true, enrollments: true } } },
        orderBy: { created_at: 'desc' },
    })

    return (
        <>
            {/* ── Nav ─────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 bg-[#0e131e]/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center px-8 h-20 w-full max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-3">
                        <img src="/logo_dark.png" alt="GSA" className="w-auto" style={{ height: '4.25rem' }} />
                        <span className="text-xl font-bold tracking-tighter text-slate-100">
                            Growth Sales Academy
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 tracking-tight font-medium">
                        <Link href="/courses" className="text-blue-400 font-semibold border-b-2 border-blue-500 pb-1">
                            Programas
                        </Link>
                        <Link href="#" className="text-slate-400 hover:text-slate-100 transition-colors">
                            Recursos
                        </Link>
                        <Link href="#testimonials" className="text-slate-400 hover:text-slate-100 transition-colors">
                            Comunidad
                        </Link>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex gap-4 text-slate-300">
                            <MaterialIcon name="search" className="hover:text-blue-400 cursor-pointer transition-colors" />
                            <MaterialIcon name="notifications" className="hover:text-blue-400 cursor-pointer transition-colors" />
                        </div>
                        <Link
                            href="/login"
                            className="bg-gradient-to-br from-primary-container to-secondary-container text-white px-6 py-2.5 rounded-xl font-semibold active:scale-90 transition-transform"
                        >
                            Ingresar
                        </Link>
                    </div>
                </div>
            </nav>

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

            <main className="relative z-10 pt-20">
                {/* ── Hero ────────────────────────────────────── */}
                <section className="relative h-[calc(100vh-80px)] flex items-center justify-center px-8 overflow-hidden">

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
                                href="/register"
                                className="bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
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

                {/* ── Features ────────────────────────────────── */}
                <section id="features" className="relative py-24 px-8 max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-on-surface">
                            Los 4 pilares del método{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-tertiary">
                                GSA
                            </span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {features.map((f) => (
                            <div
                                key={f.icon}
                                className={`glass rounded-xl border border-outline-variant/10 flex flex-col overflow-hidden hover:bg-surface-container-high transition-all group ${
                                    f.offset ? 'md:mt-12' : ''
                                }`}
                            >
                                <div className="h-36 overflow-hidden">
                                    <img src={f.image} alt={f.title}
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700" />
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <div>
                                        <MaterialIcon
                                            name={f.icon}
                                            size="text-3xl"
                                            className="text-secondary mb-3"
                                        />
                                        <h3 className="text-lg font-bold text-on-surface">{f.title}</h3>
                                    </div>
                                    <p className="text-sm text-on-surface-variant mt-3">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Featured Courses ────────────────────────── */}
                <section className="relative py-24 px-8 bg-surface-container-low/40 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-end mb-16">
                            <div>
                                <h2 className="text-4xl font-black tracking-tight text-on-surface mb-2">
                                    La puerta al cambio
                                </h2>
                                <p className="text-on-surface-variant">
                                    Nuestros programas de certificación insignia
                                </p>
                            </div>
                            <Link
                                href="/courses"
                                className="text-secondary font-bold hover:underline flex items-center gap-2"
                            >
                                Explorar Todos
                                <MaterialIcon name="arrow_forward" />
                            </Link>
                        </div>

                        {featuredCourses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {featuredCourses.map((course) => (
                                    <FeaturedCourseCard
                                        key={course.id}
                                        id={course.id}
                                        title={course.title}
                                        thumbnail={course.thumbnail}
                                        price={course.price}
                                        published={course.published}
                                        moduleCount={course._count.modules}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="glass rounded-xl p-16 text-center border border-outline-variant/10">
                                <MaterialIcon name="school" size="text-5xl" className="text-secondary mb-4" />
                                <h3 className="text-xl font-bold text-on-surface mb-2">Próximamente</h3>
                                <p className="text-on-surface-variant">
                                    Estamos preparando cursos exclusivos para ti. ¡Vuelve pronto!
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Social Proof Stats ──────────────────────── */}
                <section className="relative py-32 px-8 max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:flex md:flex-nowrap justify-center gap-8 md:gap-16">
                        {[
                            { value: '+100', label: 'Estudiantes certificados' },
                            { value: '+100h', label: 'De estudio' },
                            { value: '95%', label: 'Completación' },
                            { value: '+450.000€', label: 'Generados por los cursos' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl sm:text-5xl md:text-7xl font-black text-secondary mb-2 whitespace-nowrap">
                                    {stat.value}
                                </div>
                                <div className="uppercase tracking-widest text-on-surface-variant text-sm">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Testimonials ────────────────────────────── */}
                <section id="testimonials" className="relative py-24 px-8 bg-surface-container-low/40 backdrop-blur-sm overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-4xl font-black text-center mb-16 text-on-surface">
                            TESTIMONIOS ALUMNOS
                        </h2>
                        <div className="flex justify-center gap-6 flex-wrap">
                            {['/testimonio-1-p1-opt.mp4', '/testimonio-1-p2-opt.mp4'].map((src) => (
                                <div
                                    key={src}
                                    className="w-[300px] aspect-[9/16] rounded-2xl overflow-hidden border border-outline-variant/10 bg-surface-container"
                                >
                                    <video
                                        controls
                                        preload="auto"
                                        playsInline
                                        className="w-full h-full object-cover"
                                    >
                                        <source src={src} type="video/mp4" />
                                    </video>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ──────────────────────────────── */}
                <section className="relative py-32 px-8">
                    <div className="max-w-5xl mx-auto glass p-16 rounded-xl text-center border border-secondary-container/20">
                        <h2 className="text-5xl font-black text-on-surface mb-6">
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
                                href="/register"
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
            <footer className="relative z-10 bg-[#0e131e]/80 backdrop-blur-sm border-t border-white/5 py-16 px-8">
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
