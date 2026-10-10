import { describe, expect, it } from 'vitest'

import { computeSummaryRows, summarizeYear } from './annual-summary'
import { computeDebtPlan, myMinimumOf, paymentPeriods, sharedPortionOf } from './debt-plan'
import { roundHalfUp } from './money'
import { computeMonthSheet } from './month-sheet'
import { accounts, debt, entry, sampleSheet, settings } from './test-fixtures'

// Source: the owner's original workbook, read on 2026-10-10, SHA-256
// 6354cd527eea2896f08d4997757bf398c01da979a2ae8cd22967c1df3fac9dab.
// S1..S8 are worksheet-order aliases. All amounts and names below are synthetic.
// These fixtures cover the shared formulas; documented cap/precision differences are not
// represented as literal Excel parity (see docs/qa-excel-paridad.md).
const fixtureSettings = { ...settings, cushionAmount: 5_000 }

function month(overrides: Parameters<typeof sampleSheet>[0] = {}) {
    return sampleSheet({
        disabilityIncome: null,
        entries: [
            entry('Subscription fixture', 100, 'SUBSCRIPTION', { accountId: 'wallet' }),
            entry('Fixed fixture', 200, 'FIXED', { accountId: 'bank' }),
            entry('Pocket fixture', 300, 'POCKET', { accountId: 'wallet' }),
            entry('Savings fixture', 400, 'SAVINGS', { accountId: 'bank' }),
            entry('Debt fixture', 500, 'DEBT', { accountId: 'bank' }),
            entry('Other fixture', 600, 'OTHER'),
        ],
        otherDeductions: 100,
        previousLeftover: 200,
        salary: 10_000,
        transportAllowance: 500,
        ...overrides,
    })
}

describe('original Excel shared monthly and annual formulas', () => {
    it('matches monthly income, SUM, SUMIF, cushion and surplus with synthetic inputs', () => {
        // S2..S6: C5, C11, H4:H8, H11:H17, H20:H27.
        const result = computeMonthSheet(month(), fixtureSettings, accounts)

        expect(result).toMatchObject({
            available: 7_700,
            benefits: 800,
            byCategory: { DEBT: 500, FIXED: 200, OTHER: 600, POCKET: 300, SAVINGS: 400, SUBSCRIPTION: 100 },
            cushion: 5_000,
            grossNet: 9_600,
            meetsCushion: true,
            netIncome: 9_800,
            savings: 400,
            surplus: 2_700,
            totalExpenses: 2_100,
        })
        expect(result.byAccount.map((account) => account.total)).toEqual([400, 1_100, 0, 600])
    })

    it('routes previous leftover to savings instead of adding it to available income', () => {
        // S2..S6 C11 and H27 choose mutually exclusive destinations for C9.
        const result = computeMonthSheet(month({ leftoverDestination: 'SAVINGS' }), fixtureSettings, accounts)

        expect(result).toMatchObject({ available: 7_500, netIncome: 9_600, savings: 600, surplus: 2_500 })
    })

    it('uses positive disability income and falls back to payroll for an explicit zero', () => {
        // S2..S6 C11: IF(C8>0,C8,C4-C5-C7+C6) plus available leftover.
        const disability = computeMonthSheet(month({ disabilityIncome: 1_000 }), fixtureSettings, accounts)
        const zero = computeMonthSheet(month({ disabilityIncome: 0 }), fixtureSettings, accounts)

        expect(disability).toMatchObject({ available: -900, netIncome: 1_200, meetsCushion: false, surplus: 0 })
        expect(zero.netIncome).toBe(9_800)
    })

    it('matches the summary links and chronological accumulated savings', () => {
        // S1 B:J link monthly outputs; J4=I4 and J5=J4+I5.
        const rows = computeSummaryRows([
            month({ id: 'february-fixture', leftoverDestination: 'SAVINGS', yearMonth: '2026-02' }),
            month({ id: 'january-fixture', yearMonth: '2026-01' }),
        ], fixtureSettings, accounts)

        expect(rows.map((row) => [row.yearMonth, row.savings, row.accumulatedSavings])).toEqual([
            ['2026-01', 400, 400],
            ['2026-02', 600, 1_000],
        ])
        expect(summarizeYear(rows, 2026)).toMatchObject({
            accumulatedSavings: 1_000,
            debtPayments: 1_000,
            monthsMeetingCushion: 2,
            netIncome: 19_400,
            savings: 1_000,
            subscriptions: 200,
            totalExpenses: 4_200,
        })
    })
})

