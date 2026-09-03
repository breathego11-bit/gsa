import type { LeadSituation, LeadUrgency, LeadInvestment } from '@prisma/client'

/**
 * Catálogo compartido de las opciones de cualificación de los formularios.
 *
 * ⚠️ Landing y VSL REUTILIZAN los mismos códigos de enum con significados distintos. Ejemplo:
 * `DE_1000_A_2000` es "Entre 1.000 € y 2.000 €" en la landing, pero "Puedo invertir, dentro de
 * un presupuesto ajustado" en la VSL. Mostrar el label de la landing para un lead de la VSL es
 * simplemente incorrecto, así que las etiquetas se resuelven POR ORIGEN (`Lead.source`).
 *
 * La landing sigue siendo la fuente por defecto: un `source` desconocido cae ahí.
 */

export type LeadSourceKey = 'landing-survey' | 'vsl-survey'

function sourceKey(source?: string | null): LeadSourceKey {
    return source === 'vsl-survey' ? 'vsl-survey' : 'landing-survey'
}

/** Nombre legible del embudo, para los badges del CRM. */
export function sourceLabel(source?: string | null): string {
    return sourceKey(source) === 'vsl-survey' ? 'VSL' : 'Aplica'
}

/* ------------------------------------------------------------------ *
 * Situación
 * ------------------------------------------------------------------ */

export const SITUATION_OPTIONS: { value: LeadSituation; label: string }[] = [
    { value: 'NO_TRABAJANDO', label: 'No trabajando' },
    { value: 'MAS_INGRESOS', label: 'Tiene trabajo, quiere más ingresos' },
    { value: 'QUIERE_REMOTO', label: 'Tiene trabajo, quiere remoto' },
    { value: 'EMPRENDE_INESTABLE', label: 'Emprende, ingresos inestables' },
    { value: 'VENDE_PROFESIONALIZAR', label: 'Vende, quiere profesionalizarse' },
    { value: 'YA_CLOSER', label: 'Ya closer, quiere mejorar' },
    { value: 'OTRA', label: 'Otra situación' },
]

/** Solo los códigos cuyo significado cambia en la VSL; el resto cae al catálogo base. */
const SITUATION_VSL: Partial<Record<LeadSituation, string>> = {
    MAS_INGRESOS: 'Factura bien, quiere escalar',
    VENDE_PROFESIONALIZAR: 'Vende, quiere ordenar su sistema comercial',
    EMPRENDE_INESTABLE: 'Factura de forma inestable, todo depende de él/ella',
}

/* ------------------------------------------------------------------ *
 * Urgencia
 * ------------------------------------------------------------------ */

export const URGENCY_OPTIONS: { value: LeadUrgency; label: string }[] = [
    { value: 'AHORA', label: 'Ahora' },
    { value: 'EN_3_MESES', label: 'Próximos 3 meses' },
    { value: 'EN_6_MESES_O_MAS', label: '6 meses o más' },
    { value: 'NO_SE', label: 'No sé cuándo' },
    { value: 'SOLO_INFORMARSE', label: 'Solo informarme' },
]

// La urgencia significa lo mismo en los dos embudos: no hace falta variante.

/* ------------------------------------------------------------------ *
 * Inversión
 * ------------------------------------------------------------------ */

export const INVESTMENT_OPTIONS: { value: LeadInvestment; label: string }[] = [
    { value: 'SIN_RECURSOS', label: 'Sin recursos' },
    { value: 'DE_500_A_1000', label: '500–1.000 €' },
    { value: 'DE_1000_A_2000', label: '1.000–2.000 €' },
    { value: 'SIN_IMPEDIMENTO', label: 'Sin impedimento' },
]

/**
 * En la VSL las opciones NO son tramos de dinero, sino de capacidad de inversión. Sin esta
 * tabla, un lead de la VSL que dijo "presupuesto ajustado" aparecería como "1.000–2.000 €",
 * que es un dato que nadie le preguntó.
 */
const INVESTMENT_VSL: Partial<Record<LeadInvestment, string>> = {
    SIN_IMPEDIMENTO: 'Si el retorno es claro, sin impedimento',
    DE_1000_A_2000: 'Puede invertir con presupuesto ajustado',
    SIN_RECURSOS: 'Sin capacidad de inversión ahora',
}

/* ------------------------------------------------------------------ *
 * Validadores (los usa POST /api/leads)
 * ------------------------------------------------------------------ */

const SITUATION_VALUES = SITUATION_OPTIONS.map((o) => o.value as string)
const URGENCY_VALUES = URGENCY_OPTIONS.map((o) => o.value as string)
const INVESTMENT_VALUES = INVESTMENT_OPTIONS.map((o) => o.value as string)

export function isSituation(v: unknown): v is LeadSituation {
    return typeof v === 'string' && SITUATION_VALUES.includes(v)
}
export function isUrgency(v: unknown): v is LeadUrgency {
    return typeof v === 'string' && URGENCY_VALUES.includes(v)
}
export function isInvestment(v: unknown): v is LeadInvestment {
    return typeof v === 'string' && INVESTMENT_VALUES.includes(v)
}

/* ------------------------------------------------------------------ *
 * Etiquetas para la UI del CRM. `source` es opcional para no romper callers previos.
 * ------------------------------------------------------------------ */

export function situationLabel(v: LeadSituation, source?: string | null): string {
    if (sourceKey(source) === 'vsl-survey' && SITUATION_VSL[v]) return SITUATION_VSL[v]!
    return SITUATION_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function urgencyLabel(v: LeadUrgency, _source?: string | null): string {
    return URGENCY_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function investmentLabel(v: LeadInvestment, source?: string | null): string {
    if (sourceKey(source) === 'vsl-survey' && INVESTMENT_VSL[v]) return INVESTMENT_VSL[v]!
    return INVESTMENT_OPTIONS.find((o) => o.value === v)?.label ?? v
}

/* ------------------------------------------------------------------ *
 * Enunciados de las preguntas abiertas.
 *
 * La vista de detalle muestra la respuesta bajo la pregunta que se le hizo AL LEAD, no bajo
 * una etiqueta genérica: "objetivos" no significa lo mismo en los dos embudos.
 * ------------------------------------------------------------------ */

type OpenQuestion = 'desired_change' | 'objectives' | 'cafe_vision'

const QUESTIONS: Record<LeadSourceKey, Record<OpenQuestion, string>> = {
    'landing-survey': {
        desired_change: '¿Qué es lo que más te gustaría cambiar de tu situación actual?',
        objectives: '¿Qué objetivos te gustaría conseguir formándote como closer de ventas?',
        cafe_vision:
            'Imagina que tomamos un café dentro de seis meses. ¿Qué habría tenido que cambiar para que me digas: "Iván, ha sido todo un éxito"?',
    },
    'vsl-survey': {
        desired_change: '¿Qué es lo que más te gustaría cambiar de tu situación comercial actual?',
        objectives: '¿Qué objetivos de negocio quieres conseguir en los próximos 90 días?',
        cafe_vision:
            'Imagina que tomamos un café dentro de seis meses. ¿Qué habría tenido que cambiar en tu negocio para que me digas: "Iván, ha sido todo un éxito"?',
    },
}

export function questionLabel(field: OpenQuestion, source?: string | null): string {
    return QUESTIONS[sourceKey(source)][field]
}
