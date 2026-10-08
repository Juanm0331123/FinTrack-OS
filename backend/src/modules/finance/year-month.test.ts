import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatYearMonth, isYearMonth, parseYearMonth, shiftYearMonth } from './year-month.ts'

describe('year-month helpers', () => {
    it('accepts only YYYY-MM values with a real month', () => {
        assert.equal(isYearMonth('2026-10'), true)
        assert.equal(isYearMonth('2026-13'), false)
        assert.equal(isYearMonth('2026-1'), false)
        assert.equal(isYearMonth('26-10'), false)
    })

    it('parses year and month as numbers', () => {
        assert.deepEqual(parseYearMonth('2026-07'), { month: 7, year: 2026 })
    })

    it('throws on an invalid value', () => {
        assert.throws(() => parseYearMonth('2026-00'), /Invalid yearMonth/)
    })

    it('pads single digit months', () => {
        assert.equal(formatYearMonth(2027, 3), '2027-03')
    })

    it('shifts across year boundaries in both directions', () => {
        assert.equal(shiftYearMonth('2026-12', 1), '2027-01')
        assert.equal(shiftYearMonth('2026-01', -1), '2025-12')
        assert.equal(shiftYearMonth('2026-10', -13), '2025-09')
    })
})
