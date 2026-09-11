import type { AgendaEventRaw } from './google'
import { zonedWallTimeToUtc, localParts } from './tz'
import { parseWorkingHours, toMinutes, WEEKDAYS } from './working-hours'

/**
 * Modelo de la semana que pinta la agenda de /admin/agenda — la parte PURA.
 *
 * Separado del cargador (`agenda.ts`) porque la rejilla, que corre en el navegador, necesita sus
 * tipos y `MIN_VISUAL_MIN`; y `agenda.ts` importa Prisma y googleapis, que no pueden llegar al
 * bundle del cliente. El import de `./google` es solo de tipo y se borra al compilar.
 *
 * Todo se calcula en la ZONA DE RESERVA del miembro (`booking_timezone`), no en la del navegador:
 * es la zona en la que se interpretan sus horarios, y si los eventos se pintaran en otra el
 * sombreado de "horario para leads" y los eventos no cuadrarían.
 */

const DAY_MS = 86_400_000

/**
 * Altura mínima con la que se pinta un evento, en minutos. Un evento de 5 minutos dibujado a su
 * tamaño real sería ilegible, así que la rejilla le da este mínimo — y el reparto de columnas debe
 * usar el mismo valor, o dos eventos cortos seguidos se pintarían uno encima del otro.
 */
export const MIN_VISUAL_MIN = 20

export interface AgendaSegment {
    id: string
    title: string
    startMin: number
    endMin: number
    /** Columna dentro de un grupo de eventos que se solapan, y cuántas columnas tiene el grupo. */
    col: number
    cols: number
    busy: boolean
    leadId: string | null
    htmlLink: string
    /** Hora del evento COMPLETO, aunque este tramo sea solo la parte de un día. */
    timeLabel: string
}

export interface AgendaAllDay {
    id: string
    title: string
    busy: boolean
    leadId: string | null
    htmlLink: string
}

export interface AgendaDay {
    ymd: string
    label: string
    isToday: boolean
    segments: AgendaSegment[]
    allDay: AgendaAllDay[]
    /** Tramos del horario de atención de ese día, en minutos desde medianoche. */
    windows: [number, number][]
}

export interface AgendaWeek {
    tz: string
    weekStart: string
    prevWeek: string
    nextWeek: string
    rangeLabel: string
    days: AgendaDay[]
    /** Franja horaria visible en la rejilla. */
    startMin: number
    endMin: number
}

export type AgendaStatus = 'ok' | 'not-connected' | 'connection-error' | 'google-error'

// ---------------------------------------------------------------------------------------------
// Fechas (anclaje al mediodía UTC: sumar días sobre medianoche puede cruzar un cambio de hora)
// ---------------------------------------------------------------------------------------------

function ymdToUtcNoon(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number)
    return Date.UTC(y, m - 1, d, 12)
}

