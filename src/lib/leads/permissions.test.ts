import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideLeadPatch, isLeadStatus, type LeadEditor } from './permissions.ts'

/**
 * Permisos del PATCH de un lead. Es la regla que separa "el closer gestiona sus leads" de
 * "el closer toca los leads de todo el equipo", así que se prueba caso por caso.
 */

const ADMIN: LeadEditor = { role: 'ADMIN', closer_enabled: false, closer_type: null }
const CLOSER: LeadEditor = { role: 'STUDENT', closer_enabled: true, closer_type: 'CRM_AND_COURSES' }
const CRM_ONLY: LeadEditor = { role: 'STUDENT', closer_enabled: true, closer_type: 'CRM_ONLY' }
const STUDENT: LeadEditor = { role: 'STUDENT', closer_enabled: false, closer_type: null }
/** Interruptor activado pero sin tipo: no es closer (misma regla que `isCloser`). */
const HALF_CLOSER: LeadEditor = { role: 'STUDENT', closer_enabled: true, closer_type: null }

test('el admin cambia el estado de cualquier lead', () => {
    const d = decideLeadPatch(ADMIN, { status: 'CONTACTADO' })
    assert.deepEqual(d, { ok: true, status: 'CONTACTADO', onlyOwn: false })
})

test('el admin puede reasignar y desasignar', () => {
    assert.deepEqual(decideLeadPatch(ADMIN, { assigned_to: 'user_1' }), {
        ok: true,
        assignedTo: 'user_1',
        onlyOwn: false,
    })
    for (const empty of [null, '']) {
        assert.deepEqual(decideLeadPatch(ADMIN, { assigned_to: empty }), {
            ok: true,
            assignedTo: null,
            onlyOwn: false,
        })
    }
})

test('el closer cambia el estado, pero solo de sus leads', () => {
    for (const user of [CLOSER, CRM_ONLY]) {
        const d = decideLeadPatch(user, { status: 'AGENDADO' })
        // `onlyOwn` es lo que obliga al UPDATE a llevar `assigned_to = él` en el where.
        assert.deepEqual(d, { ok: true, status: 'AGENDADO', onlyOwn: true })
    }
})

test('el closer NO puede reasignar un lead', () => {
    const d = decideLeadPatch(CLOSER, { assigned_to: 'otro_closer' })
    assert.deepEqual(d, { ok: false, code: 403, error: 'Solo un admin puede reasignar un lead' })
})

test('el closer no se cuela reasignando junto con un cambio de estado', () => {
    const d = decideLeadPatch(CLOSER, { status: 'CONTACTADO', assigned_to: 'yo_mismo' })
    assert.equal(d.ok, false)
    assert.equal(d.ok === false && d.code, 403)
})

test('quien no es admin ni closer no edita nada', () => {
    for (const user of [STUDENT, HALF_CLOSER]) {
        const d = decideLeadPatch(user, { status: 'CONTACTADO' })
        assert.deepEqual(d, { ok: false, code: 403, error: 'Sin acceso al CRM' })
    }
})

test('un estado inventado se rechaza con 400', () => {
    for (const bad of ['GANADO', '', 'nuevo', 42, null]) {
        const d = decideLeadPatch(ADMIN, { status: bad })
        assert.deepEqual(d, { ok: false, code: 400, error: 'Invalid status' })
    }
})

test('un assigned_to que no es texto se rechaza con 400', () => {
    const d = decideLeadPatch(ADMIN, { assigned_to: 123 })
    assert.deepEqual(d, { ok: false, code: 400, error: 'Invalid assigned_to' })
})

test('un body vacío no genera un UPDATE', () => {
    assert.deepEqual(decideLeadPatch(ADMIN, {}), { ok: false, code: 400, error: 'Nothing to update' })
})

test('isLeadStatus solo acepta los cuatro estados del CRM', () => {
    assert.ok(isLeadStatus('NUEVO') && isLeadStatus('DESCARTADO'))
    assert.ok(!isLeadStatus('PERDIDO') && !isLeadStatus(undefined))
})
