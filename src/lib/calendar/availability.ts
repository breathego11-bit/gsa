import { freeBusy } from './google'
import { clientForConnection, loadBookableConnections, markConnectionError, type ConnRecord } from './tokens'
import { CryptoError } from './crypto'
import { zonedWallTimeToUtc, toRfc3339InZone, localParts } from './tz'

/**
 * Disponibilidad: combina las working hours (per-member, en su booking_timezone) menos
 * su free/busy de Google → slots libres. Un slot se ofrece si ≥1 miembro está libre.
 *
 * La ventana pedida se ancla a los días LOCALES DEL LEAD, pero los slots se generan en la
 * zona de cada MIEMBRO. Para no recortar días de un miembro cuya zona difiere de la del lead,
 * se genera con un rango holgado (±1 día) y se filtra al final por la ventana absoluta del lead.
 */

const DAY_MS = 86_400_000

type Windows = [string, string][]
type WorkingHours = Record<string, Windows>

const DEFAULT_WORKING_HOURS: WorkingHours = {
    '1': [['09:00', '18:00']],
    '2': [['09:00', '18:00']],
    '3': [['09:00', '18:00']],
    '4': [['09:00', '18:00']],
    '5': [['09:00', '18:00']],
}
const MAX_DAYS = 30

function parseWorkingHours(wh: unknown): WorkingHours {
    if (wh && typeof wh === 'object' && !Array.isArray(wh)) return wh as WorkingHours
    return DEFAULT_WORKING_HOURS
}

function hhmmToMinutes(s: string): number {
    const [h, m] = s.split(':').map((x) => parseInt(x, 10))
    return h * 60 + m
}

/** ¿El error es de autenticación (token revocado/expirado)? Solo entonces se banea al miembro. */
function isAuthError(e: unknown): boolean {
    const anyE = e as { response?: { status?: number }; status?: number; code?: number | string; message?: string }
    const status = anyE?.response?.status ?? anyE?.status ?? anyE?.code
    const msg = String(anyE?.message ?? '')
    return status === 401 || /invalid_grant|invalid_token|token has been (expired|revoked)/i.test(msg)
}

/**
 * Reacción a un fallo de free/busy de un miembro: solo un error de auth real marca la conexión
 * como 'error' (la saca del pool). Cripto/transitorio/errores de calendario → se omite SOLO para
 * esta request (fail-closed), sin banear permanentemente.
 */
async function handleMemberError(conn: ConnRecord, e: unknown): Promise<void> {
    if (e instanceof CryptoError) {
        console.error(`calendar: decrypt falló para connection ${conn.id} — revisar CALENDAR_TOKEN_ENC_KEY`)
        return
    }
    if (isAuthError(e)) {
        await markConnectionError(conn.id)
        return
    }
    // transitorio (5xx/429/red) o freebusy_calendar_error → no banear; se reintentará en la próxima request
    console.error(`calendar: free/busy falló (transitorio) para connection ${conn.id}:`, (e as Error)?.message)
}

/**
 * Instantes de inicio candidatos (UTC) según las working hours del miembro, enumerando todos
 * los días locales del miembro en [searchFromUTC, searchToUTC]. SIN recorte: el recorte fino se
 * hace después contra la ventana del lead.
 */
function candidateStarts(conn: ConnRecord, searchFromUTC: Date, searchToUTC: Date, durationMin: number): Date[] {
    const tz = conn.user.booking_timezone
    const wh = parseWorkingHours(conn.user.working_hours)
    const out: Date[] = []
    const start = localParts(searchFromUTC, tz)
    const base0 = Date.UTC(start.y, start.mo - 1, start.d)
    const nDays = Math.ceil((searchToUTC.getTime() - searchFromUTC.getTime()) / DAY_MS) + 2
    for (let i = 0; i < nDays; i++) {
        const day = new Date(base0 + i * DAY_MS)
        const y = day.getUTCFullYear()
        const mo = day.getUTCMonth() + 1
        const d = day.getUTCDate()
        const weekday = day.getUTCDay() // 0=domingo … 6=sábado (independiente de tz)
        for (const [ws, we] of wh[String(weekday)] ?? []) {
            const startMin = hhmmToMinutes(ws)
            const endMin = hhmmToMinutes(we)
            for (let mins = startMin; mins + durationMin <= endMin; mins += durationMin) {
                out.push(zonedWallTimeToUtc(y, mo, d, Math.floor(mins / 60), mins % 60, tz))
            }
        }
    }
    return out
}

function overlapsBusy(startMs: number, endMs: number, intervals: [number, number][]): boolean {
    return intervals.some(([bs, be]) => startMs < be && endMs > bs)
}

