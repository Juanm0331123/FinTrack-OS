import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    toAccountDto,
    toDebtDto,
    toEntryDto,
    toNullableNumber,
    toNumber,
    toSpendDto,
} from './finance.mappers.ts'

describe('decimal conversion', () => {
    it('reads numbers, numeric strings and decimal objects', () => {
        assert.equal(toNumber(12), 12)
        assert.equal(toNumber('12.50'), 12.5)
        assert.equal(toNumber({ toNumber: () => 0.0216 }), 0.0216)
    })

    it('keeps null as null', () => {
        assert.equal(toNullableNumber(null), null)
    })
})

describe('toAccountDto', () => {
    it('exposes archived accounts as a flag instead of a date', () => {
        const dto = toAccountDto({
            archivedAt: new Date('2026-10-01T00:00:00Z'),
            id: 'account-1',
            name: 'Billetera',
            sortOrder: 2,
        })

        assert.deepEqual(dto, { archived: true, id: 'account-1', name: 'Billetera', sortOrder: 2 })
    })
})

describe('toDebtDto', () => {
    it('converts every decimal field to a number', () => {
        const dto = toDebtDto({
            datesNote: 'Corte 15',
            dueDay: 5,
            id: 'debt-1',
            insuranceRate: '0.001',
            lender: 'Banco',
            minimumPayment: { toNumber: () => 150000 },
            monthlyRate: '0.0199',
            myMinimumOverride: null,
            name: 'Tarjeta',
            notes: null,
            partnerContribution: 0,
            paymentCap: '300000',
            sharedAmount: 0,
            sharedPercent: null,
            sharedWith: null,
            sortOrder: 0,
            status: 'ACTIVE',
            totalBalance: '1200000.00',
        })

        assert.equal(dto.monthlyRate, 0.0199)
        assert.equal(dto.minimumPayment, 150000)
        assert.equal(dto.paymentCap, 300000)
        assert.equal(dto.totalBalance, 1200000)
        assert.equal(dto.myMinimumOverride, null)
    })
})

describe('toSpendDto', () => {
    it('exposes the spend date as a calendar day', () => {
        const dto = toSpendDto({
            amount: '18500.00',
            id: 'spend-1',
            note: 'Gasolina',
            spentOn: new Date('2026-10-07T00:00:00.000Z'),
        })

        assert.deepEqual(dto, { amount: 18500, id: 'spend-1', note: 'Gasolina', spentOn: '2026-10-07' })
    })
})

describe('toEntryDto', () => {
    it('returns an empty spend list when the entry was loaded without spends', () => {
        const dto = toEntryDto({
            accountId: null,
            amount: '450000',
            category: 'POCKET',
            concept: 'Mercado',
            debtId: null,
            dueDay: null,
            id: 'entry-1',
            isPaid: false,
            note: null,
            sortOrder: 0,
        })

        assert.deepEqual(dto.spends, [])
        assert.equal(dto.amount, 450000)
    })
})
