import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Snooze the dashboard welcome-video reminder for 24 hours. */
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const until = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.user.update({
        where: { id: session.user.id },
        data: { welcome_video_snoozed_until: until },
    })

    return NextResponse.json({ success: true, snoozed_until: until.toISOString() })
}
