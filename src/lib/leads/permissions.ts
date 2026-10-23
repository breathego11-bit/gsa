import type { CloserType, LeadStatus } from '@prisma/client'

/**
 * Quién puede editar qué lead desde el CRM — decisión PURA, sin Prisma ni sesión, para poder
 * probarla sin base de datos. La aplica `PATCH /api/leads/[id]`.
 *
 * Reglas (ver spec_closer_crm.md §3):
 *   - admin  → cualquier lead; estado y reasignación.
 *   - closer → solo los leads asignados a él, y solo el estado.
 *   - resto  → nada: ni siquiera llegan aquí, los corta `canAccessCRM`.
 */

export const LEAD_STATUSES: LeadStatus[] = ['NUEVO', 'CONTACTADO', 'AGENDADO', 'DESCARTADO']

export function isLeadStatus(v: unknown): v is LeadStatus {
    return typeof v === 'string' && (LEAD_STATUSES as string[]).includes(v)
}

export interface LeadEditor {
    role: string
    closer_enabled: boolean
    closer_type: CloserType | null
}

/** Lo que pide el cliente en el body del PATCH, sin validar todavía. */
export interface LeadPatchBody {
    status?: unknown
    assigned_to?: unknown
}

export type LeadPatchDecision =
    | { ok: true; status?: LeadStatus; assignedTo?: string | null; onlyOwn: boolean }
    | { ok: false; code: 400 | 403; error: string }

/**
 * Valida el body y resuelve el alcance del cambio.
 *
 * `onlyOwn` es la parte que importa para la seguridad: cuando es true, el UPDATE tiene que llevar
 * `assigned_to = <el que edita>` en el `where`, así que un closer no puede tocar el lead de otro
 * ni siquiera adivinando su id.
 */
export function decideLeadPatch(user: LeadEditor, body: LeadPatchBody): LeadPatchDecision {
    const isAdmin = user.role === 'ADMIN'
    const isCloser = user.closer_enabled === true && user.closer_type !== null
    if (!isAdmin && !isCloser) {
        return { ok: false, code: 403, error: 'Sin acceso al CRM' }
    }

    const out: { status?: LeadStatus; assignedTo?: string | null } = {}

    if (body.status !== undefined) {
        if (!isLeadStatus(body.status)) return { ok: false, code: 400, error: 'Invalid status' }
        out.status = body.status
    }

    if (body.assigned_to !== undefined) {
        // Reasignar mueve también la reunión de Google (vía /reassign): es cosa del admin.
        if (!isAdmin) return { ok: false, code: 403, error: 'Solo un admin puede reasignar un lead' }
        if (body.assigned_to === null || body.assigned_to === '') {
            out.assignedTo = null
        } else if (typeof body.assigned_to === 'string') {
            out.assignedTo = body.assigned_to
        } else {
            return { ok: false, code: 400, error: 'Invalid assigned_to' }
        }
    }

    if (out.status === undefined && out.assignedTo === undefined) {
        return { ok: false, code: 400, error: 'Nothing to update' }
    }

    return { ok: true, ...out, onlyOwn: !isAdmin }
}
