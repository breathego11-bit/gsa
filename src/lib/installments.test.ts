import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OPEN_GATE, isItemLocked, itemUnlockInstallment, unlockedCount, type InstallmentGate } from './installments-math.ts'

/**
 * Desbloqueo de contenido por cuotas (spec_installment_gating.md): con `k` de `N` cuotas pagadas
 * se abren los primeros `k` tramos. Aquí se prueban las funciones puras; qué cuotas entran en el
 * cálculo (solo las de un plan con algo pagado) lo decide `livePlanIds`, probado en payment-rules.
 */

const gate = (paid: number, total: number): InstallmentGate => ({ applies: total > 0 && paid < total, total, paid })

test('sin gating se ve todo', () => {
    assert.equal(unlockedCount(10, OPEN_GATE), 10)
    assert.ok(!isItemLocked(9, 10, OPEN_GATE))
    assert.equal(itemUnlockInstallment(9, 10, OPEN_GATE), 0)
})

test('el reparto en tramos favorece al alumno', () => {
    // 10 cursos en 3 cuotas → tramo de 4 (ceil), no de 3: con una cuota ve 4.
    assert.equal(unlockedCount(10, gate(1, 3)), 4)
    assert.equal(unlockedCount(10, gate(2, 3)), 8)
    // Plan pagado del todo → sin límite.
    assert.equal(unlockedCount(10, gate(3, 3)), 10)
})

test('nunca desbloquea más de lo que hay', () => {
    assert.equal(unlockedCount(5, gate(2, 2)), 5)
    assert.equal(unlockedCount(3, gate(1, 2)), 2)
    assert.equal(unlockedCount(0, gate(1, 3)), 0)
})

test('sin ninguna cuota pagada no se abre nada', () => {
    assert.equal(unlockedCount(9, gate(0, 3)), 0)
    assert.ok(isItemLocked(0, 9, gate(0, 3)))
})

test('qué cuota abre cada ítem', () => {
    // 9 lecciones en 3 cuotas → tramos de 3: 0-2 cuota 1, 3-5 cuota 2, 6-8 cuota 3.
    const g = gate(1, 3)
    assert.deepEqual(
        [0, 2, 3, 5, 6, 8].map((i) => itemUnlockInstallment(i, 9, g)),
        [1, 1, 2, 2, 3, 3],
    )
    // Y lo que abre una cuota ya pagada no está bloqueado.
    assert.deepEqual(
        [0, 2, 3, 8].map((i) => isItemLocked(i, 9, g)),
        [false, false, true, true],
    )
})
