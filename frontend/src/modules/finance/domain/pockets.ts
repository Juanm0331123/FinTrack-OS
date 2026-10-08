import { roundMoney } from './money'
import type { MonthEntry, PocketSpend } from './types'
import { daysInMonth, isoDateFor } from './year-month'

const PACE_TOLERANCE = 0.15

export type PocketPace = 'ahead' | 'done' | 'on-track' | 'over' | 'unused'

export type MonthTiming = {
    daysLeft: number
    elapsed: number
    phase: 'current' | 'future' | 'past'
}

export type PocketProgress = {
    budget: number
    concept: string
    entryId: string
    leftover: number
    overspent: number
    remaining: number
    share: number
    spendCount: number
    spent: number
}

export type PocketTotals = {
    budget: number
    count: number
    leftover: number
    overspent: number
    remaining: number
    spent: number
    trackedCount: number
}

export type DaySpend = {
    concept: string
    entryId: string
    spend: PocketSpend
}

export function isPocket(entry: Pick<MonthEntry, 'category'>) {
    return entry.category === 'POCKET'
}

export function sumSpends(spends: ReadonlyArray<Pick<PocketSpend, 'amount'>>) {
    let total = 0

    for (const spend of spends) {
        total += spend.amount
    }

    return roundMoney(total)
}

export function pocketProgress(entry: MonthEntry): PocketProgress {
    const budget = entry.amount ?? 0
    const spent = sumSpends(entry.spends)
    const remaining = roundMoney(budget - spent)

    return {
        budget,
        concept: entry.concept,
        entryId: entry.id,
        leftover: Math.max(0, remaining),
        overspent: Math.max(0, -remaining),
        remaining,
        share: budget > 0 ? Math.min(1, spent / budget) : spent > 0 ? 1 : 0,
        spendCount: entry.spends.length,
        spent,
    }
}

export function summarizePockets(entries: readonly MonthEntry[]) {
    const pockets = entries.filter(isPocket).map(pocketProgress)
    let budget = 0
    let spent = 0
    let overspent = 0
    let trackedCount = 0

    for (const pocket of pockets) {
        budget += pocket.budget
        spent += pocket.spent
        overspent += pocket.overspent

        if (pocket.spendCount > 0) {
            trackedCount += 1
        }
    }

    const remaining = roundMoney(budget - spent)
    const totals: PocketTotals = {
        budget: roundMoney(budget),
        count: pockets.length,
        leftover: Math.max(0, remaining),
        overspent: roundMoney(overspent),
        remaining,
        spent: roundMoney(spent),
        trackedCount,
    }

    return { pockets, totals }
}

export function monthTiming(yearMonth: string, todayIso: string): MonthTiming {
    const totalDays = daysInMonth(yearMonth)
    const todayMonth = todayIso.slice(0, 7)

    if (!todayIso || todayMonth < yearMonth) {
        return { daysLeft: totalDays, elapsed: 0, phase: 'future' }
    }

    if (todayMonth > yearMonth) {
        return { daysLeft: 0, elapsed: 1, phase: 'past' }
    }

    const day = Number(todayIso.slice(8, 10))

    return { daysLeft: totalDays - day + 1, elapsed: day / totalDays, phase: 'current' }
}

export function pocketPace(pocket: PocketProgress, timing: MonthTiming): PocketPace {
    if (pocket.overspent > 0) {
        return 'over'
    }

    if (pocket.spendCount === 0) {
        return 'unused'
    }

    if (pocket.remaining === 0) {
        return 'done'
    }

    if (timing.phase === 'current' && pocket.spent / pocket.budget > timing.elapsed + PACE_TOLERANCE) {
        return 'ahead'
    }

    return 'on-track'
}

export function dailyAllowance(pocket: PocketProgress, timing: MonthTiming) {
    if (timing.phase !== 'current' || pocket.remaining <= 0 || timing.daysLeft <= 0) {
        return null
    }

    return Math.floor(pocket.remaining / timing.daysLeft)
}

export function monthDateRange(yearMonth: string) {
    return { max: isoDateFor(yearMonth, daysInMonth(yearMonth)), min: isoDateFor(yearMonth, 1) }
}

export function defaultSpendDate(yearMonth: string, todayIso: string) {
    const { phase } = monthTiming(yearMonth, todayIso)
    const range = monthDateRange(yearMonth)

    return phase === 'current' ? todayIso : phase === 'past' ? range.max : range.min
}

export function sortSpends(spends: readonly PocketSpend[]) {
    return spends.toSorted((left, right) => left.spentOn.localeCompare(right.spentOn))
}

export function spendsByDay(entries: readonly MonthEntry[]) {
    const byDay = new Map<string, DaySpend[]>()

    for (const entry of entries) {
        if (!isPocket(entry)) {
            continue
        }

        for (const spend of entry.spends) {
            const item = { concept: entry.concept, entryId: entry.id, spend }
            const list = byDay.get(spend.spentOn)

            if (list) {
                list.push(item)
            } else {
                byDay.set(spend.spentOn, [item])
            }
        }
    }

    return byDay
}
