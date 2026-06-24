/**
 * Round-robin sin estado mutable adicional (§4.4 del spec).
 *
 * Entre los miembros LIBRES en el slot, elige al de menor carga (menos reuniones futuras);
 * desempata por el `assigned_at` más antiguo (null = nunca asignado → va primero).
 * Determinista: misma entrada → misma elección.
 */

export interface Candidate {
    userId: string
    name: string
    futureMeetings: number
    lastAssignedAt: Date | null
}

export function pickAssignee<T extends Candidate>(candidates: T[]): T | null {
    if (candidates.length === 0) return null
    return [...candidates].sort((a, b) => {
        if (a.futureMeetings !== b.futureMeetings) return a.futureMeetings - b.futureMeetings
        const at = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0
        const bt = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0
        if (at !== bt) return at - bt
        // último desempate estable para determinismo total
        return a.userId.localeCompare(b.userId)
    })[0]
}
