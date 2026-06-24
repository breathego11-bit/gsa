import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCRM } from '@/lib/access'
import { getAuthUrl } from '@/lib/calendar/google'
import { signState } from '@/lib/calendar/state'

export const dynamic = 'force-dynamic'

/**
 * Inicia la conexión OAuth del Google del miembro logueado.
 * Sesión admin (canAccessCRM) → redirige a Google con `state` firmado.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canAccessCRM(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const url = getAuthUrl(signState(session.user.id))
        return NextResponse.redirect(url)
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
}
