import { afterEach, describe, expect, it } from 'vitest'

import {
    daysInMonth,
    isYearMonth,
    isoDateFor,
    longDayLabel,
    monthLabel,
    shiftYearMonth,
    shortMonthLabel,
    toIsoDate,
    toYearMonth,
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

// F-DATA-08: la fecha de negocio es la de Bogotá, sin importar la zona horaria del dispositivo.
describe('business date', () => {
    const originalTimeZone = process.env.TZ

    afterEach(() => {
        process.env.TZ = originalTimeZone
    })

    for (const deviceZone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Europe/Madrid']) {
        it(`uses America/Bogota on a device in ${deviceZone}`, () => {
            process.env.TZ = deviceZone

            // 22:00 del 30 de junio en Bogotá.
            expect(toIsoDate(new Date('2026-07-01T03:00:00Z'))).toBe('2026-06-30')
            expect(toYearMonth(new Date('2026-07-01T03:00:00Z'))).toBe('2026-06')
            // Medianoche exacta en Bogotá: ya es 1 de julio.
            expect(toIsoDate(new Date('2026-07-01T05:00:00Z'))).toBe('2026-07-01')
            // Último segundo del año en Bogotá y primero del siguiente.
            expect(toIsoDate(new Date('2027-01-01T04:59:59Z'))).toBe('2026-12-31')
            expect(toYearMonth(new Date('2027-01-01T04:59:59Z'))).toBe('2026-12')
            expect(toIsoDate(new Date('2027-01-01T05:00:00Z'))).toBe('2027-01-01')
            // Cambio de mes en un año bisiesto.
            expect(toIsoDate(new Date('2028-03-01T04:30:00Z'))).toBe('2028-02-29')
        })
    }
})

// F-DATA-09: el API solo admite hojas entre 2000-01 y 2099-12.
describe('year-month contract range', () => {
    it('rejects months outside 2000..2099', () => {
        expect(isYearMonth('1999-12')).toBe(false)
        expect(isYearMonth('2100-01')).toBe(false)
        expect(isYearMonth('0000-01')).toBe(false)
        expect(isYearMonth('2000-01')).toBe(true)
        expect(isYearMonth('2099-12')).toBe(true)
    })

    it('does not navigate past the first or last supported month', () => {
        expect(isYearMonth(shiftYearMonth('2000-01', -1))).toBe(false)
        expect(isYearMonth(shiftYearMonth('2000-01', 1))).toBe(true)
        expect(isYearMonth(shiftYearMonth('2099-12', 1))).toBe(false)
        expect(isYearMonth(shiftYearMonth('2099-12', -1))).toBe(true)
    })
})
