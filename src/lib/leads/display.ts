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

export const LEAD_STATUSES: LeadStatus[] = ['NUEVO', 'CONTACTADO', 'AGENDADO', 'DESCARTADO']

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
