'use client'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface BunnyVideoPreviewProps {
    videoId: string
    status?: string | null
    thumbnail?: string | null
}

export function BunnyVideoPreview({ videoId, status, thumbnail }: BunnyVideoPreviewProps) {
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID

    if (!libraryId) return null

    if (status === 'processing') {
        return (
            <div
                className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-surface-container-lowest flex items-center justify-center"
                style={{ background: thumbnail ? `url(${thumbnail}) center/cover` : undefined }}
            >
                {thumbnail && <div className="absolute inset-0 bg-black/60" />}
                <div className="relative flex flex-col items-center gap-2 text-center px-4">
                    <MaterialIcon name="hourglass_empty" size="text-2xl" className="text-white/80 animate-spin" />
                    <p className="text-xs font-medium text-on-surface">Procesando…</p>
                    <p className="text-[10px] text-on-surface-variant">Bunny está optimizando el video.</p>
                </div>
            </div>
        )
    }

    if (status === 'failed') {
        return (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-red-500/30 bg-red-500/5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <MaterialIcon name="error_outline" size="text-2xl" className="text-red-400" />
                    <p className="text-xs font-medium text-red-300">Error al procesar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-black">
            <iframe
                src={`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&preload=false&responsive=true`}
                loading="lazy"
                className="w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
            />
        </div>
    )
}
