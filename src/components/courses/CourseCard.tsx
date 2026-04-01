import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { EnrollButton } from '@/components/courses/EnrollButton'

interface CourseCardProps {
    id: string
    title: string
    description: string
    thumbnail: string | null
    price: number | null
    published: boolean
    lessonCount: number
    totalDurationMinutes: number
    isEnrolled: boolean
    isAuthenticated: boolean
}

function formatDuration(minutes: number): string {
    if (minutes <= 0) return '0m'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

const fallbackGradients = [
    'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
    'linear-gradient(135deg, #164e63 0%, #134e4a 100%)',
    'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #1c1917 100%)',
]

export function CourseCard({
    id,
    title,
    description,
    thumbnail,
    price,
    published,
    lessonCount,
    totalDurationMinutes,
    isEnrolled,
    isAuthenticated,
}: CourseCardProps) {
    // Deterministic gradient based on id hash
    const gradientIndex = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % fallbackGradients.length

    return (
        <div className="group flex flex-col glass-card rounded-xl overflow-hidden transition-all duration-500 hover:translate-y-[-8px]">
            {/* Thumbnail */}
            <div className="relative h-56 overflow-hidden">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div
                        className="w-full h-full"
                        style={{ background: fallbackGradients[gradientIndex] }}
                    />
                )}

                {/* Badge */}
                <div className="absolute top-4 left-4 flex gap-2">
                    {isEnrolled ? (
                        <span className="bg-blue-500/20 text-blue-400 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
                            Inscrito
                        </span>
                    ) : published ? (
                        <span className="bg-emerald-500/20 text-emerald-400 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                            Publicado
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-4">
                    <MaterialIcon name="school" size="text-sm" className="text-secondary" />
                    <span className="uppercase tracking-[0.1em] text-[12px] font-bold text-on-surface-variant">
                        Curso
                    </span>
                </div>

                <h3 className="text-xl font-bold text-on-surface mb-3 group-hover:text-secondary transition-colors">
                    {title}
                </h3>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-6">
                    {description}
                </p>

                {/* Footer meta */}
                <div className="mt-auto pt-6 border-t border-outline-variant/15 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                            <MaterialIcon name="menu_book" size="text-lg" />
                            <span className="text-xs font-medium">
                                {lessonCount} {lessonCount === 1 ? 'Lección' : 'Lecciones'}
                            </span>
                        </div>
                        {totalDurationMinutes > 0 && (
                            <div className="flex items-center gap-1.5 text-on-surface-variant">
                                <MaterialIcon name="schedule" size="text-lg" />
                                <span className="text-xs font-medium">
                                    {formatDuration(totalDurationMinutes)}
                                </span>
                            </div>
                        )}
                    </div>
                    {price != null ? (
                        <span className="text-lg font-black text-on-surface">
                            ${price.toLocaleString()}
                        </span>
                    ) : (
                        <span className="text-lg font-black text-on-surface">Gratis</span>
                    )}
                </div>

                {/* CTA */}
                {isEnrolled ? (
                    <Link
                        href={`/course/${id}`}
                        className="mt-6 bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-3 rounded-full font-semibold text-sm text-center flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                    >
                        Continuar Curso
                        <MaterialIcon name="arrow_forward" size="text-sm" />
                    </Link>
                ) : (
                    <div className="mt-6">
                        <EnrollButton courseId={id} isAuthenticated={isAuthenticated} />
                    </div>
                )}
            </div>
        </div>
    )
}
