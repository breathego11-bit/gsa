import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCode, GOOGLE_SCOPES } from '@/lib/calendar/google'
import { verifyState } from '@/lib/calendar/state'
import { encryptToken } from '@/lib/calendar/crypto'

export const dynamic = 'force-dynamic'

/**
 * Callback OAuth de Google. Valida el `state`, intercambia el code por tokens,
 * y hace upsert de la CalendarConnection (refresh_token cifrado). Conectar con éxito
 * marca al miembro como bookable (`lead_booking_enabled = true`).
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams
    const back = (status: string) => NextResponse.redirect(new URL(`/admin/leads?google=${status}`, req.url))

    const error = sp.get('error')
    if (error) return back('denied')

    const code = sp.get('code')
    const state = sp.get('state')
    if (!code || !state) return back('error')

    const valid = verifyState(state)
    if (!valid) return back('badstate')

    try {
        const tokens = await exchangeCode(code)
        // Sin refresh_token no podemos crear eventos a futuro. prompt=consent debería forzarlo;
        // si Google no lo devuelve, hay que revocar el acceso previo y reconectar.
        if (!tokens.refresh_token) return back('norefresh')

        const enc = {
            refresh_token: encryptToken(tokens.refresh_token),
            access_token: tokens.access_token ? encryptToken(tokens.access_token) : null,
            token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            account_email: tokens.account_email ?? '',
            scopes: tokens.scope ?? GOOGLE_SCOPES.join(' '),
            status: 'active',
        }

        await prisma.calendarConnection.upsert({
            where: { user_id_provider: { user_id: valid.userId, provider: 'GOOGLE' } },
            create: { user_id: valid.userId, provider: 'GOOGLE', calendar_id: 'primary', ...enc },
            update: enc,
        })

        // Conectar = entrar al pool de miembros bookables.
        await prisma.user.update({ where: { id: valid.userId }, data: { lead_booking_enabled: true } })

        return back('connected')
    } catch {
        return back('error')
    }
}
