import { describe, expect, it } from 'vitest'

import { computeDebtPlan, myMinimumOf, paymentPeriods, sharedPortionOf } from './debt-plan'
import { debt, entry } from './test-fixtures'
import type { DebtStrategy } from './types'

const cardA = debt({
    id: 'card',
    minimumPayment: 150_000,
    monthlyRate: 0.025,
    name: 'Tarjeta A',
    sortOrder: 0,
    totalBalance: 2_000_000,
})

const personalLoan = debt({
    id: 'loan',
    insuranceRate: 0.002,
    minimumPayment: 300_000,
    monthlyRate: 0.018,
    name: 'Libre inversión',
    sortOrder: 1,
    totalBalance: 5_000_000,
})

const sharedPhone = debt({
    id: 'phone',
    minimumPayment: 120_000,
    monthlyRate: 0.022,
    name: 'Celular compartido',
    partnerContribution: 60_000,
    paymentCap: 100_000,
    sharedPercent: 50,
    sortOrder: 2,
    totalBalance: 1_200_000,
})

const monthEntries = [
    entry('Pago tarjeta', 200_000, 'DEBT', { debtId: 'card' }),
    entry('Cuota libre inversión', 300_000, 'DEBT', { debtId: 'loan' }),
    entry('Cuota celular', 100_000, 'DEBT', { debtId: 'phone' }),
    entry('Mercado', 400_000, 'POCKET'),
]

function plan(redirectOverpayments: boolean) {
    return computeDebtPlan({
        available: 900_000,
        cushion: 500_000,
        debts: [cardA, personalLoan, sharedPhone],
        entries: monthEntries,
        redirectOverpayments,
    })
}

describe('paymentPeriods (Excel ROUNDUP(NPER))', () => {
    it('rounds the number of periods up', () => {
        expect(paymentPeriods(0.025, 600_000, 2_000_000)).toBe(4)
        expect(paymentPeriods(0.02, 300_000, 5_000_000)).toBe(21)
    })

    it('returns null when the payment does not cover the interest', () => {
        expect(paymentPeriods(0.03, 200_000, 10_000_000)).toBeNull()
    })

    it('divides plainly when there is no interest', () => {
        expect(paymentPeriods(0, 300_000, 1_000_000)).toBe(4)
    })

    it('needs zero periods for a paid-off balance', () => {
        expect(paymentPeriods(0.02, 100_000, 0)).toBe(0)
    })
})

describe('debt row helpers', () => {
    it('reads the shared portion from a percentage or a fixed amount', () => {
        expect(sharedPortionOf(sharedPhone)).toBe(600_000)
        expect(sharedPortionOf({ ...cardA, sharedAmount: 250_000 })).toBe(250_000)
    })

    it('derives my minimum from the total minimum minus the partner contribution', () => {
        expect(myMinimumOf(sharedPhone)).toBe(60_000)
        expect(myMinimumOf({ ...sharedPhone, myMinimumOverride: 70_000 })).toBe(70_000)
    })
})

describe('computeDebtPlan without redirecting overpayments', () => {
    const result = plan(false)
    const [first, second, third] = result.rows

    it('orders debts by monthly cost, most expensive first', () => {
        expect(result.rows.map((row) => [row.debt.name, row.priority])).toEqual([
            ['Tarjeta A', 1],
            ['Celular compartido', 2],
            ['Libre inversión', 3],
        ])
    })

    it('builds the extra pool from the surplus over the cushion', () => {
        expect(result.excess).toBe(400_000)
        expect(result.pool).toBe(400_000)
        expect(result.unassigned).toBe(0)
    })

    it('reads the current payment from the month rows linked to each debt', () => {
        expect(result.rows.map((row) => row.currentPayment)).toEqual([200_000, 100_000, 300_000])
    })

    it('sends the whole extra to the most expensive debt', () => {
        expect(first.capacity).toBe(1_800_000)
        expect(first.extra).toBe(400_000)
        expect(first.recommended).toBe(600_000)
        expect(first.action).toBe('KILL_FIRST')
        expect(first.monthsRemaining).toBe(4)
    })

    it('stops a capped debt at its agreed cap', () => {
        expect(second.myBalance).toBe(600_000)
        expect(second.capacity).toBe(0)
        expect(second.extra).toBe(0)
        expect(second.recommended).toBe(100_000)
        expect(second.action).toBe('AT_CAP')
        expect(second.totalMonthly).toBe(160_000)
        expect(second.monthsRemaining).toBe(9)
    })

    it('keeps the cheapest debt on its base payment', () => {
        expect(third.monthlyCost).toBeCloseTo(0.02, 10)
        expect(third.extra).toBe(0)
        expect(third.action).toBe('BASE_ONLY')
        expect(third.monthsRemaining).toBe(21)
    })

    it('leaves exactly the cushion after paying what it recommends', () => {
        expect(result.recommendedTotal).toBe(1_000_000)
        expect(result.availableAfterRecommended).toBe(500_000)
        expect(result.killFirst?.debt.name).toBe('Tarjeta A')
    })

    it('reports the equivalent annual rate', () => {
        expect(first.effectiveAnnualRate).toBeCloseTo(Math.pow(1.025, 12) - 1, 10)
    })
})

