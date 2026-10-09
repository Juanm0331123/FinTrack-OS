import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { roundHalfUpToCents } from './money.ts'

// Valores esperados según ROUND(valor; 2) de Excel, que redondea la mitad alejándose de cero
// sobre el valor decimal escrito (no sobre su aproximación binaria). Coincide con el cast a
// numeric(14,2) de PostgreSQL y con roundMoney del frontend.
const EXCEL_ROUND_CASES: Array<[number, number]> = [
    [1.005, 1.01],
    [2.675, 2.68],
    [1.015, 1.02],
    [0.125, 0.13],
    [1.0049999, 1],
    [1.004, 1],
    [10.235, 10.24],
    [45000.455, 45000.46],
    [45000.456, 45000.46],
    [3349500, 3349500],
    [0.1 + 0.2, 0.3],
    [1e-7, 0],
    [0.005, 0.01],
    [0.0049, 0],
    [999999999999.994, 999999999999.99],
]

describe('roundHalfUpToCents', () => {
    for (const [input, expected] of EXCEL_ROUND_CASES) {
        it(`rounds ${input} to ${expected} like Excel ROUND(x; 2)`, () => {
            assert.equal(roundHalfUpToCents(input), expected)
        })
    }

    it('rounds a half cent past the maximum up, so the caller can reject it', () => {
        assert.equal(roundHalfUpToCents(999999999999.995), 1000000000000)
    })

    it('rejects non-finite numbers', () => {
        assert.throws(() => roundHalfUpToCents(Number.POSITIVE_INFINITY))
        assert.throws(() => roundHalfUpToCents(Number.NaN))
    })
})
