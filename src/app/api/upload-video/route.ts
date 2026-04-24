import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateTusUploadCredentials, getBunnyThumbnailUrl } from '@/lib/bunny'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const { title } = await req.json()
        const creds = await generateTusUploadCredentials(title || 'Video')
        return NextResponse.json({
            ...creds,
            thumbnail_url: getBunnyThumbnailUrl(creds.videoId),
        })
    } catch (error) {
        console.error('Bunny auth error:', error)
        return NextResponse.json({ error: 'Error al generar credenciales de subida' }, { status: 500 })
    }
}