function avalanche(redirectOverpayments: boolean) {
    return computeDebtPlan({
        available: 700,
        cushion: 500,
        debts: [
            debt({ id: 'a', minimumPayment: 100, monthlyRate: 0.03, name: 'Fixture A', totalBalance: 1_000 }),
            debt({ id: 'b', insuranceRate: 0.005, minimumPayment: 200, monthlyRate: 0.015, name: 'Fixture B', partnerContribution: 50, paymentCap: 500, sharedPercent: 50, sortOrder: 1, totalBalance: 2_000 }),
        ],
        entries: [
            entry('A payment fixture', 150, 'DEBT', { debtId: 'a' }),
            entry('B payment fixture', 250, 'DEBT', { debtId: 'b' }),
        ],
        redirectOverpayments,
    })
}

describe('original Excel shared avalanche formulas', () => {
    it('allocates the surplus by combined interest and insurance cost with a positive usable cap', () => {
        // S7: C7, C9:C10, F/I/P/Q/R/S/T/U/V13:16, C23.
        const result = avalanche(false)

        expect(result).toMatchObject({ availableAfterRecommended: 500, currentTotal: 400, excess: 200, pool: 200, recommendedTotal: 600, unassigned: 0 })
        expect(result.rows.map((row) => [row.debt.id, row.myBalance, row.base, row.capacity, row.capacityBefore, row.extra, row.recommended, row.totalMonthly, row.monthsRemaining])).toEqual([
            ['a', 1_000, 150, 850, 0, 200, 350, 350, 4],
            ['b', 1_000, 250, 250, 850, 0, 250, 300, 8],
        ])
        expect(result.rows[1].monthlyCost).toBeCloseTo(0.02, 12)
        expect(result.rows[0].effectiveAnnualRate).toBeCloseTo(0.425760886846, 10)
    })

    it('redirects current overpayments into the pool and starts from personal minimums', () => {
        // S7: C9=C7+SUM(N)-SUM(M) and Q=IF(redirect,M,N).
        const result = avalanche(true)

        expect(result).toMatchObject({ availableAfterRecommended: 500, myMinimumTotal: 250, pool: 350, recommendedTotal: 600, unassigned: 0 })
        expect(result.rows.map((row) => [row.base, row.extra, row.recommended, row.monthsRemaining])).toEqual([
            [100, 350, 450, 3],
            [150, 0, 150, 12],
        ])
    })

    it('represents the workbook-specific half-minimum using the explicit override', () => {
        // S7 M14=K14/2 differs from the generic M13=MAX(0,K13-L13).
        const shared = debt({ id: 'shared-fixture', minimumPayment: 200, name: 'Shared fixture', partnerContribution: 50, sharedPercent: 50, totalBalance: 2_000 })

        expect(myMinimumOf(shared)).toBe(150)
        expect(myMinimumOf({ ...shared, myMinimumOverride: 100 })).toBe(100)
    })

    it('matches ROUNDUP(NPER) including zero interest and a payment insufficient for interest', () => {
        // S7 W13:W16: IFERROR(ROUNDUP(NPER(I,-V,D),0),...).
        expect(paymentPeriods(0.03, 350, 1_000)).toBe(4)
        expect(paymentPeriods(0.02, 300, 2_000)).toBe(8)
        expect(paymentPeriods(0, 250, 1_000)).toBe(4)
        expect(paymentPeriods(0.03, 30, 1_000)).toBeNull()
    })
})

describe('owner-approved monetary precision contract', () => {
    it('rounds monetary intermediates to cents while rates keep their own precision', () => {
        // App/API decision confirmed on 2026-10-10; the original workbook has no monetary ROUND.
        const result = computeMonthSheet(month({
            entries: [],
            otherDeductions: 0,
            previousLeftover: 0,
            salary: 101,
            transportAllowance: 0,
        }), { ...fixtureSettings, benefitsRate: 0.005 }, accounts)

        expect(result).toMatchObject({ benefits: 0.51, grossNet: 100.49, netIncome: 100.49 })
        expect(sharedPortionOf(debt({ id: 'decimal-fixture', name: 'Decimal fixture', sharedPercent: 33.33, totalBalance: 101 }))).toBe(33.66)
        expect(roundHalfUp(0.0123455, 6)).toBe(0.012346)
        expect(roundHalfUp(0.08125, 4)).toBe(0.0813)
    })
})
