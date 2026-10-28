import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CLOSER_NAV, CRM_ONLY_ALLOWED, isAllowedForCrmOnly } from './access-paths.ts'

/**
 * Lo que un closer CRM_ONLY puede abrir. El test que importa es el primero: cada enlace que se le
 * enseña en el menú tiene que estar permitido, porque si no el middleware lo rebota y la pantalla
 * queda inalcanzable solo para ese tipo de closer (pasó con "Mis leads" y "Mi agenda").
 */

test('todo lo que el menú del closer enseña se puede abrir', () => {
    for (const href of Object.values(CLOSER_NAV)) {
        assert.ok(isAllowedForCrmOnly(href), `el menú enseña ${href} pero el middleware lo bloquea`)
    }
})

test('las subrutas también pasan', () => {
    assert.ok(isAllowedForCrmOnly(`${CLOSER_NAV.leads}/lead_123`))
    assert.ok(isAllowedForCrmOnly(`${CLOSER_NAV.sales}/venta_7`))
    assert.ok(isAllowedForCrmOnly('/dashboard/profile'))
})

test('el área de alumno sigue cerrada para el CRM only', () => {
    for (const p of ['/dashboard', '/dashboard/courses', '/dashboard/courses/abc']) {
        assert.ok(!isAllowedForCrmOnly(p), p)
    }
})

test('no se cuela una ruta por empezar igual que una permitida', () => {
    // `/dashboard/leadsfalsos` NO es subruta de `/dashboard/leads`.
    assert.ok(!isAllowedForCrmOnly('/dashboard/leadsfalsos'))
    assert.ok(!isAllowedForCrmOnly('/dashboard/agendaX'))
})

test('la lista no tiene duplicados', () => {
    assert.equal(new Set(CRM_ONLY_ALLOWED).size, CRM_ONLY_ALLOWED.length)
})
