export function formatRelativeEs(date: Date | string, now: Date = new Date()): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const diffMs = now.getTime() - d.getTime()
    const minute = 60_000
    const hour = 60 * minute
    const day = 24 * hour

    if (diffMs < 0) return 'ahora'
    if (diffMs < minute) return 'ahora'
    if (diffMs < hour) return `hace ${Math.floor(diffMs / minute)}m`
    if (diffMs < day) return `hace ${Math.floor(diffMs / hour)}h`

    const startToday = new Date(now)
    startToday.setHours(0, 0, 0, 0)
    const startTarget = new Date(d)
    startTarget.setHours(0, 0, 0, 0)
    const dayDiff = Math.round((startToday.getTime() - startTarget.getTime()) / day)

    if (dayDiff === 1) return 'ayer'
    if (dayDiff < 7) return `hace ${dayDiff}d`
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
