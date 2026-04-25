import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBunnyVideoStatus } from '@/lib/bunny'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { videoId } = await params

    try {
        const { status, encodeProgress, lengthSec } = await getBunnyVideoStatus(videoId)
        return NextResponse.json({ status, encodeProgress, lengthSec })
    } catch (error) {
        console.error('Bunny status error:', error)
        return NextResponse.json({ error: 'Error al consultar estado del video' }, { status: 500 })
    }
}
