import { computeAvailability, MAX_DAYS as AVAILABILITY_MAX_DAYS } from './availability'
import { localParts } from './tz'

/**
 * Ventana de agendamiento: el lead solo puede reservar dentro de los próximos días, y si esos
 * días están llenos se abre uno más hasta encontrar hueco.
 *
 * Requerimiento del cliente (2026-09-08): "debe poder agendar como máximo en los siguientes 3
 * días, porque después de ese tiempo el lead se enfría. Si en los próximos 3 días tiene la agenda
 * llena, se habilita un día más, y así sucesivamente".
 *
 * La regla es `ventana = max(BASE, día del primer hueco)`. Cuando los primeros días están
 * saturados, el lead ve ÚNICAMENTE el primer día con disponibilidad: no se le abre el mes entero,
 * que es justo lo que se quiere evitar.
 */

const DAY_MS = 86_400_000

/**
 * Entero positivo desde el entorno, con respaldo.
 *
 * `Number(process.env.X ?? d)` no vale: una variable declarada pero vacía da `Number("") === 0`
 * —la ventana se cerraría a cero días— y cualquier texto da `NaN`, que además se cuela por las
 * comparaciones del motor de disponibilidad y acabaría rechazando TODAS las reservas.
 */
function envInt(name: string, fallback: number): number {
    const parsed = Math.floor(Number(process.env[name]))
    // Se redondea ANTES de validar: con `parsed > 0` sobre el valor crudo, un "0.5" pasaba el
    // filtro y acababa valiendo 0 — justo el caso de ventana nula que este guard evita.
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
}

/*
 * El techo se importa del propio motor en vez de copiarlo: si `MAX_DAYS` bajara, una copia local
 * dejaría a `window_days` anunciando días que nunca se llegaron a mirar.
 */

/** Días naturales de la ventana base, contando HOY. */
export const BOOKING_WINDOW_DAYS = Math.min(envInt('BOOKING_WINDOW_DAYS', 3), AVAILABILITY_MAX_DAYS)

/**
 * Tope de extensión. Si en tres semanas no hay un solo hueco, el problema no es la ventana: o
 * nadie tiene el calendario conectado o las working hours están mal. Mejor un mensaje claro que
 * seguir abriendo días indefinidamente.
 */
export const BOOKING_WINDOW_MAX_DAYS = Math.min(
    envInt('BOOKING_WINDOW_MAX_DAYS', 21),
    AVAILABILITY_MAX_DAYS,
)


export interface BookingWindowDay {
    /** YYYY-MM-DD en la zona del lead. */
    date: string
    /**
     * Instantes libres de ese día en RFC3339 **con offset**, tal y como los genera el motor
     * (`2026-09-08T09:00:00-05:00`).
     *
     * Se devuelve el instante completo y no un "09:00" suelto a propósito. Si el cliente tuviera
     * que recomponer la fecha pegando `date + "T" + hora`, tendría que aportar el offset de su
     * tabla de zonas —que es fijo y no sabe de horario de verano—, y en España una reserva
     * caería una hora antes o después durante medio año. Además, dos instantes distintos que
     * comparten hora de pared en el día del cambio de hora dejarían de distinguirse.
     */
    slots: string[]
}

export interface BookingWindow {
    tz_iana: string
    /** Días que quedaron abiertos: la base, o más si hubo que extender. */
    window_days: number
    /** true si la ventana base estaba llena y hubo que abrir días de más. */
    extended: boolean
    /** Solo los días CON hueco, en orden. */
    days: BookingWindowDay[]
    /** Último día abierto (YYYY-MM-DD). `null` si no hay ninguno. Lo usa el calendario para topar
     *  la navegación de meses. */
    last_date: string | null
}

