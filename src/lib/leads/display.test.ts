import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LEAD_STATUS_META, igHandle, sortOwnLeads, waLink } from './display.ts'
import { LEAD_STATUSES } from './permissions.ts'

/** Presentación de los leads del closer: orden de la lista y enlaces de contacto. */

const D = (s: string) => new Date(s)
const NOW = D('2026-10-28T12:00:00Z')

test('la próxima reunión va primero; lo ya celebrado, al final', () => {
    const leads = [
        { id: 'pasada-vieja', meeting_at: D('2026-01-10T10:00:00Z'), created_at: D('2026-01-01') },
        { id: 'sin-cita', meeting_at: null, created_at: D('2026-10-20') },
        { id: 'proxima-lejana', meeting_at: D('2026-11-15T10:00:00Z'), created_at: D('2026-10-25') },
        { id: 'pasada-reciente', meeting_at: D('2026-10-27T10:00:00Z'), created_at: D('2026-10-02') },
        { id: 'proxima-ya', meeting_at: D('2026-10-28T17:00:00Z'), created_at: D('2026-10-26') },
    ]
    assert.deepEqual(
        sortOwnLeads(leads, NOW).map((l) => l.id),
        ['proxima-ya', 'proxima-lejana', 'sin-cita', 'pasada-reciente', 'pasada-vieja'],
    )
})

test('entre los que no tienen cita, el más nuevo primero', () => {
    const leads = [
        { id: 'viejo', meeting_at: null, created_at: D('2026-09-01') },
        { id: 'nuevo', meeting_at: null, created_at: D('2026-10-27') },
    ]
    assert.deepEqual(
        sortOwnLeads(leads, NOW).map((l) => l.id),
        ['nuevo', 'viejo'],
    )
})

test('no muta la lista original', () => {
    const leads = [
        { meeting_at: D('2026-11-01T10:00:00Z'), created_at: D('2026-10-01') },
        { meeting_at: null, created_at: D('2026-10-02') },
    ]
    const copy = [...leads]
    sortOwnLeads(leads, NOW)
    assert.deepEqual(leads, copy)
})

test('el WhatsApp se limpia para wa.me', () => {
    assert.equal(waLink('+34 600 123 456'), 'https://wa.me/34600123456')
    assert.equal(waLink('(57) 310-555-0000'), 'https://wa.me/573105550000')
})

test('el Instagram siempre lleva una sola arroba', () => {
    assert.equal(igHandle('ivan'), '@ivan')
    assert.equal(igHandle('@ivan'), '@ivan')
})

test('cada estado que acepta la API tiene su etiqueta en la interfaz', () => {
    for (const s of LEAD_STATUSES) {
        assert.ok(LEAD_STATUS_META[s]?.label, s)
    }
})
