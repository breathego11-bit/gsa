import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface VideoPlaceholderProps {
    videoUrl?: string | null
    thumbnail?: string | null
    title?: string
}

export function VideoPlaceholder({ videoUrl, thumbnail, title }: VideoPlaceholderProps) {
    // Future: render <iframe> for YouTube/Vimeo/Wistia when videoUrl is set
    return (
        <div
            className="relative w-full aspect-video rounded-3xl overflow-hidden flex items-center justify-center bg-surface-container-lowest group"
            style={{
                background: thumbnail
                    ? `url(${thumbnail}) center/cover`
                    : undefined,
            }}
        >
            {thumbnail && (
                <div className="absolute inset-0 bg-black/50" />
            )}

            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex flex-col items-center gap-4 text-center px-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 transition-transform group-hover:scale-110 cursor-pointer">
                    <MaterialIcon name="play_arrow" size="text-4xl" className="text-white ml-1" />
                </div>
                {videoUrl ? (
                    <p className="text-sm font-medium text-on-surface-variant">
                        Reproducción de video próximamente
                    </p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-on-surface">
                            Video no disponible aún
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            El contenido de esta lección estará disponible pronto
                        </p>
                    </>
                )}
                {title && (
                    <p className="text-xs text-on-surface-variant mt-1">{title}</p>
                )}
            </div>
        </div>
    )
}