function utcNoonToYmd(ms: number): string {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function addDays(ymd: string, n: number): string {
    return utcNoonToYmd(ymdToUtcNoon(ymd) + n * DAY_MS)
}

/** Lunes de la semana que contiene `ymd`. */
export function mondayOf(ymd: string): string {
    const weekday = new Date(ymdToUtcNoon(ymd)).getUTCDay() // 0 = domingo
    return addDays(ymd, -((weekday + 6) % 7))
}

export function isValidYmd(s: unknown): s is string {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    return utcNoonToYmd(ymdToUtcNoon(s)) === s // descarta 2026-02-31 y similares
}

export function ymdInZone(date: Date, tz: string): string {
    const p = localParts(date, tz)
    return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

export function midnightUtc(ymd: string, tz: string): Date {
    const [y, m, d] = ymd.split('-').map(Number)
    return zonedWallTimeToUtc(y, m, d, 0, 0, tz)
}

/**
 * Minutos de pared desde medianoche. Se usa la hora de pared y no los milisegundos transcurridos:
 * el día de un cambio de hora dura 23 o 25 horas, y contar milisegundos desplazaría una hora todo
 * lo que venga después del cambio.
 */
function wallMinutes(date: Date, tz: string): number {
    const p = localParts(date, tz)
    return p.h * 60 + p.mi
}

function hhmm(date: Date, tz: string): string {
    const p = localParts(date, tz)
    return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------------------------
// Reparto de columnas para eventos que se solapan
// ---------------------------------------------------------------------------------------------

/**
 * Coloca en columnas los eventos que se pisan, como hace cualquier calendario.
 *
 * Los eventos se agrupan en "racimos" de solape transitivo; dentro de cada racimo cada evento ocupa
 * la primera columna que ya esté libre a su hora de inicio. Todos los del racimo comparten el mismo
 * número de columnas, para que tengan el mismo ancho.
 */
export function layoutColumns<T extends { startMin: number; endMin: number }>(
    items: T[],
): (T & { col: number; cols: number })[] {
    const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
    const out: (T & { col: number; cols: number })[] = []

    let cluster: { item: T; col: number }[] = []
    let colEnds: number[] = []
    let clusterEnd = -Infinity

    const flush = () => {
        for (const { item, col } of cluster) out.push({ ...item, col, cols: colEnds.length })
        cluster = []
        colEnds = []
        clusterEnd = -Infinity
    }

    for (const item of sorted) {
        const visualEnd = Math.max(item.endMin, item.startMin + MIN_VISUAL_MIN)
        if (cluster.length > 0 && item.startMin >= clusterEnd) flush()
        let col = colEnds.findIndex((end) => end <= item.startMin)
        if (col === -1) {
            col = colEnds.length
            colEnds.push(visualEnd)
        } else {
            colEnds[col] = visualEnd
        }
        cluster.push({ item, col })
        clusterEnd = Math.max(clusterEnd, visualEnd)
    }
    flush()
    return out
}

// ---------------------------------------------------------------------------------------------
// Construcción de la semana (pura: se le pasan los eventos ya leídos)
// ---------------------------------------------------------------------------------------------

export interface BuildWeekInput {
    events: AgendaEventRaw[]
    tz: string
    weekStart: string
    todayYmd: string
    workingHours: unknown
    leadByEventId: Map<string, string>
}

export function buildWeek(input: BuildWeekInput): AgendaWeek {
    const { events, tz, weekStart, todayYmd, leadByEventId } = input
    const wh = parseWorkingHours(input.workingHours)

    const days: AgendaDay[] = []
    for (let i = 0; i < 7; i++) {
        const ymd = addDays(weekStart, i)
        const dayStart = midnightUtc(ymd, tz).getTime()
        const dayEnd = midnightUtc(addDays(ymd, 1), tz).getTime()
        const weekdayKey = String(new Date(ymdToUtcNoon(ymd)).getUTCDay())

        const raw: Omit<AgendaSegment, 'col' | 'cols'>[] = []
        const allDay: AgendaAllDay[] = []

        for (const ev of events) {
            const leadId = leadByEventId.get(ev.id) ?? null
            if (ev.allDay) {
                // En Google el fin de un evento de día completo es EXCLUSIVO: 8→9 es solo el día 8.
                if (ev.start <= ymd && ymd < ev.end) {
                    allDay.push({ id: ev.id, title: ev.title, busy: ev.busy, leadId, htmlLink: ev.htmlLink })
                }
                continue
            }
            const s = Date.parse(ev.start)
            const e = Date.parse(ev.end)
            if (!Number.isFinite(s) || !Number.isFinite(e)) continue

            // Tramo del evento que cae dentro de este día. Un evento que cruza la medianoche se
            // parte en un tramo por día; uno de duración cero se conserva (se pinta con altura mínima).
            const from = Math.max(s, dayStart)
            const to = Math.min(Math.max(e, s), dayEnd)
            const zeroLength = e <= s
            if (zeroLength ? !(s >= dayStart && s < dayEnd) : to <= from) continue

            const startMin = from === dayStart ? 0 : wallMinutes(new Date(from), tz)
            const endMin = to === dayEnd ? 24 * 60 : wallMinutes(new Date(to), tz)

            raw.push({
                id: ev.id,
                title: ev.title,
                startMin,
                // En la madrugada que se atrasa el reloj la hora de pared retrocede: nunca por debajo del inicio.
                endMin: Math.max(endMin, startMin),
                busy: ev.busy,
                leadId,
                htmlLink: ev.htmlLink,
                timeLabel: `${hhmm(new Date(s), tz)}–${hhmm(new Date(Math.max(e, s)), tz)}`,
            })
        }

        const windows: [number, number][] = []
        for (const [a, b] of wh[weekdayKey] ?? []) {
            const start = toMinutes(a)
            const end = toMinutes(b)
            if (start !== null && end !== null && end > start) windows.push([start, end])
        }

        const weekdayShort = WEEKDAYS.find((w) => w.key === weekdayKey)?.short ?? ''
        days.push({
            ymd,
            label: `${weekdayShort} ${Number(ymd.slice(8, 10))}`,
            isToday: ymd === todayYmd,
            segments: layoutColumns(raw),
            allDay,
            windows,
        })
    }

    // Franja visible: 07:00–19:00 como mínimo, ampliada si hay horario o eventos fuera de ella.
    let startMin = 7 * 60
    let endMin = 19 * 60
    for (const d of days) {
        for (const [a, b] of d.windows) {
            startMin = Math.min(startMin, a)
            endMin = Math.max(endMin, b)
        }
        for (const seg of d.segments) {
            startMin = Math.min(startMin, seg.startMin)
            endMin = Math.max(endMin, Math.max(seg.endMin, seg.startMin + MIN_VISUAL_MIN))
        }
    }
    startMin = Math.max(0, Math.floor(startMin / 60) * 60)
    endMin = Math.min(24 * 60, Math.ceil(endMin / 60) * 60)

    return {
        tz,
        weekStart,
        prevWeek: addDays(weekStart, -7),
        nextWeek: addDays(weekStart, 7),
        rangeLabel: formatRange(weekStart, addDays(weekStart, 6)),
        days,
        startMin,
        endMin,
    }
}

function formatRange(from: string, to: string): string {
    const fmt = (ymd: string, opts: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...opts }).format(new Date(ymdToUtcNoon(ymd)))
    const sameMonth = from.slice(0, 7) === to.slice(0, 7)
    return sameMonth
        ? `${Number(from.slice(8, 10))} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ---------------------------------------------------------------------------------------------
// Métricas de reuniones con leads (hoy / esta semana / este mes)
// ---------------------------------------------------------------------------------------------

export interface MeetingStatRanges {
    day: [Date, Date]
    week: [Date, Date]
    month: [Date, Date]
    /** Nombre del mes en curso, para la etiqueta ("septiembre"). */
    monthLabel: string
}

/**
 * Límites de hoy, esta semana (lunes a domingo) y este mes, en la zona del miembro.
 *
 * Son los de AHORA, no los de la semana que se esté mirando en la agenda: "hoy" siempre es hoy, y
 * que la métrica semanal cambiara al navegar mientras la de hoy se queda fija confundiría.
 */
export function meetingStatRanges(now: Date, tz: string): MeetingStatRanges {
    const today = ymdInZone(now, tz)
    const monday = mondayOf(today)
    const [y, m] = today.split('-').map(Number)
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
    const nextMonthStart = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(
        new Date(Date.UTC(y, m - 1, 15, 12)),
    )
    return {
        day: [midnightUtc(today, tz), midnightUtc(addDays(today, 1), tz)],
        week: [midnightUtc(monday, tz), midnightUtc(addDays(monday, 7), tz)],
        month: [midnightUtc(monthStart, tz), midnightUtc(nextMonthStart, tz)],
        monthLabel,
    }
}

export interface MeetingCount {
    /** Reuniones en el periodo, incluidas las que ya pasaron. */
    total: number
    /** Las que aún están por delante. */
    upcoming: number
}

export interface MeetingStats {
    day: MeetingCount & { next: { time: string; name: string } | null }
    week: MeetingCount
    month: MeetingCount
    monthLabel: string
}

/**
 * Cuenta las reuniones con leads de cada periodo.
 *
 * Recibe una sola lista que cubre la unión de semana y mes: la semana puede empezar en el mes
 * anterior (el 1 de septiembre de 2026 es martes, así que esa semana arranca el 31 de agosto), y
 * con una sola consulta a la base alcanza para los tres números.
 */
export function summarizeMeetings(
    meetings: { at: Date; name: string }[],
    ranges: MeetingStatRanges,
    now: Date,
    tz: string,
): MeetingStats {
    const count = ([from, to]: [Date, Date]): MeetingCount => {
        const inRange = meetings.filter((mt) => mt.at >= from && mt.at < to)
        return { total: inRange.length, upcoming: inRange.filter((mt) => mt.at >= now).length }
    }

    const [dayFrom, dayTo] = ranges.day
    const nextToday = meetings
        .filter((mt) => mt.at >= now && mt.at >= dayFrom && mt.at < dayTo)
        .sort((a, b) => a.at.getTime() - b.at.getTime())[0]

    return {
        day: {
            ...count(ranges.day),
            next: nextToday ? { time: hhmm(nextToday.at, tz), name: nextToday.name } : null,
        },
        week: count(ranges.week),
        month: count(ranges.month),
        monthLabel: ranges.monthLabel,
    }
}
