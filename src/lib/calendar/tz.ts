/**
 * Utilidades de zona horaria sin dependencias externas (usa Intl).
 *
 * Resuelven correctamente DST: la disponibilidad de cada miembro se define en horas de
 * pared de su `booking_timezone`, pero se opera con instantes absolutos (UTC).
 */

/** Offset (ms) entre la hora local de `tz` y UTC en el instante `date`. local = utc + offset. */
export function tzOffsetMs(date: Date, tz: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
    const m: Record<string, string> = {}
    for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') m[p.type] = p.value
    let hour = parseInt(m.hour, 10)
    if (hour === 24) hour = 0 // algunos entornos formatean medianoche como 24
    const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, hour, +m.minute, +m.second)
    return asUTC - date.getTime()
}

/**
 * Convierte una hora de pared (Y-M-D H:M en `tz`) al instante UTC correcto.
 * Refina una vez para resolver bordes de DST.
 */
export function zonedWallTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
    const guess = Date.UTC(y, mo - 1, d, h, mi)
    const o1 = tzOffsetMs(new Date(guess), tz)
    let utc = guess - o1
    const o2 = tzOffsetMs(new Date(utc), tz)
    if (o2 !== o1) utc = guess - o2
    return new Date(utc)
}

/** Componentes de la hora local en `tz` para un instante dado. */
export function localParts(date: Date, tz: string): { y: number; mo: number; d: number; h: number; mi: number } {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
    const m: Record<string, string> = {}
    for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') m[p.type] = p.value
    let h = parseInt(m.hour, 10)
    if (h === 24) h = 0
    return { y: +m.year, mo: +m.month, d: +m.day, h, mi: +m.minute }
}

/** Formatea un instante como RFC3339 con el offset numérico de `tz` (2026-06-20T09:00:00-05:00). */
export function toRfc3339InZone(date: Date, tz: string): string {
    const off = tzOffsetMs(date, tz) // local - utc
    const sign = off >= 0 ? '+' : '-'
    const abs = Math.abs(off)
    const oh = String(Math.floor(abs / 3_600_000)).padStart(2, '0')
    const om = String(Math.floor((abs % 3_600_000) / 60_000)).padStart(2, '0')
    const p = localParts(date, tz)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:00${sign}${oh}:${om}`
}
