import { describe, expect, it } from 'vitest'

import { landingSample } from './landing-sample'

// Valores aprobados en docs/landing-content.md §3 (datos sintéticos). La muestra se calcula con el
// dominio financiero de la app: si una regla cambia, la landing no puede seguir mostrando otra cifra.
describe('landingSample', () => {
    it('reproduce la hoja de octubre de 2026 aprobada', () => {
        const { month } = landingSample

        expect(month.yearMonth).toBe('2026-10')
        expect(month.netIncome).toBe(3_000_000)
        expect(month.totalExpenses).toBe(2_250_000)
        expect(month.available).toBe(750_000)
        expect(month.cushion).toBe(500_000)
        expect(month.surplus).toBe(250_000)
        expect(month.meetsCushion).toBe(true)
        expect(month.rows.map((row) => [row.concept, row.amount])).toEqual([
            ['Arriendo', 900_000],
            ['Transporte', 200_000],
            ['Mercado', 500_000],
            ['Ahorro del mes', 300_000],
            ['Cuota de ejemplo', 300_000],
            ['Suscripción de ejemplo', 50_000],
        ])
    })

    it('cuenta el presupuesto del bolsillo una sola vez en el total', () => {
        const { month, pocket } = landingSample

        expect(pocket.concept).toBe('Mercado')
        expect(pocket.budget).toBe(500_000)
        expect(pocket.spent).toBe(180_000)
        expect(pocket.remaining).toBe(320_000)
        expect(pocket.spends.map((spend) => [spend.label, spend.amount])).toEqual([
            ['Domingo 4 de octubre', 120_000],
            ['Domingo 11 de octubre', 60_000],
        ])
        expect(month.byAccount).toEqual([
            { name: 'Cuenta principal', total: 2_050_000 },
            { name: 'Efectivo', total: 200_000 },
        ])
        // Sus consumos no vuelven a sumarse: el total sigue siendo el de las filas.
        expect(month.totalExpenses).toBe(month.rows.reduce((sum, row) => sum + row.amount, 0))
    })

    it('obtiene la recomendación de deuda del plan de la app', () => {
        const { debt } = landingSample

        expect(debt.strategy).toBe('AVALANCHE')
        expect(debt.balance).toBe(3_000_000)
        expect(debt.minimumPayment).toBe(300_000)
        expect(debt.base).toBe(300_000)
        expect(debt.extra).toBe(250_000)
        expect(debt.recommended).toBe(550_000)
        expect(debt.monthsRemaining).toBe(6)
        expect(debt.availableAfterRecommended).toBe(500_000)
        expect(debt.effectiveAnnualRate).toBeCloseTo(0.2682, 4)
    })

    it('resume los tres meses registrados', () => {
        const { year } = landingSample

        expect(year.rows.map((row) => [row.yearMonth, row.netIncome, row.totalExpenses, row.available, row.savings])).toEqual([
            ['2026-08', 2_800_000, 2_100_000, 700_000, 250_000],
            ['2026-09', 2_900_000, 2_200_000, 700_000, 300_000],
            ['2026-10', 3_000_000, 2_250_000, 750_000, 300_000],
        ])
        expect(year.netIncome).toBe(8_700_000)
        expect(year.totalExpenses).toBe(6_550_000)
        expect(year.savings).toBe(850_000)
        expect(year.monthsMeetingCushion).toBe(3)
        expect(year.monthCount).toBe(3)
    })
})
