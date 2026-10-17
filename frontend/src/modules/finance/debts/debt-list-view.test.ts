import { describe, expect, it } from 'vitest'

import type { DebtPlanRow } from '../domain/debt-plan'
import { debt } from '../domain/test-fixtures'
import { getVisibleDebtRows } from './debt-list-view'

function row(id: string, name: string, overrides: Partial<DebtPlanRow> = {}): DebtPlanRow {
    return {
        action: 'BASE_ONLY',
        base: 10,
        cap: null,
        capBelowMinimum: false,
        capacity: 100,
        capacityBefore: 100,
        currentPayment: 10,
        debt: debt({ id, name, totalBalance: 100 }),
        effectiveAnnualRate: 0.2,
        extra: 0,
        monthlyCost: 0.01,
        monthsRemaining: 10,
        myBalance: 100,
        myMinimum: 10,
        myMinimumIsManual: false,
        priority: 1,
        recommended: 10,
        sharedPortion: 0,
        totalMonthly: 10,
        ...overrides,
    }
}

describe('getVisibleDebtRows', () => {
    it('busca por nombre o entidad sin distinguir mayúsculas, tildes ni espacios exteriores', () => {
        const card = row('card', 'Crédito Éxito')
        const loan = row('loan', 'Vehículo', { debt: debt({ id: 'loan', name: 'Vehículo', lender: 'Cooperativa Ágil' }) })
        const rows = [card, loan]

        expect(getVisibleDebtRows(rows, { query: '  CREDITO EXITO  ' }).map((item) => item.debt.id)).toEqual(['card'])
        expect(getVisibleDebtRows(rows, { query: 'agil' }).map((item) => item.debt.id)).toEqual(['loan'])
        expect(getVisibleDebtRows(rows, { query: 'hipoteca' })).toEqual([])
    })

    it('ordena el saldo por su valor numérico, ascendente y descendente, sin tocar las prioridades', () => {
        const rows = [
            row('ten', 'Diez', { debt: debt({ id: 'ten', name: 'Diez', totalBalance: 10 }), priority: 1 }),
            row('hundred', 'Cien', { debt: debt({ id: 'hundred', name: 'Cien', totalBalance: 100 }), priority: 2 }),
            row('two', 'Dos', { debt: debt({ id: 'two', name: 'Dos', totalBalance: 2 }), priority: 3 }),
        ]

        expect(getVisibleDebtRows(rows, { sort: { key: 'totalBalance', direction: 'asc' } }).map((item) => item.debt.id)).toEqual(['two', 'ten', 'hundred'])
        expect(getVisibleDebtRows(rows, { sort: { key: 'totalBalance', direction: 'desc' } }).map((item) => item.debt.id)).toEqual(['hundred', 'ten', 'two'])
        expect(rows.map((item) => item.priority)).toEqual([1, 2, 3])
    })

    it.each(['myBalance', 'myMinimum', 'currentPayment', 'recommended', 'monthlyCost', 'effectiveAnnualRate'] as const)('ordena %s por el valor calculado, nunca por el formato de pantalla', (key) => {
        const rows = [
            row('ten', 'Diez', { [key]: 0.1, priority: 1 }),
            row('hundred', 'Cien', { [key]: 1, priority: 2 }),
            row('two', 'Dos', { [key]: 0.02, priority: 3 }),
        ]

        expect(getVisibleDebtRows(rows, { sort: { key, direction: 'asc' } }).map((item) => item.debt.id)).toEqual(['two', 'ten', 'hundred'])
        expect(getVisibleDebtRows(rows, { sort: { key, direction: 'desc' } }).map((item) => item.debt.id)).toEqual(['hundred', 'ten', 'two'])
    })

    it('combina búsqueda por entidad y nombre con orden alfabético en español', () => {
        const rows = [
            row('zeta', 'Zeta', { debt: debt({ id: 'zeta', name: 'Zeta', lender: 'Banco Ágil' }), priority: 1 }),
            row('beta', 'Beta', { debt: debt({ id: 'beta', name: 'Beta', lender: 'Otra entidad' }), priority: 2 }),
            row('alpha', 'Álfa', { debt: debt({ id: 'alpha', name: 'Álfa', lender: 'Banco Ágil' }), priority: 3 }),
        ]

        expect(getVisibleDebtRows(rows, { query: 'banco agil', sort: { key: 'name', direction: 'asc' } }).map((item) => item.debt.id)).toEqual(['alpha', 'zeta'])
        expect(getVisibleDebtRows(rows, { query: 'banco agil', sort: { key: 'name', direction: 'desc' } }).map((item) => item.debt.id)).toEqual(['zeta', 'alpha'])
    })

    it('desempata por prioridad y después id de forma estable, también al invertir el orden', () => {
        const rows = [row('b', 'Igual', { priority: 2 }), row('a', 'Igual', { priority: 2 }), row('first', 'Igual', { priority: 1 })]

        for (const direction of ['asc', 'desc'] as const) {
            expect(getVisibleDebtRows(rows, { sort: { key: 'recommended', direction } }).map((item) => item.debt.id)).toEqual(['first', 'a', 'b'])
        }
    })

    it('limpiar la búsqueda y restablecer la estrategia recupera el orden del plan sin modificar sus filas', () => {
        const rows = [row('zeta', 'Zeta', { priority: 1, recommended: 90 }), row('alpha', 'Álfa', { priority: 2, recommended: 20 })]
        const before = JSON.stringify(rows)
        rows.forEach((item) => { Object.freeze(item.debt); Object.freeze(item) })
        Object.freeze(rows)

        expect(getVisibleDebtRows(rows, { query: 'alfa', sort: { key: 'recommended', direction: 'asc' } }).map((item) => item.debt.id)).toEqual(['alpha'])
        const reset = getVisibleDebtRows(rows, { query: '', sort: { key: 'strategy', direction: 'asc' } })

        expect(reset.map((item) => item.debt.id)).toEqual(['zeta', 'alpha'])
        expect(reset[0]).toBe(rows[0])
        expect(reset[1]).toBe(rows[1])
        expect(JSON.stringify(rows)).toBe(before)
    })
})
