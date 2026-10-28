import type { CloserType, Prisma } from '@prisma/client'
import { isCloser } from '../access.ts'

/**
 * Quién entra al reparto de leads (round-robin de aplica y VSL).
 *
 * Una sola definición para el reparto, la tabla de calendarios del equipo, los destinos de
 * traspaso y el selector de responsable: si cada uno la escribiera a su manera, volverían a
 * desincronizarse. Importa `access.ts` por ruta relativa (y no por el alias `@/`) para que los
 * tests la puedan cargar sin el bundler de Next.
 *
 * Dos columnas, cada una con un solo significado (spec_closer_leads_review_fixes.md):
 *   - `lead_booking_enabled`: conectó su calendario para el reparto. La escriben conectar (true) y
 *     desconectar (false), para todos los roles, como siempre.
 *   - `lead_booking_authorized`: un admin autorizó a este **closer** a recibir leads. Solo la
 *     escribe el interruptor "Recibe leads". Los admins no la necesitan.
 *
 * Entra al reparto = calendario activo + `lead_booking_enabled` + (admin, o closer autorizado).
 * Lo del calendario activo se exige aparte: `loadBookableConnections` ya parte de las conexiones
 * activas, y el resto de consultas lo filtra en su propio `where`.
 */

/** Miembros del equipo: admins y closers con tipo. Es quien puede tener un lead a su nombre. */
export const TEAM_MEMBER_WHERE = {
    OR: [{ role: 'ADMIN' }, { closer_enabled: true, closer_type: { not: null } }],
} satisfies Prisma.UserWhereInput

/** Condición de Prisma sobre `User` para estar en el reparto (sin la parte del calendario). */
export const POOL_MEMBER_WHERE = {
    lead_booking_enabled: true,
    OR: [{ role: 'ADMIN' }, { closer_enabled: true, closer_type: { not: null }, lead_booking_authorized: true }],
} satisfies Prisma.UserWhereInput

export interface PoolCandidate {
    role: string
    closer_enabled: boolean
    closer_type: CloserType | null
    lead_booking_enabled: boolean
    lead_booking_authorized: boolean
}

/**
 * ¿Puede recibir leads? Los admins siempre; un closer, solo si un admin lo autorizó. No mira el
 * calendario: es lo que decide si se le enseña "Mis leads" y qué dice su tarjeta de conexión.
 */
export function isLeadAuthorized(u: Omit<PoolCandidate, 'lead_booking_enabled'>): boolean {
    if (u.role === 'ADMIN') return true
    return isCloser(u) && u.lead_booking_authorized === true
}

/** Versión pura de `POOL_MEMBER_WHERE`: autorizado y con el calendario puesto a disposición. */
export function canReceiveLeads(u: PoolCandidate): boolean {
    return isLeadAuthorized(u) && u.lead_booking_enabled === true
}

/**
 * ¿Le enseñamos "Mis leads" al closer? Si está autorizado, o si tiene leads asignados de antes:
 * retirarle la autorización corta los leads nuevos, pero los que ya tiene siguen siendo suyos y
 * tiene que poder verlos.
 */
export function showsOwnLeads(authorized: boolean, assignedLeads: number): boolean {
    return authorized || assignedLeads > 0
}

/**
 * Al desconectar un calendario, ¿se retira también la autorización del closer?
 *
 * Solo si lo desconecta **un admin a otra persona**: es la baja de alguien del equipo, y sin esto
 * el closer podía volver a conectar y seguir recibiendo leads. Si se desconecta él mismo (cambia de
 * cuenta, se va de vacaciones), la conserva y al reconectar vuelve a recibir sin pedir permiso.
 */
export function disconnectRevokesAuthorization(actorId: string, targetId: string): boolean {
    return actorId !== targetId
}
