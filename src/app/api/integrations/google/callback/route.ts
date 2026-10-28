import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exchangeCode, GOOGLE_SCOPES } from '@/lib/calendar/google'
import { verifyState } from '@/lib/calendar/state'
import { encryptToken } from '@/lib/calendar/crypto'
import { isCloser } from '@/lib/access'
import type { CloserType } from '@prisma/client'

/**
 * Adónde se vuelve tras el consentimiento: cada rol tiene su propia pantalla de calendario.
 * Mandar siempre a `/admin/leads` dejaba al closer en la pantalla de login (todo `/admin` es solo
 * para admins), así que parecía que la conexión había fallado cuando en realidad ya estaba hecha.
 */
function landingFor(u: { role: string; closer_enabled?: boolean; closer_type?: CloserType | null }): string {
    if (u.role === 'ADMIN') return '/admin/leads'
    return isCloser({ closer_enabled: u.closer_enabled ?? false, closer_type: u.closer_type ?? null })
        ? '/dashboard/agenda'
        : '/dashboard'
}

export const dynamic = 'force-dynamic'

/**
 * Callback OAuth de Google. Valida el `state`, intercambia el code por tokens,
 * y hace upsert de la CalendarConnection (refresh_token cifrado). Conectar pone el calendario a
 * disposición del reparto (`lead_booking_enabled = true`) para cualquier rol, como siempre: a un
 * closer eso no le trae leads hasta que un admin lo autorice (`lead_booking_authorized`, ver
 * `pool.ts`).
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams
    // Base pública para el redirect: detrás de Caddy, req.url trae la dirección interna
    // del contenedor (0.0.0.0:3000), así que usamos NEXTAUTH_URL (el dominio real).
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin

    /*
     * El destino sale de la sesión del navegador, que existe aunque el `state` venga caducado o
     * manipulado: así hasta el aviso de "enlace no válido" llega a la pantalla de cada rol. Antes
     * salía del `state`, y con uno inválido el closer acababa en /admin/leads → rebotado → sin aviso.
     * Si por lo que sea no hay sesión, se vuelve a la pantalla del admin, como siempre.
     */
    let dest = '/admin/leads'
    try {
        const session = await getServerSession(authOptions)
        if (session) dest = landingFor(session.user)
    } catch {
        /* sin sesión legible: se queda el destino por defecto */
    }
    const back = (status: string) => NextResponse.redirect(new URL(`${dest}?google=${status}`, baseUrl))

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

        // Calendario disponible para el reparto. Que le lleguen leads depende además de ser admin o
        // closer autorizado (POOL_MEMBER_WHERE).
        await prisma.user.update({ where: { id: valid.userId }, data: { lead_booking_enabled: true } })

        return back('connected')
    } catch {
        return back('error')
    }
}
