import { describe, expect, it } from 'vitest'

import { roundMoney, sumAmounts } from './money'

// F-DATA-06: contrato de centavos de la app/API, equivalente a ROUND(valor; 2): la mitad se
// aleja de cero sobre el decimal escrito. El libro original no incluye ROUND monetario;
// la diferencia de precisión queda documentada en docs/qa-excel-paridad.md.
describe('roundMoney', () => {
    it('rounds halves away from zero on the written decimal', () => {
        expect(roundMoney(10.075)).toBe(10.08)
        expect(roundMoney(1.005)).toBe(1.01)
        expect(roundMoney(2.675)).toBe(2.68)
        expect(roundMoney(-1.005)).toBe(-1.01)
        expect(roundMoney(-10.075)).toBe(-10.08)
    })

    it('keeps values that already have two decimals and normalizes negative zero', () => {
        expect(roundMoney(1_234.56)).toBe(1_234.56)
        expect(roundMoney(999_999_999_999.99)).toBe(999_999_999_999.99)
        expect(Object.is(roundMoney(-0.004), 0)).toBe(true)
        expect(roundMoney(0)).toBe(0)
    })

    it('rounds accumulated binary sums back to cents', () => {
        expect(roundMoney(0.1 + 0.2)).toBe(0.3)
        expect(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }, { amount: null }, { amount: 0.005 }])).toBe(0.31)
        expect(sumAmounts(Array.from({ length: 10 }, () => ({ amount: 10.075 })))).toBe(100.75)
    })
})
