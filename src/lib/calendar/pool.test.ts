import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    CLOSER_WHERE,
    POOL_MEMBER_WHERE,
    SELF_SERVICE_TARGET_WHERE,
    TEAM_MEMBER_WHERE,
    canReceiveLeads,
    disconnectRevokesAuthorization,
    isLeadAuthorized,
    showsOwnLeads,
    type PoolCandidate,
} from './pool.ts'

/**
 * Quién entra al reparto de leads (spec_closer_leads_review_fixes.md). Es la regla que evita que un
 * closer se meta solo en el reparto y absorba las reuniones de aplica y del VSL.
 *
 * `lead_booking_enabled`    = conectó su calendario para el reparto (lo escriben conectar/desconectar).
 * `lead_booking_authorized` = un admin autorizó a este closer.
 */

function who(over: Partial<PoolCandidate>): PoolCandidate {
    return {
        role: 'STUDENT',
        closer_enabled: false,
        closer_type: null,
        lead_booking_enabled: false,
        lead_booking_authorized: false,
        ...over,
    }
}

const CLOSER = { closer_enabled: true, closer_type: 'CRM_ONLY' as const }

test('el admin entra al reparto con solo conectar; no necesita autorización', () => {
    assert.ok(canReceiveLeads(who({ role: 'ADMIN', lead_booking_enabled: true })))
    assert.ok(!canReceiveLeads(who({ role: 'ADMIN', lead_booking_enabled: false })))
    assert.ok(isLeadAuthorized(who({ role: 'ADMIN' })))
})

test('un closer necesita las dos cosas: calendario conectado y autorización del admin', () => {
    assert.ok(canReceiveLeads(who({ ...CLOSER, lead_booking_enabled: true, lead_booking_authorized: true })))
    // Conectó por su cuenta, pero nadie lo autorizó: es el caso que había que cerrar.
    assert.ok(!canReceiveLeads(who({ ...CLOSER, lead_booking_enabled: true, lead_booking_authorized: false })))
    // Autorizado, pero sin calendario: no hay dónde crearle las reuniones.
    assert.ok(!canReceiveLeads(who({ ...CLOSER, lead_booking_enabled: false, lead_booking_authorized: true })))
})

test('al desplegar, un closer que ya había conectado con la regla vieja NO queda autorizado', () => {
    // La columna nueva nace en false: conserva lead_booking_enabled, pero eso ya no basta.
    const legacy = who({ ...CLOSER, lead_booking_enabled: true })
    assert.ok(!isLeadAuthorized(legacy))
    assert.ok(!canReceiveLeads(legacy))
})

test('sin rol de closer no hay reparto, aunque conserve las dos banderas', () => {
    const flags = { lead_booking_enabled: true, lead_booking_authorized: true }
    for (const u of [
        who({ ...flags }), // estudiante
        who({ ...flags, closer_enabled: false, closer_type: null }), // ex-closer
        who({ ...flags, closer_enabled: true, closer_type: null }), // interruptor sin tipo
    ]) {
        assert.ok(!canReceiveLeads(u))
        assert.ok(!isLeadAuthorized(u))
    }
})

test('la condición de Prisma exige lo mismo que la versión pura', () => {
    // No se puede ejecutar la consulta sin base de datos, pero sí comprobar que pide las tres cosas.
    assert.equal(POOL_MEMBER_WHERE.lead_booking_enabled, true)
    assert.deepEqual(POOL_MEMBER_WHERE.OR, [
        { role: 'ADMIN' },
        { closer_enabled: true, closer_type: { not: null }, lead_booking_authorized: true },
    ])
    // El equipo (para asignar a mano) no exige autorización, pero sí ser admin o closer.
    assert.deepEqual(TEAM_MEMBER_WHERE.OR, [{ role: 'ADMIN' }, { closer_enabled: true, closer_type: { not: null } }])
})

test('un closer solo puede pasar sus reuniones a alguien del reparto con calendario activo', () => {
    // Es lo que exige /google/disconnect a un no-admin: sin esto, la API aceptaba cualquier
    // transfer_to con acceso al CRM, incluido alguien que el admin dejó fuera del reparto.
    assert.equal(SELF_SERVICE_TARGET_WHERE.lead_booking_enabled, true)
    assert.deepEqual(SELF_SERVICE_TARGET_WHERE.OR, POOL_MEMBER_WHERE.OR)
    assert.deepEqual(SELF_SERVICE_TARGET_WHERE.calendars, { some: { provider: 'GOOGLE', status: 'active' } })
})

test('la definición de closer es una sola en todas las consultas', () => {
    assert.deepEqual(CLOSER_WHERE, { closer_enabled: true, closer_type: { not: null } })
    assert.deepEqual(TEAM_MEMBER_WHERE.OR[1], CLOSER_WHERE)
    const { lead_booking_authorized, ...closerPart } = POOL_MEMBER_WHERE.OR[1] as Record<string, unknown>
    assert.equal(lead_booking_authorized, true)
    assert.deepEqual(closerPart, CLOSER_WHERE)
})

test('desconectar a otro es una baja: retira la autorización; desconectarse a sí mismo, no', () => {
    assert.ok(disconnectRevokesAuthorization('admin_1', 'closer_9'))
    assert.ok(!disconnectRevokesAuthorization('closer_9', 'closer_9'))
})

test('"Mis leads" se ve si está autorizado o si tiene leads de antes', () => {
    assert.ok(showsOwnLeads(true, 0))
    // Le retiraron la autorización con reuniones pendientes: siguen siendo suyas.
    assert.ok(showsOwnLeads(false, 3))
    assert.ok(!showsOwnLeads(false, 0))
})
