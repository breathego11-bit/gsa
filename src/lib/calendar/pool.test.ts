import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    CLOSER_WHERE,
    POOL_MEMBER_WHERE,
    SELF_SERVICE_TARGET_WHERE,
    TEAM_MEMBER_WHERE,
    isLeadAuthorized,
    isOffboarding,
    showsOwnLeads,
    type LeadAuthCandidate,
} from './pool.ts'

/**
 * Quién entra al reparto de leads (spec_closer_leads_review_fixes.md). Es la regla que evita que un
 * closer se meta solo en el reparto y absorba las reuniones de aplica y del VSL.
 *
 * Los tests de la consulta comprueban el objeto `where` que se ejecuta de verdad, no una copia en
 * JS: si alguien cambia la condición, estos tests lo ven.
 */

function who(over: Partial<LeadAuthCandidate>): LeadAuthCandidate {
    return { role: 'STUDENT', closer_enabled: false, closer_type: null, lead_booking_authorized: false, ...over }
}

const CLOSER = { closer_enabled: true, closer_type: 'CRM_ONLY' as const }

// ── La consulta del reparto ───────────────────────────────────────────────────

test('el reparto exige calendario puesto a disposición y no estar bloqueado', () => {
    assert.equal(POOL_MEMBER_WHERE.lead_booking_enabled, true)
    // Un bloqueado no puede ni iniciar sesión: darle leads es dárselos a nadie.
    assert.equal(POOL_MEMBER_WHERE.blocked, false)
})

test('al reparto entran los admins y los closers autorizados; nadie más', () => {
    assert.deepEqual(POOL_MEMBER_WHERE.OR, [
        { role: 'ADMIN' },
        { closer_enabled: true, closer_type: { not: null }, lead_booking_authorized: true },
    ])
})

test('el equipo (para asignar a mano) no exige autorización, pero sí ser admin o closer y no estar bloqueado', () => {
    assert.equal(TEAM_MEMBER_WHERE.blocked, false)
    assert.deepEqual(TEAM_MEMBER_WHERE.OR, [{ role: 'ADMIN' }, { closer_enabled: true, closer_type: { not: null } }])
})

test('un closer solo puede pasar sus reuniones a alguien del reparto con calendario activo', () => {
    // Es lo que exige /google/disconnect a un no-admin: sin esto, la API aceptaba cualquier
    // transfer_to con acceso al CRM, incluido alguien que el admin dejó fuera del reparto.
    assert.equal(SELF_SERVICE_TARGET_WHERE.lead_booking_enabled, true)
    assert.equal(SELF_SERVICE_TARGET_WHERE.blocked, false)
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

// ── La autorización (menú y avisos) ───────────────────────────────────────────

test('el admin siempre está autorizado; el closer, solo si un admin lo activa', () => {
    assert.ok(isLeadAuthorized(who({ role: 'ADMIN' })))
    assert.ok(isLeadAuthorized(who({ ...CLOSER, lead_booking_authorized: true })))
    assert.ok(!isLeadAuthorized(who({ ...CLOSER, lead_booking_authorized: false })))
})

test('al desplegar, ningún closer queda autorizado', () => {
    // La columna nace en false, aunque ya hubiera conectado su calendario con la regla vieja.
    assert.ok(!isLeadAuthorized(who({ ...CLOSER })))
})

test('sin rol de closer no hay autorización, aunque conserve la bandera', () => {
    for (const u of [
        who({ lead_booking_authorized: true }), // estudiante
        who({ closer_enabled: false, closer_type: null, lead_booking_authorized: true }), // ex-closer
        who({ closer_enabled: true, closer_type: null, lead_booking_authorized: true }), // interruptor sin tipo
    ]) {
        assert.ok(!isLeadAuthorized(u))
    }
})

test('"Mis leads" se ve si está autorizado o si tiene leads de antes', () => {
    assert.ok(showsOwnLeads(true, 0))
    // Le retiraron la autorización con reuniones pendientes: siguen siendo suyas.
    assert.ok(showsOwnLeads(false, 3))
    assert.ok(!showsOwnLeads(false, 0))
})

// ── Desconectar ───────────────────────────────────────────────────────────────

test('desconectar a otro es una baja; desconectarse a sí mismo, no', () => {
    // En una baja se retira la autorización y se pasa toda la cartera; si se desconecta él
    // mismo, conserva la autorización y solo se le mueven las reuniones futuras.
    assert.ok(isOffboarding('admin_1', 'closer_9'))
    assert.ok(!isOffboarding('closer_9', 'closer_9'))
    assert.ok(!isOffboarding('admin_1', 'admin_1'))
})
