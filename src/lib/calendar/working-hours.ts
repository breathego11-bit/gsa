/**
 * Horario de atención de un miembro: en qué tramos de cada día pueden aplica y VSL ofrecer
 * reuniones con él.
 *
 * Módulo PURO a propósito — sin Prisma ni nada de servidor — porque lo usan las dos puntas: el
 * editor lo importa para avisar antes de guardar y la API lo vuelve a aplicar al recibir. Si solo
 * validara el cliente, un PUT a mano podría guardar un horario que rompiera el motor de huecos.
 *
 * Formato (el mismo que ya lee `availability.ts`): claves "0".."6" con 0 = domingo, y por cada día
 * una lista de tramos `[inicio, fin]` en "HH:mm", en la zona horaria de reserva del miembro.
 */

export type TimeWindow = [string, string]
export type WorkingHours = Record<string, TimeWindow[]>

/**
 * Paso de la rejilla. Las reuniones duran 30 minutos y la rejilla de huecos arranca en el inicio
 * de cada tramo; con horas en medias horas, todos los huecos caen en :00 o :30.
 */
export const STEP_MIN = 30

/** Un tramo más corto que una reunión no genera ningún hueco: se rechaza para no confundir. */
export const MIN_WINDOW_MIN = 30

export const MAX_WINDOWS_PER_DAY = 6

/** Orden de pintado: lunes primero, como en una agenda. */
export const WEEKDAYS: { key: string; label: string; short: string }[] = [
    { key: '1', label: 'Lunes', short: 'Lun' },
    { key: '2', label: 'Martes', short: 'Mar' },
    { key: '3', label: 'Miércoles', short: 'Mié' },
    { key: '4', label: 'Jueves', short: 'Jue' },
    { key: '5', label: 'Viernes', short: 'Vie' },
    { key: '6', label: 'Sábado', short: 'Sáb' },
    { key: '0', label: 'Domingo', short: 'Dom' },
]

const HHMM = /^(\d{2}):(\d{2})$/

/** "HH:mm" → minutos desde medianoche. Admite "24:00" como fin de día. `null` si no es válido. */
export function toMinutes(s: unknown): number | null {
    if (typeof s !== 'string') return null
    const m = HHMM.exec(s)
    if (!m) return null
    const h = Number(m[1])
    const mi = Number(m[2])
    if (mi > 59 || h > 24 || (h === 24 && mi !== 0)) return null
    return h * 60 + mi
}

export function fromMinutes(total: number): string {
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Opciones de hora para los desplegables: 00:00, 00:30 … 24:00. */
export function timeOptions(): string[] {
    const out: string[] = []
    for (let m = 0; m <= 24 * 60; m += STEP_MIN) out.push(fromMinutes(m))
    return out
}

/** Cuántas reuniones de `durationMin` caben en un día con esos tramos (misma cuenta que el motor). */
export function slotsPerDay(windows: TimeWindow[], durationMin = 30): number {
    let n = 0
    for (const [a, b] of windows) {
        const start = toMinutes(a)
        const end = toMinutes(b)
        if (start === null || end === null) continue
        for (let t = start; t + durationMin <= end; t += durationMin) n++
    }
    return n
}

export type ValidationResult =
    | { ok: true; value: WorkingHours }
    | { ok: false; error: string }

/**
 * Valida y normaliza un horario llegado de fuera.
 *
 * Devuelve siempre las 7 claves (vacías si el día no tiene tramos) y los tramos ordenados, para que
 * lo guardado sea predecible. Los mensajes van en castellano porque se muestran tal cual al usuario.
 */
export function validateWorkingHours(input: unknown): ValidationResult {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, error: 'El horario no tiene un formato válido.' }
    }

    const raw = input as Record<string, unknown>
    for (const key of Object.keys(raw)) {
        if (!/^[0-6]$/.test(key)) return { ok: false, error: `Día desconocido: "${key}".` }
    }

    const out: WorkingHours = {}
    for (const { key, label } of WEEKDAYS) {
        const value = raw[key] ?? []
        if (!Array.isArray(value)) return { ok: false, error: `${label}: formato no válido.` }
        if (value.length > MAX_WINDOWS_PER_DAY) {
            return { ok: false, error: `${label}: como máximo ${MAX_WINDOWS_PER_DAY} tramos por día.` }
        }

        const parsed: [number, number][] = []
        for (const w of value) {
            if (!Array.isArray(w) || w.length !== 2) return { ok: false, error: `${label}: tramo mal formado.` }
            const start = toMinutes(w[0])
            const end = toMinutes(w[1])
            if (start === null || end === null) return { ok: false, error: `${label}: hora no válida.` }
            if (start % STEP_MIN !== 0 || end % STEP_MIN !== 0) {
                return { ok: false, error: `${label}: las horas van en tramos de media hora (:00 o :30).` }
            }
            if (end <= start) return { ok: false, error: `${label}: la hora de fin debe ser posterior a la de inicio.` }
            if (end - start < MIN_WINDOW_MIN) {
                return { ok: false, error: `${label}: cada tramo debe durar al menos ${MIN_WINDOW_MIN} minutos.` }
            }
            parsed.push([start, end])
        }

        parsed.sort((a, b) => a[0] - b[0])
        for (let i = 1; i < parsed.length; i++) {
            if (parsed[i][0] < parsed[i - 1][1]) {
                return {
                    ok: false,
                    error: `${label}: los tramos ${fromMinutes(parsed[i - 1][0])}–${fromMinutes(parsed[i - 1][1])} y ${fromMinutes(parsed[i][0])}–${fromMinutes(parsed[i][1])} se solapan.`,
                }
            }
        }

        out[key] = parsed.map(([a, b]) => [fromMinutes(a), fromMinutes(b)])
    }

    return { ok: true, value: out }
}

