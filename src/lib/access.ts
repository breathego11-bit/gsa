import type { CloserType } from '@prisma/client'

/**
 * Centralized access-control helpers for the GSA permission model.
 *
 * The permission model has three orthogonal dimensions:
 *   - `role`           — ADMIN or STUDENT (DB enum)
 *   - `closer_enabled` — master switch: is this user a closer at all? (admin-controlled)
 *   - `closer_type`    — when enabled: CRM_ONLY (CRM + Método) or CRM_AND_COURSES (everything)
 *   - `payment_status` — none | active | past_due | cancelled | complimentary
 *
 * Replace ad-hoc `if (user.closer_enabled)` or `if (enrollment)` checks with these
 * helpers so the matrix stays consistent across server and client.
 */

export interface AccessUser {
    role: string
    closer_enabled: boolean
    closer_type: CloserType | null
    payment_status: string
}

/** Active access for billing-gated features. Treats `complimentary` as paid.
 *  Takes a narrow type so callers that only have `payment_status` can use it. */
export function hasActivePayment(u: { payment_status: string }): boolean {
    return u.payment_status === 'active' || u.payment_status === 'complimentary'
}

/** True when the user has been enabled as a closer AND has a type assigned. */
export function isCloser(u: AccessUser): boolean {
    return u.closer_enabled === true && u.closer_type !== null
}

/** Sidebar item "Ventas" + all /api/sales routes. */
export function canAccessCRM(u: AccessUser): boolean {
    return u.role === 'ADMIN' || isCloser(u)
}

/**
 * Universal access to all published courses regardless of Enrollment.
 *
 * Granted to admins and to CRM_AND_COURSES closers. Regular students still need
 * an Enrollment row to access a specific course — keep using the existing checks
 * AND combine them with this helper, e.g.:
 *
 *   if (hasUniversalCourseAccess(user)) allow
 *   else if (enrollment) allow
 *   else deny
 */
export function hasUniversalCourseAccess(u: AccessUser): boolean {
    return u.role === 'ADMIN' || u.closer_type === 'CRM_AND_COURSES'
}

/** Sidebar item "Método" + /method routes — everyone authenticated. */
export function canAccessMethod(_u: AccessUser): boolean {
    return true
}

/** Sidebar item "Dashboard / Mis cursos" — students + full closers + admins.
 *  CRM_ONLY closers don't have anything in the courses area, so hide it for them. */
export function canAccessStudentDashboard(u: AccessUser): boolean {
    return u.role === 'ADMIN' || u.closer_type === 'CRM_AND_COURSES' || (u.role === 'STUDENT' && !isCloser(u))
}

/** Sidebar item "Coach IA" + rutas /api/coach/*.
 *  Decisión del cliente: cualquier usuario que haya pagado (active o complimentary),
 *  más closers y admins (staff). */
export function canAccessCoach(u: AccessUser): boolean {
    return u.role === 'ADMIN' || isCloser(u) || hasActivePayment(u)
}