describe('computeDebtPlan redirecting overpayments', () => {
    const result = plan(true)
    const [first, second] = result.rows

    it('adds what is paid over the minimums to the extra pool', () => {
        expect(result.myMinimumTotal).toBe(510_000)
        expect(result.pool).toBe(490_000)
    })

    it('uses the minimums as the base and gives the pool to the first priority', () => {
        expect(first.base).toBe(150_000)
        expect(first.extra).toBe(490_000)
        expect(first.recommended).toBe(640_000)
        expect(second.base).toBe(60_000)
        expect(second.recommended).toBe(60_000)
        expect(second.action).toBe('BASE_ONLY')
    })
})

describe('computeDebtPlan edge cases', () => {
    it('breaks cost ties by the order of the debts', () => {
        const result = computeDebtPlan({
            available: 0,
            cushion: 0,
            debts: [
                debt({ id: 'b', monthlyRate: 0.02, name: 'Segunda', sortOrder: 1, totalBalance: 100 }),
                debt({ id: 'a', monthlyRate: 0.02, name: 'Primera', sortOrder: 0, totalBalance: 100 }),
            ],
            entries: [],
            redirectOverpayments: false,
        })

        expect(result.rows.map((row) => row.debt.name)).toEqual(['Primera', 'Segunda'])
    })

    it('ignores paid debts', () => {
        const result = computeDebtPlan({
            available: 0,
            cushion: 0,
            debts: [{ ...cardA, status: 'PAID' }],
            entries: [],
            redirectOverpayments: false,
        })

        expect(result.rows).toHaveLength(0)
        expect(result.killFirst).toBeNull()
    })

    it('has no pool when available is below the cushion', () => {
        const result = computeDebtPlan({
            available: 300_000,
            cushion: 500_000,
            debts: [cardA],
            entries: [],
            redirectOverpayments: false,
        })

        expect(result.excess).toBe(0)
        expect(result.rows[0].extra).toBe(0)
        expect(result.rows[0].monthsRemaining).toBeNull()
    })
})

describe('debt strategies', () => {
    const debts = [cardA, personalLoan, sharedPhone]

    function strategyPlan(strategy: DebtStrategy, cashFlowTight = false) {
        return computeDebtPlan({
            available: 900_000,
            cashFlowTight,
            cushion: 500_000,
            debts,
            entries: monthEntries,
            redirectOverpayments: false,
            strategy,
        })
    }

    const order = (strategy: DebtStrategy, cashFlowTight = false) =>
        strategyPlan(strategy, cashFlowTight).rows.map((row) => row.debt.id)

    it('puts the most expensive debt first with avalanche', () => {
        expect(order('AVALANCHE')).toEqual(['card', 'phone', 'loan'])
    })

    it('puts the biggest monthly installment first with highest payment', () => {
        expect(order('HIGHEST_PAYMENT')).toEqual(['loan', 'card', 'phone'])
    })

    it('puts the smallest monthly installment first with lowest payment', () => {
        expect(order('LOWEST_PAYMENT')).toEqual(['phone', 'card', 'loan'])
    })

    it('recommends avalanche when the month clears the cushion', () => {
        expect(strategyPlan('RECOMMENDED', false).strategy).toBe('AVALANCHE')
        expect(order('RECOMMENDED', false)).toEqual(['card', 'phone', 'loan'])
    })

    it('recommends freeing cash flow first when the month is below the cushion', () => {
        const result = strategyPlan('RECOMMENDED', true)

        expect(result.strategy).toBe('CASH_FLOW')
        expect(result.requestedStrategy).toBe('RECOMMENDED')
        expect(order('RECOMMENDED', true)).toEqual(['phone', 'card', 'loan'])
    })

    it('sends the extra money to the first debt of the chosen strategy', () => {
        const result = strategyPlan('HIGHEST_PAYMENT')
        const loan = result.rows.find((row) => row.debt.id === 'loan')

        expect(result.killFirst?.debt.id).toBe('loan')
        expect(loan?.extra).toBe(400_000)
        expect(loan?.action).toBe('KILL_FIRST')
    })
})

