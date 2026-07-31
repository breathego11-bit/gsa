import { prisma } from '@/lib/prisma'
import { GSA_METHODOLOGY } from './methodology'

/**
 * Resuelve el Documento Maestro que debe usar el coach.
 *
 * Dos orígenes, en este orden:
 *  1. `CoachSetting.methodology` — lo que Iván haya editado desde /admin/coach/ajustes.
 *  2. `GSA_METHODOLOGY` — el original de fábrica, compilado desde Coach-ia.md en el build.
 *
 * Es decir: mientras nadie edite nada, el comportamiento es idéntico al de antes. En cuanto
 * se guarda una edición, la base de datos manda y el archivo queda como copia de seguridad
 * a la que siempre se puede volver ("Restaurar original" en el panel).
 */
export function resolveMethodology(stored?: string | null): string {
    const trimmed = stored?.trim()
    return trimmed ? trimmed : GSA_METHODOLOGY
}

/** ¿El método activo es una edición del panel o el original del build? */
export function isMethodologyEdited(stored?: string | null): boolean {
    const trimmed = stored?.trim()
    return Boolean(trimmed) && trimmed !== GSA_METHODOLOGY.trim()
}

/** Lee los ajustes del coach y devuelve ya resuelto el método activo. */
export async function loadCoachConfig() {
    const setting = await prisma.coachSetting.findUnique({ where: { id: 'singleton' } })
    return {
        setting,
        methodology: resolveMethodology(setting?.methodology),
        extraInstructions: setting?.extra_instructions ?? undefined,
        edited: isMethodologyEdited(setting?.methodology),
    }
}

/** El original de fábrica, para poder mostrarlo y restaurarlo desde el panel. */
export { GSA_METHODOLOGY as FACTORY_METHODOLOGY }
