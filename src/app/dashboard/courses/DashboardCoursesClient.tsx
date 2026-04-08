'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { CourseCard } from '@/components/courses/CourseCard'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import Link from 'next/link'

interface CourseData {
    id: string
    title: string
    description: string
    thumbnail: string | null
    lessonCount: number
    totalDurationMinutes: number
    isEnrolled: boolean
}

interface Props {
    courses: CourseData[]
    hasPaid: boolean
}

const filters = [
    { key: 'Todos', label: 'Todos los Cursos' },
    { key: 'Inscritos', label: 'Inscritos' },
    { key: 'Disponibles', label: 'Disponibles' },
]

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map((course) => (
                        <CourseCard
                            key={course.id}
                            id={course.id}
                            title={course.title}
                            description={course.description}
                            thumbnail={course.thumbnail}
                            published={true}
                            lessonCount={course.lessonCount}
                            totalDurationMinutes={course.totalDurationMinutes}
                            isEnrolled={course.isEnrolled}
                            isAuthenticated={true}
                            hasPaid={hasPaid}
                        />
                    ))}

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