// F-DATA-04: el tope y el saldo liquidable acotan la recomendación. null = sin tope; 0 es un tope
// real. Un tope menor que la cuota mínima es una restricción inviable: se recomienda la mínima
// (pagar menos sería mora) y la fila lo declara.
describe('computeDebtPlan caps and payable balance', () => {
    function single(overrides: Parameters<typeof debt>[0], redirectOverpayments = true) {
        return computeDebtPlan({
            available: 1_500,
            cushion: 1_000,
            debts: [debt({ monthlyRate: 0.02, ...overrides })],
            entries: [],
            redirectOverpayments,
        }).rows[0]
    }

    it('recommends the minimum and flags a cap below it as infeasible', () => {
        const row = single({ id: 'a', minimumPayment: 200, name: 'Tope bajo', paymentCap: 100, totalBalance: 1_000 })

        expect(row.recommended).toBe(200)
        expect(row.extra).toBe(0)
        expect(row.capBelowMinimum).toBe(true)
    })

    it('treats an explicit zero cap as a cap, not as unlimited', () => {
        const row = single({ id: 'b', minimumPayment: 200, name: 'Tope cero', paymentCap: 0, totalBalance: 1_000 })

        expect(row.recommended).toBe(200)
        expect(row.capBelowMinimum).toBe(true)
        expect(single({ id: 'c', name: 'Tope cero sin mínima', paymentCap: 0, totalBalance: 1_000 }).recommended).toBe(0)
    })

    it('keeps a zero-capped minimum as base with no extra when current payments are not redirected', () => {
        const result = computeDebtPlan({
            available: 1_500,
            cushion: 1_000,
            debts: [
                debt({ id: 'zero-cap', minimumPayment: 200, monthlyRate: 0.03, name: 'Tope cero', paymentCap: 0, totalBalance: 1_000 }),
                debt({ id: 'uncapped', monthlyRate: 0.01, name: 'Sin tope', paymentCap: null, sortOrder: 1, totalBalance: 1_000 }),
            ],
            entries: [],
            redirectOverpayments: false,
        })

        expect(result.rows.map((row) => [row.debt.id, row.base, row.extra, row.recommended, row.capBelowMinimum])).toEqual([
            ['zero-cap', 200, 0, 200, true],
            ['uncapped', 0, 300, 300, false],
        ])
        expect(result.pool).toBe(300)
        expect(result.availableAfterRecommended).toBe(1_000)
    })

    it('reports the real cushion shortfall when an incompatible cap requires an unfunded minimum', () => {
        const result = computeDebtPlan({
            available: 1_100,
            cushion: 1_000,
            debts: [
                debt({ id: 'low-cap', minimumPayment: 200, monthlyRate: 0.03, name: 'Tope bajo', paymentCap: 100, totalBalance: 1_000 }),
                debt({ id: 'uncapped', monthlyRate: 0.01, name: 'Sin tope', paymentCap: null, sortOrder: 1, totalBalance: 1_000 }),
            ],
            entries: [entry('Pago parcial', 50, 'DEBT', { debtId: 'low-cap' })],
            redirectOverpayments: false,
        })

        expect(result.rows.map((row) => [row.base, row.extra, row.recommended])).toEqual([
            [200, 0, 200],
            [0, 0, 0],
        ])
        expect(result.pool).toBe(0)
        expect(result.unassigned).toBe(0)
        expect(result.availableAfterRecommended).toBe(950)
        expect(result.availableAfterRecommended).toBeLessThan(result.cushion)
    })

    it('never recommends more than the payable balance, even with a higher cap or minimum', () => {
        expect(single({ id: 'd', name: 'Saldo chico', paymentCap: 2_000, totalBalance: 100 }).recommended).toBe(100)
        expect(single({ id: 'e', minimumPayment: 500, name: 'Mínima mayor al saldo', totalBalance: 100 }).recommended).toBe(100)
        expect(single({ id: 'f', name: 'Sin tope', totalBalance: 300 }).recommended).toBe(300)
    })

    it('passes what one debt cannot absorb to the next priority', () => {
        const result = computeDebtPlan({
            available: 1_500,
            cushion: 1_000,
            debts: [
                debt({ id: 'g', monthlyRate: 0.03, name: 'Cara y pequeña', sortOrder: 0, totalBalance: 100 }),
                debt({ id: 'h', monthlyRate: 0.01, name: 'Barata', sortOrder: 1, totalBalance: 5_000 }),
            ],
            entries: [],
            redirectOverpayments: true,
        })

        expect(result.rows.map((row) => [row.debt.name, row.recommended])).toEqual([
            ['Cara y pequeña', 100],
            ['Barata', 400],
        ])
        expect(result.unassigned).toBe(0)
    })
})

// F-DATA-12: la parte compartida nunca supera el saldo total; mi saldo y las barras no salen de 0..100 %.
describe('shared portion bounded by the total balance', () => {
    it('never produces a negative personal balance', () => {
        const overShared = debt({ id: 'i', name: 'Compartida de más', sharedAmount: 200, totalBalance: 100 })

        expect(sharedPortionOf(overShared)).toBe(100)

        const [row] = computeDebtPlan({
            available: 0,
            cushion: 0,
            debts: [overShared],
            entries: [],
            redirectOverpayments: false,
        }).rows

        expect(row.myBalance).toBe(0)
        expect(row.sharedPortion).toBe(100)
    })
})
