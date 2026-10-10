import { getColombianHolidays } from './holidays'
import { roundMoney } from './money'
import { isPocket, spendsByDay, type DaySpend } from './pockets'
import type { MonthEntry } from './types'
import { daysInMonth, isoDateFor, parseYearMonth, shiftYearMonth } from './year-month'

export type CalendarDay = {
    entries: MonthEntry[]
    holiday: string | null
    inMonth: boolean
    iso: string
    isToday: boolean
    day: number
    spends: DaySpend[]
}

export type PeriodTotals = {
    count: number
    paidCount: number
    total: number
}

export type MonthHalves = {
    firstHalf: PeriodTotals
    floating: PeriodTotals
    secondHalf: PeriodTotals
}

export function dueDateOf(entry: Pick<MonthEntry, 'dueDay'>, yearMonth: string) {
    return entry.dueDay === null ? null : isoDateFor(yearMonth, entry.dueDay)
}

export function isEntryOverdue(
    entry: Pick<MonthEntry, 'dueDay' | 'isPaid'>,
    yearMonth: string,
    todayIso: string,
) {
    const dueDate = dueDateOf(entry, yearMonth)

    return !entry.isPaid && dueDate !== null && dueDate < todayIso
}

function weekdayMondayFirst(year: number, month: number, day: number) {
    return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

export function buildCalendarWeeks(
    yearMonth: string,
    entries: readonly MonthEntry[],
    todayIso: string,
): CalendarDay[][] {
    const { month, year } = parseYearMonth(yearMonth)
    const totalDays = daysInMonth(yearMonth)
    const leading = weekdayMondayFirst(year, month, 1)
    const previous = shiftYearMonth(yearMonth, -1)
    const next = shiftYearMonth(yearMonth, 1)
    const previousDays = daysInMonth(previous)
    const holidays = new Map([
        ...getColombianHolidays(year),
        ...getColombianHolidays(parseYearMonth(previous).year),
        ...getColombianHolidays(parseYearMonth(next).year),
    ])
    const byDay = new Map<number, MonthEntry[]>()
    const spends = spendsByDay(entries)

    for (const entry of entries) {
        if (entry.dueDay === null || isPocket(entry)) {
            continue
        }

        const day = Math.min(Math.max(entry.dueDay, 1), totalDays)
        const list = byDay.get(day)

        if (list) {
            list.push(entry)
        } else {
            byDay.set(day, [entry])
        }
    }

    const cells: CalendarDay[] = []
    const makeCell = (iso: string, day: number, inMonth: boolean, dayEntries: MonthEntry[]) => ({
        day,
        entries: dayEntries,
        holiday: holidays.get(iso) ?? null,
        inMonth,
        iso,
        isToday: iso === todayIso,
        spends: inMonth ? (spends.get(iso) ?? []) : [],
    })

    for (let index = leading; index > 0; index -= 1) {
        const day = previousDays - index + 1

        cells.push(makeCell(isoDateFor(previous, day), day, false, []))
    }

    for (let day = 1; day <= totalDays; day += 1) {
        cells.push(makeCell(isoDateFor(yearMonth, day), day, true, byDay.get(day) ?? []))
    }

    let trailing = 1

    while (cells.length % 7 !== 0) {
        cells.push(makeCell(isoDateFor(next, trailing), trailing, false, []))
        trailing += 1
    }

    const weeks: CalendarDay[][] = []

    for (let index = 0; index < cells.length; index += 7) {
        weeks.push(cells.slice(index, index + 7))
    }

    return weeks
}

function totalsOf(entries: readonly MonthEntry[]): PeriodTotals {
    let total = 0
    let paidCount = 0

    for (const entry of entries) {
        total += entry.amount ?? 0

        if (entry.isPaid) {
            paidCount += 1
        }
    }

    return { count: entries.length, paidCount, total: roundMoney(total) }
}

export function splitMonthHalves(allEntries: readonly MonthEntry[]): MonthHalves {
    const entries = allEntries.filter((entry) => !isPocket(entry))

    return {
        firstHalf: totalsOf(entries.filter((entry) => entry.dueDay !== null && entry.dueDay <= 15)),
        floating: totalsOf(entries.filter((entry) => entry.dueDay === null)),
        secondHalf: totalsOf(entries.filter((entry) => entry.dueDay !== null && entry.dueDay >= 16)),
    }
}

export function upcomingEntries(
    entries: readonly MonthEntry[],
    yearMonth: string,
    todayIso: string,
    windowDays = 7,
) {
    const limit = new Date(`${todayIso}T00:00:00Z`)

    limit.setUTCDate(limit.getUTCDate() + windowDays)

    const limitIso = limit.toISOString().slice(0, 10)

    return entries
        .filter((entry) => {
            const dueDate = dueDateOf(entry, yearMonth)

            return !isPocket(entry) && !entry.isPaid && dueDate !== null && dueDate <= limitIso
        })
        .sort((left, right) => (left.dueDay ?? 0) - (right.dueDay ?? 0))
}

const DAY_KEY_STEPS: Record<string, number> = { ArrowDown: 7, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7 }

// Navegación por teclado del calendario (patrón grid): flechas ±1 y ±7 días, Inicio y Fin al
// comienzo y al final de la semana (lunes a domingo). Nunca sale del mes; null si la tecla no aplica.
export function moveCalendarDay(isoDate: string, key: string, yearMonth: string): string | null {
    const day = Number(isoDate.slice(8, 10))
    const last = daysInMonth(yearMonth)
    let target: number

    if (key in DAY_KEY_STEPS) {
        target = day + DAY_KEY_STEPS[key]
    } else if (key === 'Home' || key === 'End') {
        const [year, month] = yearMonth.split('-').map(Number)
        const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7

        target = key === 'Home' ? day - weekday : day + (6 - weekday)
    } else {
        return null
    }

    return isoDateFor(yearMonth, Math.min(Math.max(target, 1), last))
}
