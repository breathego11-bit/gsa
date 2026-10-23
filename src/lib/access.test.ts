import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    canAccessCRM,
    canAccessCoach,
    canAccessStudentDashboard,
    hasActivePayment,
    hasUniversalCourseAccess,
    isCloser,
    type AccessUser,
} from './access.ts'

/**
 * Matriz de permisos: qué ve cada tipo de usuario. Es la base de las pantallas del closer
 * (spec_closer_crm.md) y de los bloqueos por impago (spec_invitation_payment.md).
 */

function user(over: Partial<AccessUser> = {}): AccessUser {
    return { role: 'STUDENT', closer_enabled: false, closer_type: null, payment_status: 'none', ...over }
}

const ADMIN = user({ role: 'ADMIN' })
const CLOSER_FULL = user({ closer_enabled: true, closer_type: 'CRM_AND_COURSES' })
const CLOSER_CRM = user({ closer_enabled: true, closer_type: 'CRM_ONLY' })
const PAID = user({ payment_status: 'active' })
const COMP = user({ payment_status: 'complimentary' })
const UNPAID = user()
const PAST_DUE = user({ payment_status: 'past_due' })

test('hasActivePayment: solo active y complimentary dan acceso', () => {
    assert.ok(hasActivePayment(PAID) && hasActivePayment(COMP))
    // past_due es el bloqueo por impago: pierde el acceso conservando el progreso.
    assert.ok(!hasActivePayment(PAST_DUE))
    for (const s of ['none', 'cancelled', '']) {
        assert.ok(!hasActivePayment({ payment_status: s }), s)
    }
})

test('isCloser exige el interruptor Y el tipo', () => {
    assert.ok(isCloser(CLOSER_FULL) && isCloser(CLOSER_CRM))
    assert.ok(!isCloser(user({ closer_enabled: true, closer_type: null })))
    assert.ok(!isCloser(user({ closer_enabled: false, closer_type: 'CRM_ONLY' })))
})

test('al CRM entran admins y closers; nadie más', () => {
    assert.ok(canAccessCRM(ADMIN) && canAccessCRM(CLOSER_FULL) && canAccessCRM(CLOSER_CRM))
    // Un alumno que paga no es equipo de ventas: no ve leads ni calendario del CRM.
    assert.ok(!canAccessCRM(PAID) && !canAccessCRM(UNPAID))
})

test('acceso universal a los cursos: admin y closer con formación', () => {
    assert.ok(hasUniversalCourseAccess(ADMIN) && hasUniversalCourseAccess(CLOSER_FULL))
    assert.ok(!hasUniversalCourseAccess(CLOSER_CRM) && !hasUniversalCourseAccess(PAID))
})

test('el closer CRM only no tiene área de alumno', () => {
    assert.ok(canAccessStudentDashboard(ADMIN))
    assert.ok(canAccessStudentDashboard(CLOSER_FULL))
    assert.ok(canAccessStudentDashboard(UNPAID))
    assert.ok(!canAccessStudentDashboard(CLOSER_CRM))
})

test('coach: equipo y quien ha pagado; el impago lo pierde', () => {
    assert.ok(canAccessCoach(ADMIN) && canAccessCoach(CLOSER_CRM) && canAccessCoach(PAID) && canAccessCoach(COMP))
    // Sin pagar queda la prueba gratuita (dos transcripciones), que se decide aparte en trial.ts.
    assert.ok(!canAccessCoach(UNPAID))
    assert.ok(!canAccessCoach(PAST_DUE))
})
