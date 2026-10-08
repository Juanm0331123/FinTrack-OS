import { describe, expect, it } from 'vitest'

import {
    daysInMonth,
    isYearMonth,
    isoDateFor,
    longDayLabel,
    monthLabel,
    shiftYearMonth,
    shortMonthLabel,
} from './year-month'

describe('year-month helpers', () => {
    it('validates YYYY-MM values', () => {
        expect(isYearMonth('2026-10')).toBe(true)
        expect(isYearMonth('2026-13')).toBe(false)
        expect(isYearMonth(null)).toBe(false)
    })

    it('shifts across year boundaries', () => {
        expect(shiftYearMonth('2026-12', 1)).toBe('2027-01')
        expect(shiftYearMonth('2026-01', -1)).toBe('2025-12')
    })

    it('knows the length of each month, including leap years', () => {
        expect(daysInMonth('2026-02')).toBe(28)
        expect(daysInMonth('2028-02')).toBe(29)
        expect(isoDateFor('2026-02', 31)).toBe('2026-02-28')
    })

    it('writes Spanish labels', () => {
        expect(monthLabel('2026-10')).toBe('Octubre 2026')
        expect(shortMonthLabel('2026-09')).toBe('Sep')
        expect(longDayLabel('2026-10-06')).toBe('Martes 6 de octubre')
    })
})
