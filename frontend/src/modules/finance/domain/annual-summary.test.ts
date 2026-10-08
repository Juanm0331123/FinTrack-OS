import { describe, expect, it } from 'vitest'

import { computeSummaryRows, summarizeYear } from './annual-summary'
import { accounts, entry, sampleSheet, settings } from './test-fixtures'

const sheets = [
    sampleSheet({ id: 'sheet-2026-05', yearMonth: '2026-05' }),
    sampleSheet({
        entries: [entry('Ahorro', 0, 'SAVINGS'), entry('Arriendo', 900_000, 'FIXED')],
        id: 'sheet-2026-01',
        yearMonth: '2026-01',
    }),
    sampleSheet({
        id: 'sheet-2025-12',
        leftoverDestination: 'SAVINGS',
        yearMonth: '2025-12',
    }),
]

describe('computeSummaryRows', () => {
    const rows = computeSummaryRows(sheets, settings, accounts)

    it('sorts months chronologically', () => {
        expect(rows.map((row) => row.yearMonth)).toEqual(['2025-12', '2026-01', '2026-05'])
    })

    it('mirrors the Resumen sheet columns for a month', () => {
        const may = rows[2]

        expect(may.netIncome).toBe(2_580_000)
        expect(may.totalExpenses).toBe(2_155_000)
        expect(may.debtPayments).toBe(550_000)
        expect(may.subscriptions).toBe(45_000)
        expect(may.available).toBe(425_000)
        expect(may.cushion).toBe(500_000)
        expect(may.meetsCushion).toBe(false)
        expect(may.savings).toBe(150_000)
    })

    it('accumulates savings across every month, not only within a year', () => {
        expect(rows.map((row) => row.accumulatedSavings)).toEqual([250_000, 250_000, 400_000])
    })
})

describe('summarizeYear', () => {
    const rows = computeSummaryRows(sheets, settings, accounts)

    it('keeps only the rows of the requested year and totals them', () => {
        const year = summarizeYear(rows, 2026)

        expect(year.rows).toHaveLength(2)
        expect(year.totalExpenses).toBe(3_055_000)
        expect(year.savings).toBe(150_000)
        expect(year.accumulatedSavings).toBe(400_000)
        expect(year.monthsMeetingCushion).toBe(1)
    })

    it('returns empty totals for a year without months', () => {
        const year = summarizeYear(rows, 2024)

        expect(year.rows).toHaveLength(0)
        expect(year.accumulatedSavings).toBe(0)
    })
})
