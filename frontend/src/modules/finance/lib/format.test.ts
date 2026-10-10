import { describe, expect, it } from 'vitest'

import {
    formatCompactMoney,
    formatMoney,
    parseAmountInput,
    parseDecimalInput,
    percentInputToFraction,
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
        expect(parseAmountInput('2.450.700')).toEqual({ ok: true, value: 2_450_700 })
        expect(parseAmountInput('2450700')).toEqual({ ok: true, value: 2_450_700 })
        expect(parseAmountInput('$ 2.450.700')).toEqual({ ok: true, value: 2_450_700 })
        expect(parseAmountInput('0')).toEqual({ ok: true, value: 0 })
        expect(parseAmountInput('')).toEqual({ ok: true, value: null })
        expect(parseAmountInput('   ')).toEqual({ ok: true, value: null })
    })

    // F-DATA-05: los montos son pesos enteros en formato es-CO. Nada se reinterpreta en silencio.
    it('rejects decimal cents instead of turning 1.234,56 into 123456', () => {
        expect(parseAmountInput('1.234,56')).toEqual({ error: 'Escribe el valor en pesos, sin centavos.', ok: false })
        expect(parseAmountInput('1234,5')).toEqual({ error: 'Escribe el valor en pesos, sin centavos.', ok: false })
        expect(parseAmountInput('1.234,00')).toEqual({ ok: true, value: 1_234 })
    })

    it('rejects a negative sign instead of dropping it', () => {
        expect(parseAmountInput('-100')).toEqual({ error: 'El valor no puede ser negativo.', ok: false })
        expect(parseAmountInput('−100')).toEqual({ error: 'El valor no puede ser negativo.', ok: false })
    })

    it('rejects misplaced thousand separators, foreign characters and values above the API limit', () => {
        expect(parseAmountInput('1.23.4')).toEqual({ error: 'Revisa los puntos de miles: van cada tres dígitos.', ok: false })
        expect(parseAmountInput('1234.56')).toEqual({ error: 'Revisa los puntos de miles: van cada tres dígitos.', ok: false })
        expect(parseAmountInput('12a')).toEqual({ error: 'Escribe solo números.', ok: false })
        expect(parseAmountInput('999.999.999.999')).toEqual({ ok: true, value: 999_999_999_999 })
        expect(parseAmountInput('1.000.000.000.000')).toEqual({ error: 'El valor es demasiado alto.', ok: false })
    })

    it('reads percentages with a decimal comma', () => {
        expect(parseDecimalInput('2,16')).toBe(2.16)
        expect(parseDecimalInput('2.16')).toBe(2.16)
        expect(parseDecimalInput('8')).toBe(8)
        expect(parseDecimalInput('')).toBeNull()
    })

    it('does not read a negative percentage as positive', () => {
        expect(parseDecimalInput('-2,5')).toBeNull()
    })

    // F-DATA-07: la fracción local tiene la misma escala que la columna del API, así lo que se ve
    // antes de recargar coincide con lo guardado (prestaciones 4 decimales, tasas 6).
    it('converts a typed percentage to the scale stored by the API', () => {
        expect(percentInputToFraction('12,3456', 4)).toBe(0.1235)
        expect(percentInputToFraction('8', 4)).toBe(0.08)
        expect(percentInputToFraction('2,16', 6)).toBe(0.0216)
        expect(percentInputToFraction('1,234567', 6)).toBe(0.012346)
        expect(percentInputToFraction('100,5', 4)).toBeNull()
        expect(percentInputToFraction('-3', 4)).toBeNull()
    })

    it('shows a stored fraction as an editable percentage', () => {
        expect(toPercentInput(0.0216)).toBe('2,16')
        expect(toPercentInput(0.08)).toBe('8')
    })
})
