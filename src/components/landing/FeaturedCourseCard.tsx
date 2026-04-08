import Link from 'next/link'

interface FeaturedCourseCardProps {
    id: string
    title: string
    thumbnail: string | null
    published: boolean
    moduleCount: number
}

export function FeaturedCourseCard({
    id,
    title,
    thumbnail,
    published,
    moduleCount,
}: FeaturedCourseCardProps) {
    return (
        <div className="group bg-surface-container rounded-xl overflow-hidden hover:translate-y-[-8px] transition-all duration-300">
            {/* Thumbnail */}
            <div
                className="h-48 bg-cover bg-center bg-surface-container-high"
                style={thumbnail ? { backgroundImage: `url('${thumbnail}')` } : undefined}
            >
                <div className="p-4 flex justify-between">
                    <span
                        className={`backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            published
                                ? 'bg-secondary-container/80 text-on-secondary-container'
                                : 'bg-tertiary-container/80 text-on-tertiary-container'
                        }`}
                    >
                        {published ? 'Publicado' : 'Próximamente'}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <h4 className="text-xl font-bold text-on-surface mb-2">{title}</h4>
                <p className="text-sm text-on-surface-variant mb-4">
                    {moduleCount} {moduleCount === 1 ? 'módulo' : 'módulos'}
                </p>

                {/* Decorative progress bar */}
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full mb-6">
                    <div className="bg-secondary h-1.5 rounded-full" style={{ width: '0%' }} />
                </div>

                <div className="flex justify-end items-center">
                    <Link
                        href={`/course/${id}`}
                        className="bg-white/5 hover:bg-white/10 text-on-surface px-4 py-2 rounded-lg font-bold transition-all text-sm"
                    >
                        Detalles
                    </Link>
                </div>
            </div>
        </div>
    )
}
