import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    OVERDUE_GRACE_DAYS,
    byDueDate,
    computePaymentStatus,
    isOverdue,
    isOwed,
    livePlanIds,
    offsetDueLabel,
    pauseDate,
    paymentLabel,
    type PaymentRuleInput,
} from './payment-rules.ts'

/**
 * Reglas del acceso según los pagos (spec_invitation_payment.md): quién debe qué, cuándo se
 * considera vencida una cuota y cuándo se pausa el acceso por impago.
 */

const D = (s: string) => new Date(s)
const pay = (
    status: string,
    plan: string | null,
    due: string | null,
    notice: string | null = null,
): PaymentRuleInput => ({
    status,
    installment_plan_id: plan,
    due_date: due ? D(due) : null,
    overdue_notice_sent_at: notice ? D(notice) : null,
})

test('la gracia se cuenta desde el día del aviso, a 00:00 UTC', () => {
    assert.equal(OVERDUE_GRACE_DAYS, 3)
    assert.equal(pauseDate(D('2026-09-19T09:00:00Z'))!.toISOString(), '2026-09-22T00:00:00.000Z')
    // Sin aviso no hay fecha de pausa: nadie se bloquea sin haber sido avisado.
    assert.equal(pauseDate(null), null)
})

test('invitación "pagará al registrarse": sin pagar nada se queda sin acceso', () => {
    const plan = [pay('pending', 'A', '2026-09-19T10:00:00Z'), pay('pending', 'A', '2026-10-19')]
    assert.equal(computePaymentStatus(plan, D('2026-09-25')), 'none')
})

test('con la cuota 1 pagada hay acceso, y se pierde al pasar la gracia', () => {
    const now = D('2026-10-25T09:00:00Z')
    const paid = pay('completed', 'A', null)

    // Vencida pero sin aviso todavía → sigue con acceso.
    assert.equal(computePaymentStatus([paid, pay('pending', 'A', '2026-10-19')], now), 'active')
    // Avisada el 23 → se pausa el 26; el 25 aún tiene acceso.
    assert.equal(
        computePaymentStatus([paid, pay('pending', 'A', '2026-10-19', '2026-10-23T09:00:00Z')], now),
        'active',
    )
    // Avisada el 22 → se pausa el 25 a las 00:00; el 25 a las 09:00 ya está pausado.
    assert.equal(
        computePaymentStatus([paid, pay('pending', 'A', '2026-10-19', '2026-10-22T09:00:00Z')], now),
        'past_due',
    )
    // Y al pagarla recupera el acceso.
    assert.equal(
        computePaymentStatus([paid, pay('completed', 'A', '2026-10-19', '2026-10-22T09:00:00Z')], now),
        'active',
    )
})

test('un checkout abandonado no bloquea a nadie', () => {
    const now = D('2026-10-25T09:00:00Z')
    // Plan B sin ninguna cuota pagada: es un checkout que el alumno dejó a medias.
    assert.equal(
        computePaymentStatus([pay('completed', 'A', null), pay('pending', 'B', '2026-01-01', '2026-01-01')], now),
        'active',
    )
    // Pago único cobrado + plan de cuotas abandonado antes: tampoco.
    assert.equal(
        computePaymentStatus([pay('completed', null, null), pay('pending', 'B', '2026-01-01')], now),
        'active',
    )
})

test('se le reclama todo a quien entró por invitación; al resto, solo su plan vivo', () => {
    const payments = [
        pay('completed', 'A', null),
        pay('pending', 'A', '2026-11-19'),
        pay('pending', 'B', '2026-01-01'), // checkout abandonado
        pay('pending', null, null), // pago único sin completar
    ]
    const live = livePlanIds(payments)
    assert.deepEqual(live, new Set(['A']))
    assert.deepEqual(
        payments.map((p) => isOwed(p, live, false)),
        [false, true, false, false],
    )
    assert.deepEqual(
        payments.map((p) => isOwed(p, live, true)),
        [false, true, true, true],
    )
})

test('solo vence lo de un plan con algo pagado', () => {
    const now = D('2026-10-25')
    const live = livePlanIds([pay('completed', 'A', null)])
    assert.ok(isOverdue(pay('pending', 'A', '2026-10-19'), live, now))
    assert.ok(!isOverdue(pay('pending', 'B', '2026-10-19'), live, now)) // plan abandonado
    assert.ok(!isOverdue(pay('pending', 'A', '2026-12-19'), live, now)) // aún no vence
    assert.ok(!isOverdue(pay('completed', 'A', '2026-10-19'), live, now)) // ya pagada
})

test('se cobra primero lo que vence antes; lo sin fecha, al final', () => {
    const sorted = [
        { due_date: null, installment_number: null },
        { due_date: D('2026-11-01'), installment_number: 3 },
        { due_date: D('2026-10-01'), installment_number: 2 },
    ].sort(byDueDate)
    assert.deepEqual(
        sorted.map((s) => s.installment_number),
        [2, 3, null],
    )
})

test('cómo se llama cada pago ante el alumno', () => {
    assert.equal(paymentLabel({ payment_type: 'installment', installment_number: 2 }), 'Cuota 2')
    assert.equal(paymentLabel({ payment_type: 'one_time', installment_number: null }), 'Pago completo')
    // Cuota sin número (dato viejo): mejor "Pago completo" que "Cuota null".
    assert.equal(paymentLabel({ payment_type: 'installment', installment_number: null }), 'Pago completo')
})

test('las cuotas sin fecha se explican por su desfase', () => {
    assert.equal(offsetDueLabel(30), 'Vence 30 días después del primer pago')
    assert.equal(offsetDueLabel(null), null)
    assert.equal(offsetDueLabel(0), null)
})
