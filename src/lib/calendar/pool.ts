import type { CloserType, Prisma } from '@prisma/client'

/**
 * Quién entra al reparto de leads (round-robin de aplica y VSL).
 *
 * Una sola definición para el reparto, la tabla de calendarios del equipo, los destinos de
 * traspaso y el selector de responsable: si cada uno la escribiera a su manera, volverían a
 * desincronizarse. Sin imports de runtime, para poder probarla sin base de datos.
 *
 * Regla (spec_closer_leads_access.md):
 *   - `lead_booking_enabled`: en un admin, que está en el reparto; en un closer, que un admin le
 *     autorizó a recibir leads.
 *   - Además tiene que ser admin o closer. Sin esta condición, a quien se le quitaba el rol de
 *     closer seguía recibiendo leads mientras tuviera el calendario conectado.
 *   - Y el calendario activo, que se exige aparte (en `loadBookableConnections` la consulta ya parte
 *     de las conexiones activas).
 */

/** Condición de Prisma sobre `User` para estar en el reparto (sin la parte del calendario). */
export const POOL_MEMBER_WHERE = {
    lead_booking_enabled: true,
    OR: [{ role: 'ADMIN' }, { closer_enabled: true, closer_type: { not: null } }],
} satisfies Prisma.UserWhereInput

export interface PoolCandidate {
    role: string
    closer_enabled: boolean
    closer_type: CloserType | null
    lead_booking_enabled: boolean
}

/** Versión pura de `POOL_MEMBER_WHERE`: misma regla, para decidir en memoria y en los tests. */
export function canReceiveLeads(u: PoolCandidate): boolean {
    const isTeam = u.role === 'ADMIN' || (u.closer_enabled === true && u.closer_type !== null)
    return u.lead_booking_enabled === true && isTeam
}

/**
 * ¿Conectar o desconectar el calendario cambia la bandera del reparto?
 *
 * Solo en los admins, que se gestionan solos (conectar = recibir, desconectar = dejar de recibir).
 * En un closer la bandera es la autorización del admin: conectar no la concede y desconectar no
 * la quita, para que un closer no se meta solo al reparto con un clic.
 */
export function connectionTogglesPool(role: string): boolean {
    return role === 'ADMIN'
}

/**
 * ¿Le enseñamos "Mis leads" al closer? Si está autorizado, o si tiene leads asignados de antes:
 * retirarle la autorización corta los leads nuevos, pero los que ya tiene siguen siendo suyos y
 * tiene que poder verlos.
 */
export function showsOwnLeads(authorized: boolean, assignedLeads: number): boolean {
    return authorized || assignedLeads > 0
}
