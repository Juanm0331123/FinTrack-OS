import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCopiedEntries, buildCopiedIncome, type CopyableEntry } from './sheet-copy.ts'

const TARGET = { sheetId: 'sheet-b', startSortOrder: 10, userId: 'user-1' }

function entry(overrides: Partial<CopyableEntry>): CopyableEntry {
    return {
        accountId: 'account-1',
        amount: 1000,
        category: 'FIXED',
        concept: 'Concepto',
        debtId: null,
        dueDay: null,
        note: null,
        sortOrder: 0,
        ...overrides,
    }
}

describe('buildCopiedEntries', () => {
    it('keeps the source order and appends after the target rows', () => {
        const copied = buildCopiedEntries(
            [
                entry({ concept: 'Segundo', sortOrder: 5 }),
                entry({ concept: 'Primero', sortOrder: 1 }),
            ],
            TARGET,
        )

        assert.deepEqual(
            copied.map((item) => [item.concept, item.sortOrder]),
            [
                ['Primero', 10],
                ['Segundo', 11],
            ],
        )
    })

    it('resets the paid flag and moves every row to the target sheet', () => {
        const [copied] = buildCopiedEntries([entry({ dueDay: 15, note: 'Quincena' })], TARGET)

        assert.equal(copied.isPaid, false)
        assert.equal(copied.sheetId, 'sheet-b')
        assert.equal(copied.userId, 'user-1')
        assert.equal(copied.dueDay, 15)
        assert.equal(copied.note, 'Quincena')
    })

    it('converts decimal values and keeps empty amounts empty', () => {
        const copied = buildCopiedEntries(
            [
                entry({ amount: { toNumber: () => 2500.5 }, sortOrder: 0 }),
                entry({ amount: null, sortOrder: 1 }),
            ],
            TARGET,
        )

        assert.deepEqual(
            copied.map((item) => item.amount),
            [2500.5, null],
        )
    })

    it('preserves debt links so the debt plan keeps reading the payment', () => {
        const [copied] = buildCopiedEntries([entry({ category: 'DEBT', debtId: 'debt-9' })], TARGET)

        assert.equal(copied.debtId, 'debt-9')
        assert.equal(copied.category, 'DEBT')
    })
})

describe('buildCopiedIncome', () => {
    it('copies the recurring income fields as numbers', () => {
        assert.deepEqual(
            buildCopiedIncome({
                benefitsOverride: null,
                otherDeductions: '20000.00',
                salary: { toNumber: () => 2500000 },
                transportAllowance: 200000,
            }),
            {
                benefitsOverride: null,
                otherDeductions: 20000,
                salary: 2500000,
                transportAllowance: 200000,
            },
        )
    })
})
