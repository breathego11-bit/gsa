export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface PeriodRange {
    from: Date
    to: Date
    preset: PeriodPreset
}

function startOfDay(d: Date): Date {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

function endOfDay(d: Date): Date {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
}

export function getPeriodRange(
    preset: PeriodPreset,
    customFrom?: Date | string | null,
    customTo?: Date | string | null,
): PeriodRange {
    const now = new Date()

    if (preset === 'today') {
        return { from: startOfDay(now), to: endOfDay(now), preset }
    }

    if (preset === 'week') {
        const day = now.getDay() // 0 = Sun
        const diffToMonday = day === 0 ? -6 : 1 - day
        const monday = new Date(now)
        monday.setDate(now.getDate() + diffToMonday)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        return { from: startOfDay(monday), to: endOfDay(sunday), preset }
    }

    if (preset === 'month') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1)
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { from: startOfDay(first), to: endOfDay(last), preset }
    }

    if (preset === 'year') {
        const first = new Date(now.getFullYear(), 0, 1)
        const last = new Date(now.getFullYear(), 11, 31)
        return { from: startOfDay(first), to: endOfDay(last), preset }
    }

    // custom
    const f = customFrom ? new Date(customFrom) : startOfDay(now)
    const t = customTo ? new Date(customTo) : endOfDay(now)
    return { from: startOfDay(f), to: endOfDay(t), preset: 'custom' }
}

export function formatPeriodLabel(range: PeriodRange, locale = 'es-ES'): string {
    const sameDay = range.from.toDateString() === range.to.toDateString()
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
    if (sameDay) return range.from.toLocaleDateString(locale, opts)
    return `${range.from.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} – ${range.to.toLocaleDateString(locale, opts)}`
}