/** ¿Hay al menos un hueco reservable en toda la semana? Sirve para avisar antes de guardar. */
export function hasAnySlot(wh: WorkingHours): boolean {
    return Object.values(wh).some((windows) => slotsPerDay(windows) > 0)
}

/**
 * Horario de atención por defecto: L–V de 8:00 a 12:00 y de 14:00 a 17:00.
 *
 * La pausa del mediodía es real, no decorativa: antes el default era 09:00–18:00 de corrido y el
 * calendario ofrecía reuniones a las 12:00 y a las 13:00, cuando nadie iba a atenderlas.
 *
 * Con reuniones de 30 minutos salen 14 huecos al día: 8:00–11:30 por la mañana y 14:00–16:30 por
 * la tarde (el último empieza a y media y termina justo al cierre).
 *
 * Solo aplica a quien tenga `User.working_hours` a null. Cada miembro puede tener el suyo.
 *
 * Vive aquí, en el módulo puro, y no en availability.ts: la agenda lo necesita en el navegador para
 * el editor, y availability.ts arrastra googleapis.
 */
const DEFAULT_WORKING_HOURS: WorkingHours = {
    '1': [['08:00', '12:00'], ['14:00', '17:00']],
    '2': [['08:00', '12:00'], ['14:00', '17:00']],
    '3': [['08:00', '12:00'], ['14:00', '17:00']],
    '4': [['08:00', '12:00'], ['14:00', '17:00']],
    '5': [['08:00', '12:00'], ['14:00', '17:00']],
}

/** Copia del horario por defecto (copia: quien la reciba puede editarla sin tocar el original). */
export function defaultWorkingHours(): WorkingHours {
    return JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS)) as WorkingHours
}

/**
 * Horario efectivo: el propio del miembro, o el por defecto si no tiene.
 *
 * Es la ÚNICA lectura del horario del proyecto: la usan el motor de huecos, la agenda y el panel de
 * leads. Si cada uno lo leyera a su manera, la agenda podría enseñar un horario distinto del que se
 * les ofrece a los leads.
 */
export function parseWorkingHours(wh: unknown): WorkingHours {
    if (wh && typeof wh === 'object' && !Array.isArray(wh)) return wh as WorkingHours
    return DEFAULT_WORKING_HOURS
}

/**
 * Horario efectivo de un miembro en texto, para el panel del CRM.
 *
 * Hace visible algo que hasta ahora estaba escondido en la base: si alguien tiene un horario
 * propio mal puesto, el calendario ofrece huecos raros y no había forma de darse cuenta.
 */
export function describeWorkingHours(wh: unknown): string {
    const parsed = parseWorkingHours(wh)
    const parts: string[] = []
    for (const { key, short } of WEEKDAYS) {
        const windows = parsed[key] ?? []
        if (windows.length === 0) continue
        parts.push(`${short} ${windows.map(([a, b]) => `${a}–${b}`).join(', ')}`)
    }
    return parts.length > 0 ? parts.join(' · ') : 'sin horario configurado'
}
