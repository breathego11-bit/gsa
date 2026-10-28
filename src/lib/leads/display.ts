import type { LeadStatus } from '@prisma/client'

/**
 * Presentación de leads compartida por el panel del admin (`/admin/leads`) y el del closer
 * (`/dashboard/leads`). Puro: sin Prisma, para poder usarlo también en componentes de cliente.
 */

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; bg: string; color: string }> = {
    NUEVO: { label: 'Nuevo', bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    CONTACTADO: { label: 'Contactado', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    AGENDADO: { label: 'Agendado', bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    DESCARTADO: { label: 'Descartado', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
}

/* La lista de estados vive en `permissions.ts`, que es la que valida la API: si el selector
 * ofreciera uno que `decideLeadPatch` no acepta, el alumno vería un 400 al elegirlo. Aquí no se
 * reexporta a propósito — este módulo se importa desde componentes de cliente y el runner de los
 * tests no resuelve los alias `@/`. */

/** Avisos tras volver del consentimiento de Google (`?google=...`). */
export const GOOGLE_CONNECT_BANNER: Record<string, { ok: boolean; msg: string }> = {
    connected: { ok: true, msg: 'Google Calendar conectado correctamente.' },
    denied: { ok: false, msg: 'Conexión cancelada.' },
    norefresh: { ok: false, msg: 'Google no devolvió un refresh token. Revocá el acceso previo en tu cuenta de Google y reconectá.' },
    badstate: { ok: false, msg: 'No se pudo validar la solicitud de conexión. Intentá de nuevo.' },
    error: { ok: false, msg: 'No se pudo conectar con Google. Intentá de nuevo.' },
}

/** Fecha corta: "23 oct 2026". */
export function fmtLeadDate(d: Date): string {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Cita en la zona del lead: "23 oct, 15:30". */
export function fmtMeetingShort(d: Date | null, tz: string | null): string {
    if (!d) return '—'
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    try {
        return new Date(d).toLocaleString('es-ES', { ...opts, timeZone: tz ?? undefined })
    } catch {
        return new Date(d).toLocaleString('es-ES', opts)
    }
}

/** Cita completa: "viernes, 23 de octubre de 2026, 15:30". */
export function fmtMeetingLong(d: Date | null, tz?: string | null): string {
    if (!d) return '—'
    const opts: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }
    try {
        return new Date(d).toLocaleString('es-ES', { ...opts, timeZone: tz ?? undefined })
    } catch {
        return new Date(d).toLocaleString('es-ES')
    }
}

/** El WhatsApp llega como texto libre con prefijos y espacios; wa.me solo acepta dígitos. */
export function waLink(raw: string): string {
    return `https://wa.me/${raw.replace(/\D/g, '')}`
}

/** El Instagram se guarda con o sin arroba; aquí siempre con. */
export function igHandle(raw: string): string {
    return raw.startsWith('@') ? raw : `@${raw}`
}

/** Lo mínimo que necesita `sortOwnLeads` para ordenar. */
export interface SortableLead {
    meeting_at: Date | null
    created_at: Date
}

/**
 * Orden de la lista de leads del closer: primero la **próxima** reunión (lo que hay que
 * preparar), después lo que no tiene cita por fecha de llegada, y al final lo ya celebrado de
 * más reciente a más antiguo.
 *
 * No se hace en el `orderBy` de la consulta porque `meeting_at` ascendente a secas deja arriba
 * las reuniones más viejas del año, que es precisamente lo que ya no importa.
 */
export function sortOwnLeads<T extends SortableLead>(leads: T[], now = new Date()): T[] {
    const ms = now.getTime()
    const rank = (l: T) => (!l.meeting_at ? 1 : l.meeting_at.getTime() >= ms ? 0 : 2)
    return [...leads].sort((a, b) => {
        const ra = rank(a)
        const rb = rank(b)
        if (ra !== rb) return ra - rb
        if (ra === 0) return a.meeting_at!.getTime() - b.meeting_at!.getTime()
        if (ra === 2) return b.meeting_at!.getTime() - a.meeting_at!.getTime()
        return b.created_at.getTime() - a.created_at.getTime()
    })
}