export interface AvailabilityOptions {
    fromDate: string // YYYY-MM-DD (interpretado en leadTz)
    days: number
    leadTz: string
    durationMin: number
}

/** Slots ofrecibles como RFC3339 en la zona del lead, ordenados y deduplicados. */
export async function computeAvailability(opts: AvailabilityOptions): Promise<string[]> {
    const { fromDate, leadTz, durationMin } = opts
    const days = Math.min(Math.max(1, Math.floor(opts.days)), MAX_DAYS)

    const [fy, fm, fd] = fromDate.split('-').map((x) => parseInt(x, 10))
    if (!fy || !fm || !fd) return []

    // Ventana real pedida = días locales del lead.
    const startOfFrom = zonedWallTimeToUtc(fy, fm, fd, 0, 0, leadTz)
    const endOfWindow = new Date(startOfFrom.getTime() + days * DAY_MS)
    const now = new Date()
    const acceptFrom = Math.max(startOfFrom.getTime(), now.getTime())
    const acceptTo = endOfWindow.getTime()
    if (acceptTo <= acceptFrom) return []

    // Rango de búsqueda holgado (±1 día) para no recortar días de miembros en otra zona.
    const searchFromUTC = new Date(startOfFrom.getTime() - DAY_MS)
    const searchToUTC = new Date(endOfWindow.getTime() + DAY_MS)

    const conns = await loadBookableConnections()
    if (conns.length === 0) return []

    const starts = new Set<number>()
    await Promise.all(
        conns.map(async (conn) => {
            const cands = candidateStarts(conn, searchFromUTC, searchToUTC, durationMin)
            if (cands.length === 0) return
            let busy
            try {
                const client = await clientForConnection(conn)
                busy = await freeBusy(client, conn.calendar_id, searchFromUTC.toISOString(), searchToUTC.toISOString())
            } catch (e) {
                await handleMemberError(conn, e)
                return
            }
            const intervals: [number, number][] = busy.map((b) => [
                new Date(b.start).getTime(),
                new Date(b.end).getTime(),
            ])
            for (const s of cands) {
                const st = s.getTime()
                if (st < acceptFrom || st >= acceptTo) continue // filtro fino contra la ventana del lead
                if (!overlapsBusy(st, st + durationMin * 60_000, intervals)) starts.add(st)
            }
        }),
    )

    return [...starts].sort((a, b) => a - b).map((t) => toRfc3339InZone(new Date(t), leadTz))
}

/**
 * ¿El slot cae dentro de la ventana de atención del miembro Y alineado a la grilla de slots?
 * (la grilla es la misma que genera candidateStarts: pasos de `durationMin` desde el inicio de
 * cada ventana). Evita reservas off-grid que fragmentarían el día.
 */
function withinWorkingGrid(conn: ConnRecord, startUTC: Date, durationMin: number): boolean {
    const tz = conn.user.booking_timezone
    const wh = parseWorkingHours(conn.user.working_hours)
    const p = localParts(startUTC, tz)
    const weekday = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()
    const startMin = p.h * 60 + p.mi
    const endMin = startMin + durationMin
    return (wh[String(weekday)] ?? []).some(([ws, we]) => {
        const a = hhmmToMinutes(ws)
        const b = hhmmToMinutes(we)
        return a <= startMin && endMin <= b && (startMin - a) % durationMin === 0
    })
}

export interface FreeMembersResult {
    free: ConnRecord[]
    hadError: boolean // hubo algún fallo de free/busy → 0 libres puede no ser "slot ocupado"
}

/**
 * Miembros bookables REALMENTE libres en `startUTC` (re-chequeo en vivo de free/busy + working
 * grid). `hadError` permite al booking distinguir "nadie libre por carrera" de "fallo de calendario".
 */
export async function freeMembersAt(startUTC: Date, durationMin: number): Promise<FreeMembersResult> {
    const conns = await loadBookableConnections()
    const free: ConnRecord[] = []
    let hadError = false
    const endMs = startUTC.getTime() + durationMin * 60_000
    await Promise.all(
        conns.map(async (conn) => {
            if (!withinWorkingGrid(conn, startUTC, durationMin)) return
            try {
                const client = await clientForConnection(conn)
                const busy = await freeBusy(
                    client,
                    conn.calendar_id,
                    startUTC.toISOString(),
                    new Date(endMs).toISOString(),
                )
                const intervals: [number, number][] = busy.map((b) => [
                    new Date(b.start).getTime(),
                    new Date(b.end).getTime(),
                ])
                if (!overlapsBusy(startUTC.getTime(), endMs, intervals)) free.push(conn)
            } catch (e) {
                hadError = true
                await handleMemberError(conn, e)
            }
        }),
    )
    return { free, hadError }
}
