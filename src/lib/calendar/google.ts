import { google } from 'googleapis'
import type { CalendarEventResult, CreateEventInput, BusyInterval } from './types'

/** Cliente OAuth2 tal como lo tipa googleapis (evita el choque entre las dos copias de google-auth-library). */
export type CalendarAuthClient = InstanceType<typeof google.auth.OAuth2>

/**
 * Proveedor Google de la capa de calendario: OAuth client, intercambio de código,
 * creación de eventos (con Meet) y free/busy. No toca la BD (eso vive en tokens.ts).
 */

export const GOOGLE_SCOPES = [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.events', // crear/gestionar eventos (events.insert/get/delete)
    'https://www.googleapis.com/auth/calendar.freebusy', // consultar disponibilidad (freebusy.query) — calendar.events NO alcanza
]

export function oauthClient(): CalendarAuthClient {
    const id = process.env.GOOGLE_OAUTH_CLIENT_ID
    const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI
    if (!id || !secret || !redirect) {
        throw new Error('Google OAuth no configurado (GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI)')
    }
    return new google.auth.OAuth2(id, secret, redirect)
}

export function getAuthUrl(state: string): string {
    return oauthClient().generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // fuerza refresh_token aunque ya haya consentido antes
        scope: GOOGLE_SCOPES,
        include_granted_scopes: true,
        state,
    })
}

export interface ExchangedTokens {
    refresh_token: string | null
    access_token: string | null
    expiry_date: number | null
    scope: string | null
    account_email: string | null
}

export async function exchangeCode(code: string): Promise<ExchangedTokens> {
    const { tokens } = await oauthClient().getToken(code)
    return {
        refresh_token: tokens.refresh_token ?? null,
        access_token: tokens.access_token ?? null,
        expiry_date: tokens.expiry_date ?? null,
        scope: tokens.scope ?? null,
        account_email: tokens.id_token ? emailFromIdToken(tokens.id_token) : null,
    }
}

/** Decodifica el payload del id_token (viene directo del endpoint de Google sobre TLS). */
function emailFromIdToken(idToken: string): string | null {
    try {
        const payload = idToken.split('.')[1]
        const json = Buffer.from(payload, 'base64url').toString('utf8')
        const obj = JSON.parse(json) as { email?: string }
        return obj.email ?? null
    } catch {
        return null
    }
}

/** Cliente autorizado a partir de tokens ya almacenados. googleapis refresca solo si vence. */
export function authorizedClient(
    refreshToken: string,
    accessToken?: string | null,
    expiryDate?: number | null,
): CalendarAuthClient {
    const client = oauthClient()
    client.setCredentials({
        refresh_token: refreshToken,
        access_token: accessToken ?? undefined,
        expiry_date: expiryDate ?? undefined,
    })
    return client
}

export async function createEvent(auth: CalendarAuthClient, input: CreateEventInput): Promise<CalendarEventResult> {
    const calendar = google.calendar({ version: 'v3', auth })
    const { data } = await calendar.events.insert({
        calendarId: input.calendarId,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // invita al lead por email
        requestBody: {
            summary: input.summary,
            description: input.description,
            start: { dateTime: input.startDateTime, timeZone: input.timeZone },
            end: { dateTime: input.endDateTime, timeZone: input.timeZone },
            attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
            conferenceData: {
                createRequest: {
                    requestId: input.requestId,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
        },
    })
    const extractMeet = (ev: typeof data): string =>
        ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ?? ''

    // El Meet se crea de forma ASÍNCRONA: la respuesta del insert puede venir con
    // createRequest.status === 'pending' y sin link. Reintentamos events.get unas pocas veces.
    let meetLink = extractMeet(data)
    let htmlLink = data.htmlLink ?? ''
    const pending = data.conferenceData?.createRequest?.status?.statusCode === 'pending'
    if (data.id && (!meetLink || pending)) {
        for (let i = 0; i < 3 && !meetLink; i++) {
            await new Promise((r) => setTimeout(r, 400))
            const got = await calendar.events.get({
                calendarId: input.calendarId,
                eventId: data.id,
            })
            meetLink = extractMeet(got.data)
            if (got.data.htmlLink) htmlLink = got.data.htmlLink
        }
    }

    return {
        id: data.id ?? '',
        htmlLink,
        hangoutLink: meetLink,
        startDateTime: data.start?.dateTime ?? input.startDateTime,
        startTimeZone: data.start?.timeZone ?? input.timeZone,
    }
}

/** Borra un evento (best-effort cleanup ante carreras de booking). */
export async function deleteEvent(auth: CalendarAuthClient, calendarId: string, eventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' })
}

export async function freeBusy(
    auth: CalendarAuthClient,
    calendarId: string,
    timeMinISO: string,
    timeMaxISO: string,
): Promise<BusyInterval[]> {
    const calendar = google.calendar({ version: 'v3', auth })
    const { data } = await calendar.freebusy.query({
        requestBody: { timeMin: timeMinISO, timeMax: timeMaxISO, items: [{ id: calendarId }] },
    })
    // freebusy.query devuelve 200 aunque el cálculo de un calendario falle: en ese caso
    // pone `errors` y deja `busy` vacío. Fallar cerrado (throw) para NO tratarlo como libre.
    const cal = data.calendars?.[calendarId]
    if (cal?.errors?.length) {
        throw new Error('freebusy_calendar_error:' + cal.errors.map((e) => e.reason).join(','))
    }
    const busy = cal?.busy ?? []
    return busy
        .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
        .map((b) => ({ start: b.start, end: b.end }))
}
