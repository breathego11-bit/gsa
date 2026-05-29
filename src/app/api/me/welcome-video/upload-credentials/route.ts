import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateTusUploadCredentials, getBunnyThumbnailUrl } from '@/lib/bunny'

/**
 * Generates Bunny Stream TUS upload credentials for the current user's welcome video.
 * Open to any authenticated student (not admin-gated like the lesson upload endpoint).
 */
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const title = `welcome · ${session.user.id}`
        const creds = await generateTusUploadCredentials(title)
        return NextResponse.json({
            ...creds,
            thumbnail_url: getBunnyThumbnailUrl(creds.videoId),
        })
    } catch (error) {
        console.error('Bunny auth error (welcome video):', error)
        return NextResponse.json({ error: 'Error al generar credenciales de subida' }, { status: 500 })
    }
}
