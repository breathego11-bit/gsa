/**
 * Lectura del bloque de "Puntuación" (§19 del método) que el coach escribe en cada
 * evaluación. Vive aquí, y no dentro del componente de chat, porque lo usan dos sitios:
 * el scorecard del alumno y las métricas del panel de admin.
 *
 * Formato que produce el coach:
 *
 *     ## 2. Puntuación
 *     Conexión: 8/10
 *     Marco: 9/10
 *     ...
 *     Total: 79/100
 */

export type ScoreItem = { label: string; score: number; max: number }
export type Scorecard = { items: ScoreItem[]; total: number }

/** Las 8 categorías de la rúbrica, con el patrón que las reconoce en el texto. */
export const SCORE_CATEGORIES: { test: RegExp; label: string; max: number }[] = [
    { test: /conexi[oó]n/i, label: 'Conexión', max: 10 },
    { test: /marco/i, label: 'Marco', max: 10 },
    { test: /diagn[oó]stico/i, label: 'Diagnóstico', max: 15 },
    { test: /dolor|deseo|brecha/i, label: 'Dolor / deseo / brecha', max: 20 },
    { test: /espejo|claridad/i, label: 'Espejo y claridad', max: 10 },
    { test: /presentaci[oó]n|valor/i, label: 'Presentación', max: 15 },
    { test: /precio|cierre/i, label: 'Precio y cierre', max: 10 },
    { test: /objec/i, label: 'Objeciones', max: 10 },
]

/** Mínimo de categorías para considerar que el mensaje es una evaluación de verdad. */
const MIN_CATEGORIES = 6

/**
 * Extrae la puntuación de una respuesta del coach.
 *
 * Devuelve `null` cuando el mensaje no es una evaluación — el coach también responde dudas
 * y saludos, y esos mensajes no deben contar en las medias.
 */
export function parseScorecard(text: string): Scorecard | null {
    const found = new Map<string, ScoreItem>()
    let total: number | null = null

    const re = /([^\n:]+):\s*(\d+)\s*\/\s*(\d+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        const rawLabel = m[1]
        const score = Number(m[2])
        const max = Number(m[3])
        if (/total/i.test(rawLabel) || max === 100) {
            total = score
            continue
        }
        const cat = SCORE_CATEGORIES.find((c) => c.test.test(rawLabel))
        if (cat && !found.has(cat.label)) {
            found.set(cat.label, { label: cat.label, score, max })
        }
    }

    const items = SCORE_CATEGORIES.map((c) => found.get(c.label)).filter(
        (x): x is ScoreItem => Boolean(x),
    )
    if (total === null || items.length < MIN_CATEGORIES) return null
    return { items, total }
}

/** Quita el bloque de puntuación del texto (ya se pinta como scorecard aparte). */
export function stripScoreBlock(text: string): string {
    return text
        .split('\n')
        .filter(
            (line) =>
                !/^\s*#*\s*\d*\.?\s*Puntuaci[oó]n\s*$/i.test(line) &&
                !/^\s*[-*]?\s*[^\n:]+:\s*\d+\s*\/\s*\d+\s*$/.test(line),
        )
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
}

/** Color según lo cerca que esté del máximo. Compartido por scorecard y métricas. */
export function scoreColor(ratio: number): string {
    if (ratio >= 0.7) return '#34d399'
    if (ratio >= 0.4) return '#fbbf24'
    return '#f43f5e'
}
