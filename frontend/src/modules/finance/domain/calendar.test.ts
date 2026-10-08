import { describe, expect, it } from 'vitest'

import {
    buildCalendarWeeks,
    isEntryOverdue,
    splitMonthHalves,
    upcomingEntries,
} from './calendar'
import { getColombianHolidays } from './holidays'
import { entry } from './test-fixtures'

describe('buildCalendarWeeks', () => {
    const entries = [
        entry('Internet', 80_000, 'FIXED', { dueDay: 12 }),
        entry('Seguro', 40_000, 'FIXED', { dueDay: 31 }),
        entry('Mercado', 300_000, 'POCKET', {
            dueDay: 5,
            spends: [
                { amount: 30_000, id: 'spend-1', note: 'Plaza', spentOn: '2026-10-03' },
                { amount: 12_000, id: 'spend-2', note: null, spentOn: '2026-10-03' },
            ],
        }),
    ]
    const weeks = buildCalendarWeeks('2026-10', entries, '2026-10-06')
    const days = weeks.flat()

    it('starts on Monday and fills whole weeks', () => {
        expect(weeks).toHaveLength(5)
        expect(days[0].iso).toBe('2026-09-28')
        expect(days[0].inMonth).toBe(false)
        expect(days.at(-1)?.iso).toBe('2026-11-01')
    })

    it('marks today and Colombian holidays', () => {
        expect(days.find((day) => day.isToday)?.iso).toBe('2026-10-06')
        expect(days.find((day) => day.iso === '2026-10-12')?.holiday).toBe('Día de la Raza')
    })

    it('places rows on their due day and leaves rows without day out of the grid', () => {
        expect(days.find((day) => day.iso === '2026-10-12')?.entries.map((item) => item.concept)).toEqual([
            'Internet',
        ])
        expect(days.flatMap((day) => day.entries)).toHaveLength(2)
    })

    it('shows pocket spends on the day they happened instead of the pocket as a payment', () => {
        expect(days.find((day) => day.iso === '2026-10-05')?.entries).toEqual([])
        expect(days.find((day) => day.iso === '2026-10-03')?.spends.map((item) => item.spend.amount)).toEqual([
            30_000,
            12_000,
        ])
    })

    it('moves a day that does not exist in the month to its last day', () => {
        const november = buildCalendarWeeks('2026-11', entries, '2026-10-06').flat()

        expect(november.find((day) => day.iso === '2026-11-30')?.entries[0].concept).toBe('Seguro')
    })
})

describe('isEntryOverdue', () => {
    it('is overdue only when unpaid and the due date already passed', () => {
        expect(isEntryOverdue({ dueDay: 1, isPaid: false }, '2026-10', '2026-10-06')).toBe(true)
        expect(isEntryOverdue({ dueDay: 1, isPaid: true }, '2026-10', '2026-10-06')).toBe(false)
        expect(isEntryOverdue({ dueDay: 6, isPaid: false }, '2026-10', '2026-10-06')).toBe(false)
        expect(isEntryOverdue({ dueDay: null, isPaid: false }, '2026-10', '2026-10-06')).toBe(false)
        expect(isEntryOverdue({ dueDay: 28, isPaid: false }, '2026-09', '2026-10-06')).toBe(true)
    })
})

describe('splitMonthHalves', () => {
    it('groups bills by quincena, keeps rows without day apart and leaves pockets out', () => {
        const halves = splitMonthHalves([
            entry('A', 100, 'FIXED', { dueDay: 1, isPaid: true }),
            entry('B', 200, 'FIXED', { dueDay: 15 }),
            entry('C', 300, 'FIXED', { dueDay: 16 }),
            entry('D', 400, 'POCKET'),
            entry('E', 500, 'POCKET', { dueDay: 2 }),
            entry('F', 50, 'OTHER'),
        ])

        expect(halves.firstHalf).toEqual({ count: 2, paidCount: 1, total: 300 })
        expect(halves.secondHalf).toEqual({ count: 1, paidCount: 0, total: 300 })
        expect(halves.floating).toEqual({ count: 1, paidCount: 0, total: 50 })
    })
})

describe('upcomingEntries', () => {
    it('lists overdue and next-week unpaid rows sorted by day', () => {
        const list = upcomingEntries(
            [
                entry('Lejano', 1, 'FIXED', { dueDay: 25 }),
                entry('Pronto', 1, 'FIXED', { dueDay: 13 }),
                entry('Vencido', 1, 'FIXED', { dueDay: 2 }),
                entry('Pagado', 1, 'FIXED', { dueDay: 3, isPaid: true }),
                entry('Mercado', 1, 'POCKET', { dueDay: 4 }),
            ],
            '2026-10',
            '2026-10-06',
        )

        expect(list.map((item) => item.concept)).toEqual(['Vencido', 'Pronto'])
    })
})

describe('getColombianHolidays', () => {
    it('lists the 18 holidays of 2026 with Emiliani and Easter-based moves', () => {
        const holidays = [...getColombianHolidays(2026).keys()].toSorted()

        expect(holidays).toEqual([
            '2026-01-01',
            '2026-01-12',
            '2026-03-23',
            '2026-04-02',
            '2026-04-03',
            '2026-05-01',
            '2026-05-18',
            '2026-06-08',
            '2026-06-15',
            '2026-06-29',
            '2026-07-20',
            '2026-08-07',
            '2026-08-17',
            '2026-10-12',
            '2026-11-02',
            '2026-11-16',
            '2026-12-08',
            '2026-12-25',
        ])
    })
})