/** YYYY-MM-DD del instante dado, en la zona indicada. */
export function ymdInZone(date: Date, tz: string): string {
    const p = localParts(date, tz)
    return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

export interface BookingWindowOptions {
    leadTz: string
    durationMin: number
    /**
     * Fija el "hoy" desde el que se cuenta la ventana. Afecta al día de arranque y al cálculo de
     * la extensión, pero NO al filtro de slots pasados: `computeAvailability` compara contra el
     * reloj real por su cuenta. Sirve para razonar sobre la regla, no para viajar en el tiempo.
     */
    now?: Date
}

/**
 * Calcula la ventana abierta para un lead.
 *
 * Se pide de una sola vez el rango completo hasta el tope y la regla se aplica en memoria. La
 * alternativa —pedir 3 días, y si vienen vacíos pedir 4, luego 5…— multiplica las llamadas a
 * Google justo cuando la agenda está saturada, que es cuando todo va más lento.
 */
export async function computeBookingWindow(opts: BookingWindowOptions): Promise<BookingWindow> {
    const { leadTz, durationMin } = opts
    const now = opts.now ?? new Date()

    // Ambas ya vienen acotadas al techo del motor de disponibilidad; aquí solo se ordena
    // base ≤ max para que una configuración incoherente no invierta la ventana.
    const base = BOOKING_WINDOW_DAYS
    const max = Math.max(base, BOOKING_WINDOW_MAX_DAYS)

    const fromDate = ymdInZone(now, leadTz)
    const slots = await computeAvailability({ fromDate, days: max, leadTz, durationMin })

    return applyWindowRule(slots, fromDate, leadTz, base, max)
}

/**
 * La regla, separada de la parte que habla con Google.
 *
 * Es una función pura: mismos slots y mismo "hoy" ⇒ mismo resultado. Se puede ejercitar en un
 * REPL sin base de datos ni credenciales, que es como se validaron los bordes (ventana base,
 * extensión a 4/6/7 días, tope, slots del pasado, horas duplicadas). El repo todavía no tiene
 * infraestructura de tests donde dejarlos fijados.
 *
 * @param slots     RFC3339 en la zona del lead, tal y como los devuelve `computeAvailability`
 * @param todayYmd  primer día de la ventana (YYYY-MM-DD en la zona del lead)
 */
export function applyWindowRule(
    slots: string[],
    todayYmd: string,
    leadTz: string,
    base: number,
    max: number,
): BookingWindow {
    // Agrupar por día local del lead. Los slots ya vienen en su zona, así que el YYYY-MM-DD del
    // propio RFC3339 es el día correcto sin más conversiones.
    const byDay = new Map<string, string[]>()
    for (const iso of slots) {
        const date = iso.slice(0, 10)
        const list = byDay.get(date)
        if (list) list.push(iso)
        else byDay.set(date, [iso])
    }

    // El dedupe va sobre el RFC3339 completo: `computeAvailability` ya deduplica por instante, y
    // hacerlo por hora de pared colapsaría los dos instantes distintos que comparten "01:30" el
    // día que se atrasa el reloj, perdiendo un hueco reservable.
    const daysWithSlots = [...byDay.entries()]
        .map(([date, isos]) => ({ date, slots: [...new Set(isos)].sort() }))
        .sort((a, b) => a.date.localeCompare(b.date))
        // Un slot con fecha anterior a hoy no debería llegar aquí, pero si llegara desplazaría
        // toda la ventana hacia atrás y abriría días que no tocan.
        .filter((d) => d.date >= todayYmd)

    if (daysWithSlots.length === 0) {
        return { tz_iana: leadTz, window_days: base, extended: false, days: [], last_date: null }
    }

    // Cuántos días naturales hay desde hoy hasta el primer día con hueco (hoy = 1).
    const daysUntilFirst = daysBetweenYmd(todayYmd, daysWithSlots[0].date) + 1

    // La ventana es la base, salvo que el primer hueco caiga más allá: entonces se estira hasta él.
    const windowDays = Math.min(Math.max(base, daysUntilFirst), max)

    // Fecha límite (inclusive) = hoy + windowDays - 1.
    const limit = ymdFromUtcNoon(ymdToUtcNoon(todayYmd) + (windowDays - 1) * DAY_MS)
    const days = daysWithSlots.filter((d) => d.date <= limit)

    return {
        tz_iana: leadTz,
        window_days: windowDays,
        extended: windowDays > base,
        days,
        last_date: days.length > 0 ? days[days.length - 1].date : null,
    }
}

/**
 * Días naturales entre dos YYYY-MM-DD.
 *
 * Se anclan al mediodía UTC a propósito: sumar/restar días sobre medianoche puede cruzar un cambio
 * de horario de verano y devolver 0 o 2 donde debería devolver 1. Con 12:00 hay 12 horas de margen
 * por cada lado, más que cualquier salto de DST.
 */
function daysBetweenYmd(from: string, to: string): number {
    return Math.round((ymdToUtcNoon(to) - ymdToUtcNoon(from)) / DAY_MS)
}

function ymdToUtcNoon(ymd: string): number {
    const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10))
    return Date.UTC(y, m - 1, d, 12, 0, 0)
}

function ymdFromUtcNoon(ms: number): string {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate(),
    ).padStart(2, '0')}`
}

/**
 * ¿Este instante cae dentro de la ventana abierta?
 *
 * Escalonado a propósito: si la fecha está dentro de los días base se acepta sin recalcular nada
 * —es el 99 % de los casos y no añade ni una llamada a Google—, y solo se recalcula cuando cae
 * fuera, que es cuando de verdad hay que comprobar si la ventana se había extendido.
 *
 * Se exige PERTENENCIA al conjunto de días abiertos, no "estar cerca". Se probó con un margen de
 * cortesía para absorber la contracción de la ventana entre que se pinta el calendario y se
 * confirma, pero ese margen se aplicaba en todos los casos y convertía la regla de 3 días en una
 * de 5: con la agenda despejada, el endpoint anunciaba 3 días y un POST directo al día 4 o 5 se
 * colaba. La regla de negocio pesa más que ese caso de carrera.
 *
 * Si la ventana se encoge mientras el lead decide (alguien cancela algo en los primeros días y su
 * día deja de estar abierto), recibe un 409 y el calendario se recarga con las fechas nuevas.
 *
 * Cuando la ventana viene VACÍA se acota al tope en lugar de aceptar cualquier fecha. Vacía
 * significa una de dos cosas —el free/busy de Google falló, o la agenda está saturada en todo el
 * horizonte— y no se pueden distinguir desde aquí. Rechazar de plano castigaría al lead por un
 * fallo nuestro; aceptar sin límite dejaba pasar una reserva a 60 días, que es justo lo contrario
 * de lo que el tope existe para evitar. Dentro del horizonte, la última palabra la tiene
 * `freeMembersAt`, que sí distingue "slot ocupado" de "error de calendario".
 *
 * `leadTz` lo elige el cliente, así que puede desplazar "hoy" como mucho un día. Un día de
 * diferencia no rompe la intención de la regla.
 */
export async function isWithinBookingWindow(
    startUTC: Date,
    leadTz: string,
    durationMin: number,
    now: Date = new Date(),
): Promise<boolean> {
    const todayYmd = ymdInZone(now, leadTz)
    const targetYmd = ymdInZone(startUTC, leadTz)

    const diff = daysBetweenYmd(todayYmd, targetYmd)
    if (diff < 0) return false // pasado: lo rechaza antes la propia ruta de booking
    if (diff < BOOKING_WINDOW_DAYS) return true

    const window = await computeBookingWindow({ leadTz, durationMin, now })
    if (window.days.length === 0) return diff < BOOKING_WINDOW_MAX_DAYS
    return window.days.some((d) => d.date === targetYmd)
}
