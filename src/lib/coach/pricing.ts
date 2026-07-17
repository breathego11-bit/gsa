// Tabla de precios de OpenAI en USD por 1.000.000 de tokens.
// ⚠️ Los TOKENS son reales (los devuelve la API en `usage`). El COSTO es exacto siempre que
// esta tabla coincida con la tarifa vigente de OpenAI: https://openai.com/api/pricing/
// Actualiza aquí si OpenAI cambia precios o si añades un modelo nuevo en OPENAI_MODEL.

type Rate = { input: number; cachedInput: number; output: number }

// El orden importa: 'gpt-4o-mini' debe ir ANTES que 'gpt-4o' (ambos hacen prefix match).
const PRICES: { prefix: string; rate: Rate }[] = [
    { prefix: 'gpt-4o-mini', rate: { input: 0.15, cachedInput: 0.075, output: 0.6 } },
    { prefix: 'gpt-4o', rate: { input: 2.5, cachedInput: 1.25, output: 10.0 } },
]

export function rateFor(model: string): Rate | null {
    return PRICES.find((p) => model.startsWith(p.prefix))?.rate ?? null
}

export type UsageLike = {
    inputTokens?: number
    outputTokens?: number
    cachedInputTokens?: number
}

/**
 * Costo REAL en USD de una llamada, replicando la facturación de OpenAI:
 * (input no cacheado × tarifa input) + (input cacheado × tarifa cached) + (output × tarifa output).
 * `inputTokens` de OpenAI ya incluye los cacheados, así que se restan.
 */
export function computeCostUsd(model: string, u: UsageLike): number {
    const r = rateFor(model)
    if (!r) return 0
    const input = u.inputTokens ?? 0
    const output = u.outputTokens ?? 0
    const cached = Math.min(u.cachedInputTokens ?? 0, input)
    const nonCached = Math.max(0, input - cached)
    return (nonCached * r.input + cached * r.cachedInput + output * r.output) / 1_000_000
}
