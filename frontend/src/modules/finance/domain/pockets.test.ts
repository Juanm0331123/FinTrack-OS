import { describe, expect, it } from 'vitest'

import {
    dailyAllowance,
    defaultSpendDate,
    monthTiming,
    pocketPace,
    pocketProgress,
    sortSpends,
    spendsByDay,
    summarizePockets,
} from './pockets'
import { entry } from './test-fixtures'

function spend(amount: number, spentOn: string, note: string | null = null) {
    return { amount, id: `spend-${spentOn}-${amount}`, note, spentOn }
}

function pocket(budget: number | null, amounts: number[]) {
    return pocketProgress(
        entry('Mercado', budget, 'POCKET', {
            spends: amounts.map((amount, index) => spend(amount, `2026-10-${String(index + 1).padStart(2, '0')}`)),
        }),
    )
}

describe('pocketProgress', () => {
    it('tracks used, remaining and leftover against the monthly budget', () => {
        expect(pocket(400_000, [120_000, 35_500])).toMatchObject({
            budget: 400_000,
            leftover: 244_500,
            overspent: 0,
            remaining: 244_500,
            spendCount: 2,
            spent: 155_500,
        })
    })

    it('reports overspending as a positive amount with a full bar', () => {
        expect(pocket(200_000, [150_000, 80_000])).toMatchObject({
            leftover: 0,
            overspent: 30_000,
            remaining: -30_000,
            share: 1,
        })
    })

    it('treats spends on a pocket without budget as overspending', () => {
        expect(pocket(null, [10_000])).toMatchObject({ budget: 0, overspent: 10_000, share: 1 })
        expect(pocket(null, [])).toMatchObject({ overspent: 0, share: 0 })
    })
})

describe('summarizePockets', () => {
    it('ignores other categories and nets leftovers against overspending', () => {
        const { pockets, totals } = summarizePockets([
            entry('Mercado', 400_000, 'POCKET', { spends: [spend(350_000, '2026-10-02')] }),
            entry('Gasolina', 200_000, 'POCKET', { spends: [spend(230_000, '2026-10-03')] }),
            entry('Salidas', 100_000, 'POCKET'),
            entry('Arriendo', 900_000, 'FIXED', { isPaid: true }),
        ])

        expect(pockets.map((item) => item.concept)).toEqual(['Mercado', 'Gasolina', 'Salidas'])
        expect(totals).toEqual({
            budget: 700_000,
            count: 3,
            leftover: 120_000,
            overspent: 30_000,
            remaining: 120_000,
            spent: 580_000,
            trackedCount: 2,
        })
    })
})

describe('monthTiming', () => {
    it('counts today as elapsed in the current month', () => {
        expect(monthTiming('2026-10', '2026-10-07')).toEqual({ daysLeft: 25, elapsed: 7 / 31, phase: 'current' })
    })

    it('marks past and future months', () => {
        expect(monthTiming('2026-09', '2026-10-07')).toEqual({ daysLeft: 0, elapsed: 1, phase: 'past' })
        expect(monthTiming('2026-11', '2026-10-07')).toEqual({ daysLeft: 30, elapsed: 0, phase: 'future' })
    })
})

describe('pocketPace', () => {
    const tenthOfOctober = monthTiming('2026-10', '2026-10-10')

    it('flags a pocket spent faster than the month goes by', () => {
        expect(pocketPace(pocket(300_000, [150_000]), tenthOfOctober)).toBe('ahead')
    })

    it('stays on track within the tolerance and in past months', () => {
        expect(pocketPace(pocket(300_000, [130_000]), tenthOfOctober)).toBe('on-track')
        expect(pocketPace(pocket(300_000, [290_000]), monthTiming('2026-09', '2026-10-10'))).toBe('on-track')
    })

    it('separates unused, used up and exceeded pockets', () => {
        expect(pocketPace(pocket(300_000, []), tenthOfOctober)).toBe('unused')
        expect(pocketPace(pocket(300_000, [300_000]), tenthOfOctober)).toBe('done')
        expect(pocketPace(pocket(300_000, [300_001]), tenthOfOctober)).toBe('over')
    })
})

describe('dailyAllowance', () => {
    it('splits what remains across the days left, rounding down', () => {
        expect(dailyAllowance(pocket(400_000, [155_500]), monthTiming('2026-10', '2026-10-07'))).toBe(9_780)
    })

    it('is only offered in the current month while money remains', () => {
        expect(dailyAllowance(pocket(400_000, [155_500]), monthTiming('2026-09', '2026-10-07'))).toBeNull()
        expect(dailyAllowance(pocket(100_000, [120_000]), monthTiming('2026-10', '2026-10-07'))).toBeNull()
    })
})

describe('defaultSpendDate', () => {
    it('uses today inside the month and the nearest edge otherwise', () => {
        expect(defaultSpendDate('2026-10', '2026-10-07')).toBe('2026-10-07')
        expect(defaultSpendDate('2026-09', '2026-10-07')).toBe('2026-09-30')
        expect(defaultSpendDate('2026-11', '2026-10-07')).toBe('2026-11-01')
    })
})

describe('spend ordering and grouping', () => {
    it('sorts by day keeping the order of spends made the same day', () => {
        const sorted = sortSpends([spend(3, '2026-10-05'), spend(1, '2026-10-02'), spend(2, '2026-10-05')])

        expect(sorted.map((item) => item.amount)).toEqual([1, 3, 2])
    })

    it('groups pocket spends by day and skips other categories', () => {
        const byDay = spendsByDay([
            entry('Mercado', 400_000, 'POCKET', { spends: [spend(30_000, '2026-10-03'), spend(8_000, '2026-10-20')] }),
            entry('Gasolina', 200_000, 'POCKET', { spends: [spend(12_000, '2026-10-03')] }),
            entry('Arriendo', 900_000, 'FIXED', { spends: [spend(1, '2026-10-03')] }),
        ])

        expect(byDay.get('2026-10-03')?.map((item) => [item.concept, item.spend.amount])).toEqual([
            ['Mercado', 30_000],
            ['Gasolina', 12_000],
        ])
        expect(byDay.get('2026-10-20')).toHaveLength(1)
    })
})
