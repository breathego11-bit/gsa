import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POOL_MEMBER_WHERE, canReceiveLeads, connectionTogglesPool, showsOwnLeads, type PoolCandidate } from './pool.ts'

/**
 * Quién entra al reparto de leads (spec_closer_leads_access.md). Es la regla que evita que un
 * closer se meta solo en el reparto y absorba las reuniones de aplica y del VSL.
 */

function who(over: Partial<PoolCandidate>): PoolCandidate {
    return { role: 'STUDENT', closer_enabled: false, closer_type: null, lead_booking_enabled: false, ...over }
}

const ADMIN_IN = who({ role: 'ADMIN', lead_booking_enabled: true })
const ADMIN_OUT = who({ role: 'ADMIN', lead_booking_enabled: false })
const CLOSER_AUTH = who({ closer_enabled: true, closer_type: 'CRM_ONLY', lead_booking_enabled: true })
const CLOSER_NOAUTH = who({ closer_enabled: true, closer_type: 'CRM_AND_COURSES', lead_booking_enabled: false })

test('entra al reparto: admin o closer, y autorizado', () => {
    assert.ok(canReceiveLeads(ADMIN_IN))
    assert.ok(canReceiveLeads(CLOSER_AUTH))
})

test('un closer sin autorización no recibe leads aunque conecte su calendario', () => {
    assert.ok(!canReceiveLeads(CLOSER_NOAUTH))
    assert.ok(!canReceiveLeads(ADMIN_OUT))
})

test('a quien se le quitó el rol de closer no recibe leads aunque conserve la bandera', () => {
    // El hueco que había: el reparto solo miraba la bandera, no si seguía siendo closer.
    const exCloser = who({ closer_enabled: false, closer_type: null, lead_booking_enabled: true })
    const halfCloser = who({ closer_enabled: true, closer_type: null, lead_booking_enabled: true })
    const student = who({ lead_booking_enabled: true })
    for (const u of [exCloser, halfCloser, student]) {
        assert.ok(!canReceiveLeads(u))
    }
})

test('la condición de Prisma exige lo mismo que la versión pura', () => {
    // No se puede ejecutar la consulta sin base de datos, pero sí comprobar que pide las dos cosas.
    assert.equal(POOL_MEMBER_WHERE.lead_booking_enabled, true)
    assert.deepEqual(POOL_MEMBER_WHERE.OR, [
        { role: 'ADMIN' },
        { closer_enabled: true, closer_type: { not: null } },
    ])
})

test('conectar o desconectar solo mueve del reparto a los admins', () => {
    assert.ok(connectionTogglesPool('ADMIN'))
    // En un closer la bandera es la autorización del admin: ni la da conectar ni la quita desconectar.
    assert.ok(!connectionTogglesPool('STUDENT'))
})

test('"Mis leads" se ve si está autorizado o si tiene leads de antes', () => {
    assert.ok(showsOwnLeads(true, 0))
    // Le retiraron la autorización con reuniones pendientes: siguen siendo suyas.
    assert.ok(showsOwnLeads(false, 3))
    assert.ok(!showsOwnLeads(false, 0))
})
