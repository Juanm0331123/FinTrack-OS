import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    createDebtSchema,
    createEntrySchema,
    createSheetSchema,
    createSpendSchema,
    updateEntrySchema,
    updateSettingsSchema,
    updateSpendSchema,
} from './finance.schemas.ts'

const ENTRY_ID = '3f0c8f5e-6a1b-4c2d-9e3f-4a5b6c7d8e9f'
const ACCOUNT_ID = '0b9d6c1a-2e3f-4a5b-8c7d-6e5f4a3b2c1d'

function parseEntry(body: Record<string, unknown>) {
    return createEntrySchema.safeParse({ body, params: { yearMonth: '2026-10' } })
}

describe('createEntrySchema', () => {
    it('accepts a complete row and rounds the amount to cents', () => {
        const result = parseEntry({
            accountId: ACCOUNT_ID,
            amount: 45000.456,
            category: 'FIXED',
            concept: '  Internet  ',
            dueDay: 12,
            id: ENTRY_ID,
            note: '',
        })

        assert.equal(result.success, true)
        assert.equal(result.data?.body.amount, 45000.46)
        assert.equal(result.data?.body.concept, 'Internet')
        assert.equal(result.data?.body.note, null)
    })

    it('accepts a row without value, like an empty Excel cell', () => {
        const result = parseEntry({ amount: null, concept: 'Recibos' })

        assert.equal(result.success, true)
        assert.equal(result.data?.body.amount, null)
    })

    it('rejects negative amounts', () => {
        assert.equal(parseEntry({ amount: -1, concept: 'Error' }).success, false)
    })

    it('rejects due days outside 1 to 31', () => {
        assert.equal(parseEntry({ concept: 'Error', dueDay: 0 }).success, false)
        assert.equal(parseEntry({ concept: 'Error', dueDay: 32 }).success, false)
    })

    it('rejects unknown categories and unknown keys', () => {
        assert.equal(parseEntry({ category: 'FOOD', concept: 'Error' }).success, false)
        assert.equal(parseEntry({ concept: 'Error', paid: true }).success, false)
    })

    it('rejects an invalid month in the route', () => {
        const result = createEntrySchema.safeParse({
            body: { concept: 'Error' },
            params: { yearMonth: '2026-13' },
        })

        assert.equal(result.success, false)
    })
})

describe('updateEntrySchema', () => {
    it('requires at least one change', () => {
        const result = updateEntrySchema.safeParse({ body: {}, params: { id: ENTRY_ID } })

        assert.equal(result.success, false)
    })

    it('allows clearing the account and the due day', () => {
        const result = updateEntrySchema.safeParse({
            body: { accountId: null, dueDay: null },
            params: { id: ENTRY_ID },
        })

        assert.equal(result.success, true)
    })
})

describe('createSpendSchema', () => {
    function parseSpend(body: Record<string, unknown>) {
        return createSpendSchema.safeParse({ body, params: { id: ENTRY_ID } })
    }

    it('accepts a gradual spend and rounds it to cents', () => {
        const result = parseSpend({ amount: 32000.456, note: '  Mercado  ', spentOn: '2026-10-07' })

        assert.equal(result.success, true)
        assert.equal(result.data?.body.amount, 32000.46)
        assert.equal(result.data?.body.note, 'Mercado')
    })

    it('rejects spends of zero or less', () => {
        assert.equal(parseSpend({ amount: 0, spentOn: '2026-10-07' }).success, false)
        assert.equal(parseSpend({ amount: -5000, spentOn: '2026-10-07' }).success, false)
    })

    it('rejects dates that do not exist on the calendar', () => {
        assert.equal(parseSpend({ amount: 1000, spentOn: '2026-02-31' }).success, false)
        assert.equal(parseSpend({ amount: 1000, spentOn: '07/10/2026' }).success, false)
        assert.equal(parseSpend({ amount: 1000 }).success, false)
    })

    it('rejects unknown keys', () => {
        assert.equal(parseSpend({ amount: 1000, isPaid: true, spentOn: '2026-10-07' }).success, false)
    })
})

describe('updateSpendSchema', () => {
    it('requires at least one change and allows clearing the note', () => {
        assert.equal(updateSpendSchema.safeParse({ body: {}, params: { id: ENTRY_ID } }).success, false)
        assert.equal(
            updateSpendSchema.safeParse({ body: { note: null }, params: { id: ENTRY_ID } }).success,
            true,
        )
    })
})

describe('updateSettingsSchema', () => {
    it('keeps the benefits rate as a fraction between 0 and 1', () => {
        assert.equal(updateSettingsSchema.safeParse({ body: { benefitsRate: 0.08 } }).success, true)
        assert.equal(updateSettingsSchema.safeParse({ body: { benefitsRate: 8 } }).success, false)
    })

    it('accepts only the known debt strategies', () => {
        assert.equal(updateSettingsSchema.safeParse({ body: { debtStrategy: 'RECOMMENDED' } }).success, true)
        assert.equal(updateSettingsSchema.safeParse({ body: { debtStrategy: 'SNOWBALL' } }).success, false)
    })
})

describe('createSheetSchema', () => {
    it('defaults to an empty sheet', () => {
        const result = createSheetSchema.safeParse({ body: { yearMonth: '2026-11' } })

        assert.equal(result.success, true)
        assert.equal(result.data?.body.copyFrom, 'NONE')
    })
})

describe('createDebtSchema', () => {
    it('requires a name and caps the shared percent at 100', () => {
        assert.equal(createDebtSchema.safeParse({ body: { totalBalance: 100 } }).success, false)
        assert.equal(
            createDebtSchema.safeParse({ body: { name: 'Tarjeta', sharedPercent: 120 } }).success,
            false,
        )
        assert.equal(
            createDebtSchema.safeParse({
                body: { monthlyRate: 0.0195, name: 'Tarjeta', sharedPercent: 50 },
            }).success,
            true,
        )
    })
})
