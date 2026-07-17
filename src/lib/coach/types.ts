/** Tipos de llamada que el coach evalúa distinto (Coach-ia.md §15). */
export const COACH_CALL_TYPES = [
    { value: 'cierre', label: 'Llamada de cierre' },
    { value: 'discovery', label: 'Discovery / primera llamada' },
    { value: 'seguimiento', label: 'Seguimiento' },
    { value: 'rescate', label: 'Rescate de objeción' },
    { value: 'post_masterclass', label: 'Primera tras masterclass / live' },
    { value: 'admision', label: 'Llamada de admisión' },
] as const

export type CoachCallType = (typeof COACH_CALL_TYPES)[number]['value']

/** Rol persistido de un mensaje del coach. */
export type CoachRole = 'user' | 'assistant'
