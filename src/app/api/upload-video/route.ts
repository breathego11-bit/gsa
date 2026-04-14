import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createBunnyVideo, uploadToBunny, getBunnyThumbnailUrl } from '@/lib/bunny'

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export const maxDuration = 600 // 10 minutes timeout

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const title = (formData.get('title') as string) || 'Video'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de archivo no permitido. Usa videos MP4, WebM o MOV.' },
                { status: 400 },
            )
        }

        // Create video entry in Bunny
        const { guid } = await createBunnyVideo(title)

        // Upload file to Bunny
        const buffer = Buffer.from(await file.arrayBuffer())
        await uploadToBunny(guid, buffer)

        return NextResponse.json({
            bunny_video_id: guid,
            thumbnail_url: getBunnyThumbnailUrl(guid),
        })
    } catch (error) {
        console.error('Bunny upload error:', error)
        return NextResponse.json({ error: 'Error al subir video a Bunny Stream' }, { status: 500 })
    }
}
