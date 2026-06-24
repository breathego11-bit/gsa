import type { LeadSituation, LeadUrgency, LeadInvestment } from '@prisma/client'

/**
 * Catálogo compartido de las opciones de cualificación del formulario de la landing.
 *
 * La landing muestra `label` al usuario y envía `value` (el código del enum) al LMS.
 * Mantener este archivo como ÚNICA fuente de verdad evita que landing y LMS se
 * desincronicen: los validadores de la API y las etiquetas del CRM salen de aquí.
 */

export const SITUATION_OPTIONS: { value: LeadSituation; label: string }[] = [
    { value: 'NO_TRABAJANDO', label: 'No trabajando' },
    { value: 'MAS_INGRESOS', label: 'Tiene trabajo, quiere más ingresos' },
    { value: 'QUIERE_REMOTO', label: 'Tiene trabajo, quiere remoto' },
    { value: 'EMPRENDE_INESTABLE', label: 'Emprende, ingresos inestables' },
    { value: 'VENDE_PROFESIONALIZAR', label: 'Vende, quiere profesionalizarse' },
    { value: 'YA_CLOSER', label: 'Ya closer, quiere mejorar' },
    { value: 'OTRA', label: 'Otra situación' },
]

export const URGENCY_OPTIONS: { value: LeadUrgency; label: string }[] = [
    { value: 'AHORA', label: 'Ahora' },
    { value: 'EN_3_MESES', label: 'Próximos 3 meses' },
    { value: 'EN_6_MESES_O_MAS', label: '6 meses o más' },
    { value: 'NO_SE', label: 'No sé cuándo' },
    { value: 'SOLO_INFORMARSE', label: 'Solo informarme' },
]

export const INVESTMENT_OPTIONS: { value: LeadInvestment; label: string }[] = [
    { value: 'SIN_RECURSOS', label: 'Sin recursos' },
    { value: 'DE_500_A_1000', label: '500–1.000 €' },
    { value: 'DE_1000_A_2000', label: '1.000–2.000 €' },
    { value: 'SIN_IMPEDIMENTO', label: 'Sin impedimento' },
]

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

/** Etiqueta legible para la UI del CRM (enum → texto). */
export function situationLabel(v: LeadSituation): string {
    return SITUATION_OPTIONS.find((o) => o.value === v)?.label ?? v
}
export function urgencyLabel(v: LeadUrgency): string {
    return URGENCY_OPTIONS.find((o) => o.value === v)?.label ?? v
}
export function investmentLabel(v: LeadInvestment): string {
    return INVESTMENT_OPTIONS.find((o) => o.value === v)?.label ?? v
}
