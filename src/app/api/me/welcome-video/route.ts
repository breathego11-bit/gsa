import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Save the Bunny video id and status for the current user's welcome video.
 * Called after the TUS upload completes (status='processing') and again when Bunny
 * finishes transcoding (status='ready').
 */
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const bunnyId = typeof body.bunny_video_id === 'string' ? body.bunny_video_id.trim() : null
        const status = typeof body.status === 'string' ? body.status : null

        if (!bunnyId) {
            return NextResponse.json({ error: 'bunny_video_id requerido' }, { status: 400 })
        }
        if (status && !['processing', 'ready', 'failed'].includes(status)) {
            return NextResponse.json({ error: 'status inválido' }, { status: 400 })
        }

        const data: Record<string, unknown> = {
            welcome_video_bunny_id: bunnyId,
            welcome_video_uploaded_at: new Date(),
            welcome_video_snoozed_until: null,
        }
        if (status) data.welcome_video_status = status

        await prisma.user.update({
            where: { id: session.user.id },
            data,
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('welcome-video PATCH error:', error)
        return NextResponse.json({ error: 'Error al guardar el video' }, { status: 500 })
    }
}
