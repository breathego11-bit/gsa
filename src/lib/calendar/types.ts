/**
 * Tipos de la capa de calendario abstraída.
 *
 * La lógica de disponibilidad/asignación habla contra estos tipos, no contra Google
 * directamente, para que Fase 2 pueda añadir Microsoft (Graph) sin tocar el resto.
 */

/** Resultado de crear un evento (lo que se guarda en el Lead). */
export interface CalendarEventResult {
    id: string
    htmlLink: string
    hangoutLink: string
    startDateTime: string // RFC3339 devuelto por el proveedor
    startTimeZone: string // IANA
}

/** Entrada para crear un evento con videollamada. */
export interface CreateEventInput {
    calendarId: string
    summary: string
    description?: string
    startDateTime: string // RFC3339 con offset (p.ej. 2026-06-20T09:00:00-05:00)
    endDateTime: string // RFC3339 con offset
    timeZone: string // IANA del lead
    attendeeEmail?: string
    requestId: string // idempotencia del createRequest de Meet
}

/** Intervalo ocupado devuelto por free/busy. */
export interface BusyInterval {
    start: string // RFC3339
    end: string
}
