import { canAccessCoach, type AccessUser } from '@/lib/access'

/**
 * Modelo de acceso al Coach IA — constantes y lógica PURA.
 *
 * Vive separado de `access.ts` porque el componente de chat lo importa: `access.ts` toca
 * Prisma y arrastrarlo al bundle del navegador rompería el build.
 *
 * Decisión del cliente (2026-09-03): cualquiera que se registre puede probar el coach gratis
 * con un número limitado de transcripciones. Agotadas, el coach se bloquea y se le invita a
 * agendar una llamada de admisión.
 *
 *   full      → admins, closers y quien haya pagado (active | complimentary). Sin límite.
 *   trial     → registrado sin pagar, con evaluaciones gratuitas restantes.
 *   exhausted → registrado sin pagar, cuota agotada. Coach bloqueado.
 *
 * La cuota cuenta EVALUACIONES (transcripciones pegadas), no mensajes: si un seguimiento
 * gastara cuota, preguntar "¿por qué me has puntuado así?" quemaría una de las dos pruebas,
 * que no es lo que se ofreció.
 */

/** Transcripciones gratuitas antes de bloquear el coach. */
export const COACH_FREE_EVALUATIONS = 2

/** Adonde se manda a quien agota la prueba: el formulario de admisión de la landing. */
export const COACH_UPGRADE_URL = 'https://aplica.growthsalessacademy.com/survey'

/*
 * Marcador que el cliente busca en el cuerpo del error para abrir el popup de bloqueo.
 * Va en el texto y no solo en el código HTTP porque `useChat` entrega el cuerpo de la
 * respuesta como `error.message`, sin el status.
 */
export const COACH_TRIAL_EXHAUSTED = 'coach_trial_exhausted'

/**
 * ¿Este mensaje descuenta una evaluación de la prueba gratuita?
 *
 * **Invariante: recibir una evaluación ⟺ gastar cuota.** Esta condición es EXACTAMENTE la
 * misma que `looksLikeTranscript` (src/lib/coach/prompt.ts), que es la que decide si el
 * mensaje se responde con gpt-4o y el Documento Maestro entero. Si las dos se separan, se
 * abre una franja en la que el alumno recibe la evaluación completa —el producto— sin que
 * se le descuente nada, y la prueba deja de tener límite.
 *
 * Se intentó un umbral de cobro más alto (2.500 caracteres) para que un seguimiento largo no
 * se facturara como evaluación. Efecto secundario: entre 800 y 2.500 caracteres se entregaban
 * evaluaciones completas gratis e ilimitadas. Prevalece el invariante — un seguimiento que
 * cruza el umbral recibe una evaluación de verdad, así que cobrarla es lo correcto.
 *
 * Se duplica en vez de importarse porque `prompt.ts` arrastra el Documento Maestro y la
 * configuración del modelo al bundle del navegador. Si una cambia, la otra también.
 */
export function chargesFreeEvaluation(text: string): boolean {
    return text.length > 800 || /\d{1,2}:\d{2}\s*[-–]/.test(text)
}

export type CoachAccessLevel = 'full' | 'trial' | 'exhausted'

export interface CoachAccess {
    level: CoachAccessLevel
    /** Evaluaciones gratuitas restantes. En `full` no se usa. */
    remaining: number
    used: number
    limit: number
}

/** Resuelve el acceso a partir del usuario y de su contador ya cargado. */
export function coachAccessFrom(u: AccessUser, freeUsed: number): CoachAccess {
    if (canAccessCoach(u)) {
        return { level: 'full', remaining: 0, used: freeUsed, limit: COACH_FREE_EVALUATIONS }
    }
    const used = Math.max(0, freeUsed)
    const remaining = Math.max(0, COACH_FREE_EVALUATIONS - used)
    return {
        level: remaining > 0 ? 'trial' : 'exhausted',
        remaining,
        used,
        limit: COACH_FREE_EVALUATIONS,
    }
}
