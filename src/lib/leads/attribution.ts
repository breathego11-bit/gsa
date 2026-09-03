import type { Prisma } from '@prisma/client'

/**
 * Atribución de campaña que llega desde la landing / VSL.
 *
 * Todo lo de aquí es entrada de usuario: viaja en la query string de una URL pública, así que
 * cualquiera puede inventarse los valores. Se valida con lista blanca de claves y se recorta
 * la longitud antes de escribir en la base — sin límite, una URL larga permite inflar la fila.
 */

const KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',
    'gclid',
    'referrer',
    'landing_path',
    'captured_at',
] as const

type AttributionKey = (typeof KEYS)[number]

export type AttributionSnapshot = Partial<Record<AttributionKey, string>>

const MAX_LEN = 512

/** Deja solo claves conocidas, valores string y longitud acotada. `null` si no queda nada. */
export function sanitizeSnapshot(raw: unknown): AttributionSnapshot | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const input = raw as Record<string, unknown>
    const out: AttributionSnapshot = {}
    let found = false

    for (const key of KEYS) {
        const value = input[key]
        if (typeof value !== 'string') continue
        const trimmed = value.trim().slice(0, MAX_LEN)
        if (!trimmed) continue
        out[key] = trimmed
        found = true
    }

    return found ? out : null
}

export interface LeadAttributionFields {
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    utm_content: string | null
    utm_term: string | null
    fbclid: string | null
    landing_url: string | null
    referrer: string | null
    attribution_first: Prisma.InputJsonValue | undefined
    attribution_last: Prisma.InputJsonValue | undefined
}

/**
 * Convierte el bloque `attribution` del body en los campos del Lead.
 *
 * Las columnas escalares salen del ÚLTIMO toque: es el clic que produjo la conversión y el
 * que casa con el `_fbc` que Meta usa para atribuir. El primero se conserva íntegro en
 * `attribution_first` para poder comparar los dos en el CRM.
 */
export function toLeadAttribution(raw: unknown): LeadAttributionFields {
    const empty: LeadAttributionFields = {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_content: null,
        utm_term: null,
        fbclid: null,
        landing_url: null,
        referrer: null,
        attribution_first: undefined,
        attribution_last: undefined,
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty

    const { first, last } = raw as { first?: unknown; last?: unknown }
    const firstSnap = sanitizeSnapshot(first)
    const lastSnap = sanitizeSnapshot(last)

    // Si solo llega una de las dos, esa vale como ambas: un visitante que convierte en su
    // primera visita tiene un único toque.
    const scalars = lastSnap ?? firstSnap
    if (!scalars && !firstSnap && !lastSnap) return empty

    return {
        utm_source: scalars?.utm_source ?? null,
        utm_medium: scalars?.utm_medium ?? null,
        utm_campaign: scalars?.utm_campaign ?? null,
        utm_content: scalars?.utm_content ?? null,
        utm_term: scalars?.utm_term ?? null,
        fbclid: scalars?.fbclid ?? null,
        landing_url: scalars?.landing_path ?? null,
        referrer: scalars?.referrer ?? null,
        attribution_first: firstSnap ?? undefined,
        attribution_last: lastSnap ?? undefined,
    }
}
