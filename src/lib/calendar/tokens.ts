import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { encryptToken, decryptToken, tryDecryptToken } from './crypto'
import { authorizedClient, type CalendarAuthClient } from './google'

/**
 * Puente entre las `CalendarConnection` (tokens cifrados en BD) y el cliente Google.
 * Refresca y persiste el access_token de forma transparente.
 */

export type ConnRecord = Prisma.CalendarConnectionGetPayload<{
    include: {
        user: {
            select: {
                id: true
                name: true
                last_name: true
                booking_timezone: true
                working_hours: true
            }
        }
    }
}>

/** Pool de miembros bookables: lead_booking_enabled + conexión activa. */
export function loadBookableConnections(): Promise<ConnRecord[]> {
    return prisma.calendarConnection.findMany({
        where: {
            status: 'active',
            provider: 'GOOGLE',
            user: { lead_booking_enabled: true },
        },
        include: {
            user: {
                select: { id: true, name: true, last_name: true, booking_timezone: true, working_hours: true },
            },
        },
    })
}

/**
 * OAuth2Client autorizado para una conexión. Escucha el evento `tokens` para persistir
 * (cifrado) el access_token cuando googleapis lo refresca automáticamente.
 */
export async function clientForConnection(conn: {
    id: string
    refresh_token: string
    access_token: string | null
    token_expiry: Date | null
}): Promise<CalendarAuthClient> {
    const refresh = decryptToken(conn.refresh_token)
    const access = tryDecryptToken(conn.access_token)
    const client = authorizedClient(refresh, access, conn.token_expiry ? conn.token_expiry.getTime() : null)

    client.on('tokens', (tokens) => {
        const data: Prisma.CalendarConnectionUpdateInput = {}
        if (tokens.access_token) data.access_token = encryptToken(tokens.access_token)
        if (tokens.expiry_date) data.token_expiry = new Date(tokens.expiry_date)
        if (tokens.refresh_token) data.refresh_token = encryptToken(tokens.refresh_token)
        if (Object.keys(data).length > 0) {
            prisma.calendarConnection.update({ where: { id: conn.id }, data }).catch(() => {
                /* persistencia best-effort; el refresh sigue válido en memoria */
            })
        }
    })

    return client
}

/** Marca la conexión como 'error' (token revocado/expirado) para excluirla del pool. */
export async function markConnectionError(id: string): Promise<void> {
    await prisma.calendarConnection.update({ where: { id }, data: { status: 'error' } }).catch(() => {})
}
