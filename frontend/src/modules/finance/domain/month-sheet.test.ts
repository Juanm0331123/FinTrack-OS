import { describe, expect, it } from 'vitest'

import { computeIncome, computeMonthSheet, UNASSIGNED_ACCOUNT_LABEL } from './month-sheet'
import { accounts, sampleSheet, settings } from './test-fixtures'

describe('computeIncome', () => {
    it('derives prestaciones from the configured rate and builds the net income', () => {
        const income = computeIncome(sampleSheet(), settings)

        expect(income.benefits).toBe(200_000)
        expect(income.grossNet).toBe(2_480_000)
        expect(income.netIncome).toBe(2_580_000)
        expect(income.benefitsIsManual).toBe(false)
    })

    it('uses a manual prestaciones value when the month overrides it', () => {
        const income = computeIncome(sampleSheet({ benefitsOverride: 150_000 }), settings)

        expect(income.benefits).toBe(150_000)
        expect(income.netIncome).toBe(2_630_000)
        expect(income.benefitsIsManual).toBe(true)
    })

    it('replaces the net with the disability income and still adds the leftover to available', () => {
        const income = computeIncome(sampleSheet({ disabilityIncome: 2_000_000 }), settings)

        expect(income.usesDisabilityIncome).toBe(true)
        expect(income.baseNet).toBe(2_000_000)
        expect(income.netIncome).toBe(2_100_000)
    })

    it('sends the previous leftover to savings instead of available when chosen', () => {
        const income = computeIncome(sampleSheet({ leftoverDestination: 'SAVINGS' }), settings)

        expect(income.netIncome).toBe(2_480_000)
        expect(income.leftoverToSavings).toBe(100_000)
    })
})

describe('computeMonthSheet', () => {
    const summary = computeMonthSheet(sampleSheet(), settings, accounts)

    it('adds every row, treating empty values as zero', () => {
        expect(summary.totalExpenses).toBe(2_155_000)
        expect(summary.missingAmountCount).toBe(1)
    })

    it('computes available, surplus and the cushion status like the sheet', () => {
        expect(summary.available).toBe(425_000)
        expect(summary.cushion).toBe(500_000)
        expect(summary.surplus).toBe(0)
        expect(summary.meetsCushion).toBe(false)
        expect(summary.isOverspent).toBe(false)
    })

    it('totals by category in the fixed category order', () => {
        expect(summary.byCategory).toEqual({
            DEBT: 550_000,
            FIXED: 950_000,
            OTHER: 60_000,
            POCKET: 400_000,
            SAVINGS: 150_000,
            SUBSCRIPTION: 45_000,
        })
    })

    it('totals by account, hides unused archived accounts and keeps the unassigned row', () => {
        expect(summary.byAccount.map((item) => [item.name, item.total])).toEqual([
            ['Billetera', 745_000],
            ['Banco Uno', 1_350_000],
            ['Efectivo', 0],
            [UNASSIGNED_ACCOUNT_LABEL, 60_000],
        ])
        expect(summary.byAccount.reduce((sum, item) => sum + item.total, 0)).toBe(
            summary.totalExpenses,
        )
    })

    it('splits paid and pending bills and leaves pockets out of the paid flag', () => {
        expect(summary.billsTotal).toBe(1_755_000)
        expect(summary.paidTotal).toBe(930_000)
        expect(summary.pendingTotal).toBe(825_000)
    })

    it('tracks pocket spending apart without changing the planned totals', () => {
        expect(summary.pockets).toMatchObject({ budget: 400_000, count: 2, spent: 0, trackedCount: 0 })

        const sheet = sampleSheet()
        const tracked = computeMonthSheet(
            {
                ...sheet,
                entries: sheet.entries.map((item) =>
                    item.concept === 'Mercado'
                        ? { ...item, spends: [{ amount: 430_000, id: 'spend-1', note: null, spentOn: '2026-03-04' }] }
                        : item,
                ),
            },
            settings,
            accounts,
        )

        expect(tracked.pockets).toMatchObject({ overspent: 30_000, remaining: -30_000, spent: 430_000, trackedCount: 1 })
        expect(tracked.totalExpenses).toBe(summary.totalExpenses)
        expect(tracked.available).toBe(summary.available)
    })

    it('counts the savings category plus a leftover sent to savings', () => {
        expect(summary.savings).toBe(150_000)

        const toSavings = computeMonthSheet(
            sampleSheet({ leftoverDestination: 'SAVINGS' }),
            settings,
            accounts,
        )

        expect(toSavings.savings).toBe(250_000)
        expect(toSavings.available).toBe(325_000)
    })

    it('meets the cushion once available reaches it and reports the surplus', () => {
        const richer = computeMonthSheet(sampleSheet({ salary: 2_700_000 }), settings, accounts)

        expect(richer.benefits).toBe(216_000)
        expect(richer.available).toBe(609_000)
        expect(richer.meetsCushion).toBe(true)
        expect(richer.surplus).toBe(109_000)
    })

    it('flags a month whose expenses exceed the income', () => {
        const tight = computeMonthSheet(sampleSheet({ salary: 1_000_000 }), settings, accounts)

        expect(tight.isOverspent).toBe(true)
        expect(tight.surplus).toBe(0)
    })
})
