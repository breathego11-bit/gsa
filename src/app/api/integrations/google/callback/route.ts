import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCode, GOOGLE_SCOPES } from '@/lib/calendar/google'
import { verifyState } from '@/lib/calendar/state'
import { encryptToken } from '@/lib/calendar/crypto'
import { isCloser } from '@/lib/access'
import { connectionTogglesPool } from '@/lib/calendar/pool'

/**
 * Adónde se vuelve tras el consentimiento: cada rol tiene su propia pantalla de calendario.
 * Mandar siempre a `/admin/leads` dejaba al closer en la pantalla de login (todo `/admin` es solo
 * para admins), así que parecía que la conexión había fallado cuando en realidad ya estaba hecha.
 */
async function landingFor(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, payment_status: true, closer_enabled: true, closer_type: true },
    })
    if (!user) return '/dashboard'
    if (user.role === 'ADMIN') return '/admin/leads'
    return isCloser(user) ? '/dashboard/agenda' : '/dashboard'
}

export const dynamic = 'force-dynamic'

/**
 * Callback OAuth de Google. Valida el `state`, intercambia el code por tokens,
 * y hace upsert de la CalendarConnection (refresh_token cifrado). Conectar con éxito mete a un
 * admin en el reparto (`lead_booking_enabled = true`); a un closer, no (ver `pool.ts`).
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams
    // Base pública para el redirect: detrás de Caddy, req.url trae la dirección interna
    // del contenedor (0.0.0.0:3000), así que usamos NEXTAUTH_URL (el dominio real).
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin

    /*
     * El destino sale del `state`, que es lo único firmado que identifica al usuario. Se resuelve
     * antes que nada para que también los errores (consentimiento cancelado, código ausente)
     * devuelvan a cada uno a su propia pantalla.
     */
    const state = sp.get('state')
    const valid = state ? verifyState(state) : null
    const dest = valid ? await landingFor(valid.userId) : '/admin/leads'
    const back = (status: string) => NextResponse.redirect(new URL(`${dest}?google=${status}`, baseUrl))

    const error = sp.get('error')
    if (error) return back('denied')

    const code = sp.get('code')
    if (!code || !state) return back('error')
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

        /*
         * Conectar mete en el reparto solo a los admins, que se gestionan solos. A un closer lo
         * autoriza un admin desde su ficha: si conectar bastara, cualquier closer se metería él
         * mismo en el reparto con un clic y absorbería los siguientes leads.
         */
        const owner = await prisma.user.findUnique({ where: { id: valid.userId }, select: { role: true } })
        if (owner && connectionTogglesPool(owner.role)) {
            await prisma.user.update({ where: { id: valid.userId }, data: { lead_booking_enabled: true } })
        }

        return back('connected')
    } catch {
        return back('error')
    }
}
