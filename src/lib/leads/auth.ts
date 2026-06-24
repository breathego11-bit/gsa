import type { NextRequest } from 'next/server'

/**
 * Valida la API key con la que la landing autentica sus llamadas de ingestión.
 *
 * Acepta la key por header `x-api-key: <LEADS_API_KEY>` (forma documentada en el
 * brief de la landing) o por `Authorization: Bearer <LEADS_API_KEY>` (mismo patrón
 * que el cron de pagos), para ser robustos ante cómo la haya implementado la landing.
 */
export function leadsAuthOk(req: NextRequest, expected: string): boolean {
    const headerKey = req.headers.get('x-api-key')
    if (headerKey && headerKey === expected) return true

    const auth = req.headers.get('authorization') || ''
    if (auth === `Bearer ${expected}`) return true

    return false
}
