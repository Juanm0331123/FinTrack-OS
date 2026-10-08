import { describe, expect, it } from 'vitest'

import {
    formatCompactMoney,
    formatMoney,
    parseAmountInput,
    parseDecimalInput,
    toPercentInput,
} from './format'

describe('money formatting', () => {
    it('writes Colombian pesos without decimals', () => {
        expect(formatMoney(684_235)).toBe('$ 684.235')
        expect(formatMoney(-1_500)).toBe('−$ 1.500')
    })

    it('compacts amounts for calendar pills', () => {
        expect(formatCompactMoney(200_000)).toBe('200k')
        expect(formatCompactMoney(1_250_000)).toBe('1,3 M')
        expect(formatCompactMoney(900)).toBe('900')
    })
})

describe('input parsing', () => {
    it('reads amounts typed with thousand separators', () => {
        expect(parseAmountInput('2.450.700')).toBe(2_450_700)
        expect(parseAmountInput('')).toBeNull()
    })

    it('reads percentages with a decimal comma', () => {
        expect(parseDecimalInput('2,16')).toBe(2.16)
        expect(parseDecimalInput('2.16')).toBe(2.16)
        expect(parseDecimalInput('8')).toBe(8)
        expect(parseDecimalInput('')).toBeNull()
    })

    it('shows a stored fraction as an editable percentage', () => {
        expect(toPercentInput(0.0216)).toBe('2,16')
        expect(toPercentInput(0.08)).toBe('8')
    })
})
