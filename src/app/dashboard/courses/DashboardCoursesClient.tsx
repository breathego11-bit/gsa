'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
    CourseCardRedesigned,
    type CourseCardData,
} from '@/components/landing/CourseCardRedesigned'
import { EnrollButton } from '@/components/courses/EnrollButton'

export interface DashboardCourseData {
    id: string
    title: string
    description: string
    thumbnail: string | null
    hero_image: string | null
    published: boolean
    created_at: string
    tagline: string | null
    tier: string | null
    level: string | null
    duration: string | null
    year: string | null
    hue: number | null
    accent: string | null
    trajectory: string | null
    included_items: string[] | null
    modules: { id: string; title: string; order: number }[]
    moduleCount: number
    lessonCount: number
    totalDurationMinutes: number
    isEnrolled: boolean
    progressPercent: number
    progressCompleted: number
    installmentLocked: boolean
    unlockAtInstallment: number
}

interface Props {
    courses: DashboardCourseData[]
    hasPaid: boolean
}

const filters = [
    { key: 'Todos', label: 'Todos los Cursos' },
    { key: 'Inscritos', label: 'Inscritos' },
    { key: 'Disponibles', label: 'Disponibles' },
]

function toCardData(c: DashboardCourseData): CourseCardData {
    return {
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
        moduleCount: c.moduleCount,
        included_items: c.included_items,
    }
}

export function DashboardCoursesClient({ courses, hasPaid }: Props) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState('Todos')
    const debouncedSearch = useDebounce(searchQuery, 300)

    const filteredCourses = courses.filter((course) => {
        const matchesSearch =
            !debouncedSearch ||
            course.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            course.description.toLowerCase().includes(debouncedSearch.toLowerCase())

        const matchesFilter =
            activeFilter === 'Todos' ||
            (activeFilter === 'Inscritos' && course.isEnrolled) ||
            (activeFilter === 'Disponibles' && !course.isEnrolled)

        return matchesSearch && matchesFilter
    })

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <span className="uppercase tracking-[0.1em] text-[12px] font-bold text-secondary mb-2 block">
                    Catálogo
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                    Explorar Cursos
                </h1>
                <p className="text-on-surface-variant text-sm">
                    Descubre los programas disponibles y continúa tu formación.
                </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2.5 border border-outline-variant/15 w-full sm:w-80">
                    <MaterialIcon name="search" size="text-lg" className="text-on-surface-variant" />
                    <input
                        className="bg-transparent border-none text-sm focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 w-full outline-none ml-2"
                        placeholder="Buscar cursos..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            <MaterialIcon name="close" size="text-lg" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                                activeFilter === filter.key
                                    ? 'bg-secondary-container text-on-secondary-container'
                                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
                <div className="glass rounded-xl p-16 text-center border border-outline-variant/10">
                    <MaterialIcon name="search_off" size="text-5xl" className="text-on-surface-variant mb-4" />
                    <h3 className="text-xl font-bold text-on-surface mb-2">No se encontraron cursos</h3>
                    <p className="text-on-surface-variant text-sm mb-6">
                        Intenta con otra búsqueda o cambia los filtros.
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('')
                            setActiveFilter('Todos')
                        }}
                        className="inline-flex items-center gap-2 text-secondary text-sm font-semibold hover:underline"
                    >
                        <MaterialIcon name="refresh" size="text-sm" />
                        Limpiar filtros
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredCourses.map((course, idx) => {
                        const cardData = toCardData(course)

                        // Curso en un tramo aún no pagado → tarjeta con candado, no clicable.
                        if (course.installmentLocked) {
                            return (
                                <CourseCardRedesigned
                                    key={course.id}
                                    course={cardData}
                                    index={idx}
                                    customCta={
                                        <div
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold cursor-not-allowed"
                                            style={{
                                                background: 'rgba(251,191,36,0.10)',
                                                border: '1px solid rgba(251,191,36,0.35)',
                                                color: '#fbbf24',
                                            }}
                                        >
                                            <MaterialIcon name="lock" size="text-sm" />
                                            Disponible al pagar la cuota {course.unlockAtInstallment}
                                        </div>
                                    }
                                />
                            )
                        }

                        if (course.isEnrolled) {
                            const ctaLabel =
                                course.progressPercent === 100
                                    ? 'Repasar curso'
                                    : course.progressPercent === 0
                                        ? 'Empezar curso'
                                        : 'Continuar curso'
                            return (
                                <CourseCardRedesigned
                                    key={course.id}
                                    course={cardData}
                                    index={idx}
                                    ctaHref={`/dashboard/courses/${course.id}`}
                                    ctaLabel={ctaLabel}
                                    progress={
                                        course.lessonCount > 0
                                            ? {
                                                percent: course.progressPercent,
                                                completed: course.progressCompleted,
                                                total: course.lessonCount,
                                            }
                                            : undefined
                                    }
                                />
                            )
                        }

                        return (
                            <CourseCardRedesigned
                                key={course.id}
                                course={cardData}
                                index={idx}
                                customCta={
                                    <div className="w-full">
                                        <EnrollButton
                                            courseId={course.id}
                                            isAuthenticated={true}
                                            hasPaid={hasPaid}
                                        />
                                    </div>
                                }
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
                                href="https://wa.me/"
                                target="_blank"
                                className="bg-white text-primary-container px-8 py-4 rounded-full font-bold flex items-center gap-3 w-fit hover:shadow-xl hover:translate-x-2 transition-all"
                            >
                                Agendar Llamada
                                <MaterialIcon name="arrow_forward" size="text-xl" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
