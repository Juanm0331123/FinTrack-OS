import { roundMoney } from './money'
import type { Debt, DebtStrategy, MonthEntry } from './types'

export type DebtAction = 'AT_CAP' | 'BASE_ONLY' | 'EXTRA' | 'KILL_FIRST'

export type ResolvedDebtStrategy = 'AVALANCHE' | 'CASH_FLOW' | 'HIGHEST_PAYMENT' | 'LOWEST_PAYMENT'

type PriorityCandidate = {
    cost: number
    index: number
    myBalance: number
    myMinimum: number
}

function cashFlowRatio(candidate: PriorityCandidate) {
    return candidate.myMinimum > 0 ? candidate.myBalance / candidate.myMinimum : Number.POSITIVE_INFINITY
}

function paymentOrDefault(candidate: PriorityCandidate) {
    return candidate.myMinimum > 0 ? candidate.myMinimum : Number.POSITIVE_INFINITY
}

const PRIORITY_COMPARATORS: Record<ResolvedDebtStrategy, (left: PriorityCandidate, right: PriorityCandidate) => number> = {
    AVALANCHE: (left, right) => right.cost - left.cost || left.index - right.index,
    CASH_FLOW: (left, right) =>
        cashFlowRatio(left) - cashFlowRatio(right) || right.cost - left.cost || left.index - right.index,
    HIGHEST_PAYMENT: (left, right) =>
        right.myMinimum - left.myMinimum || right.cost - left.cost || left.index - right.index,
    LOWEST_PAYMENT: (left, right) =>
        paymentOrDefault(left) - paymentOrDefault(right) || right.cost - left.cost || left.index - right.index,
}

export function resolveDebtStrategy(strategy: DebtStrategy, cashFlowTight: boolean): ResolvedDebtStrategy {
    if (strategy === 'RECOMMENDED') {
        return cashFlowTight ? 'CASH_FLOW' : 'AVALANCHE'
    }

    return strategy
}

export type DebtPlanRow = {
    action: DebtAction
    base: number
    cap: number | null
    capacity: number
    capacityBefore: number
    currentPayment: number
    debt: Debt
    effectiveAnnualRate: number
    extra: number
    monthlyCost: number
    monthsRemaining: number | null
    myBalance: number
    myMinimum: number
    myMinimumIsManual: boolean
    priority: number
    recommended: number
    sharedPortion: number
    totalMonthly: number
}

export type DebtPlan = {
    available: number
    availableAfterRecommended: number
    currentTotal: number
    cushion: number
    excess: number
    extraTotal: number
    killFirst: DebtPlanRow | null
    monthlyTotal: number
    myBalanceTotal: number
    myMinimumTotal: number
    pool: number
    recommendedTotal: number
    redirectOverpayments: boolean
    requestedStrategy: DebtStrategy
    rows: DebtPlanRow[]
    strategy: ResolvedDebtStrategy
    totalBalance: number
    unassigned: number
}

export type DebtPlanInput = {
    available: number
    cashFlowTight?: boolean
    cushion: number
    debts: readonly Debt[]
    entries: readonly MonthEntry[]
    redirectOverpayments: boolean
    strategy?: DebtStrategy
}

export function paymentPeriods(rate: number, payment: number, presentValue: number) {
    if (presentValue <= 0) {
        return 0
    }

    if (payment <= 0) {
        return null
    }

    if (rate === 0) {
        return Math.ceil(presentValue / payment - 1e-9)
    }

    const remainder = payment - presentValue * rate

    if (remainder <= 0) {
        return null
    }

    return Math.ceil(Math.log(payment / remainder) / Math.log(1 + rate) - 1e-9)
}

export function sharedPortionOf(debt: Debt) {
    return debt.sharedPercent !== null
        ? roundMoney((debt.totalBalance * debt.sharedPercent) / 100)
        : debt.sharedAmount
}

export function myMinimumOf(debt: Debt) {
    return debt.myMinimumOverride ?? roundMoney(Math.max(0, debt.minimumPayment - debt.partnerContribution))
}

export function computeDebtPlan(input: DebtPlanInput): DebtPlan {
    const active = input.debts
        .filter((debt) => debt.status === 'ACTIVE')
        .toSorted((left, right) => left.sortOrder - right.sortOrder)
    const paymentsByDebt = new Map<string, number>()

    for (const entry of input.entries) {
        if (entry.debtId) {
            paymentsByDebt.set(entry.debtId, (paymentsByDebt.get(entry.debtId) ?? 0) + (entry.amount ?? 0))
        }
    }

    const requestedStrategy = input.strategy ?? 'AVALANCHE'
    const strategy = resolveDebtStrategy(requestedStrategy, input.cashFlowTight ?? false)

    const measured = active.map((debt, index) => {
        const sharedPortion = sharedPortionOf(debt)
        const monthlyCost = debt.monthlyRate + debt.insuranceRate

        return {
            currentPayment: roundMoney(paymentsByDebt.get(debt.id) ?? 0),
            debt,
            effectiveAnnualRate: Math.pow(1 + monthlyCost, 12) - 1,
            index,
            monthlyCost,
            myBalance: roundMoney(debt.totalBalance - sharedPortion),
            myMinimum: myMinimumOf(debt),
            myMinimumIsManual: debt.myMinimumOverride !== null,
            sharedPortion,
        }
    })

    const priorityOrder = measured
        .map((row) => ({ cost: row.monthlyCost, index: row.index, myBalance: row.myBalance, myMinimum: row.myMinimum }))
        .toSorted(PRIORITY_COMPARATORS[strategy])
    const priorities = new Map(priorityOrder.map((item, rank) => [item.index, rank + 1]))

    const base = measured.map(({ index, ...row }) => ({
        ...row,
        priority: priorities.get(index) ?? index + 1,
    }))

    const excess = roundMoney(Math.max(0, input.available - input.cushion))
    const currentTotal = roundMoney(base.reduce((sum, row) => sum + row.currentPayment, 0))
    const myMinimumTotal = roundMoney(base.reduce((sum, row) => sum + row.myMinimum, 0))
    const pool = roundMoney(
        excess + (input.redirectOverpayments ? currentTotal - myMinimumTotal : 0),
    )

    const withCapacity = base.map((row) => {
        const cap = row.debt.paymentCap !== null && row.debt.paymentCap > 0 ? row.debt.paymentCap : null
        const basePayment = input.redirectOverpayments ? row.myMinimum : row.currentPayment

        return {
            ...row,
            base: basePayment,
            cap,
            capacity: roundMoney(Math.max(0, (cap ?? row.myBalance) - basePayment)),
        }
    })

    const rows = withCapacity
        .map((row) => {
            const capacityBefore = roundMoney(
                withCapacity
                    .filter((other) => other.priority < row.priority)
                    .reduce((sum, other) => sum + other.capacity, 0),
            )
            const extra = roundMoney(Math.max(0, Math.min(row.capacity, pool - capacityBefore)))
            const recommended = roundMoney(row.base + extra)
            const totalMonthly = roundMoney(recommended + row.debt.partnerContribution)
            const action: DebtAction =
                extra > 0
                    ? row.priority === 1
                        ? 'KILL_FIRST'
                        : 'EXTRA'
                    : row.cap !== null && recommended >= row.cap
                      ? 'AT_CAP'
                      : 'BASE_ONLY'

            return {
                ...row,
                action,
                capacityBefore,
                extra,
                monthsRemaining: paymentPeriods(row.monthlyCost, totalMonthly, row.debt.totalBalance),
                recommended,
                totalMonthly,
            }
        })
        .toSorted((left, right) => left.priority - right.priority)

    const extraTotal = roundMoney(rows.reduce((sum, row) => sum + row.extra, 0))
    const recommendedTotal = roundMoney(rows.reduce((sum, row) => sum + row.recommended, 0))

    return {
        available: input.available,
        availableAfterRecommended: roundMoney(input.available - (recommendedTotal - currentTotal)),
        currentTotal,
        cushion: input.cushion,
        excess,
        extraTotal,
        killFirst: rows.find((row) => row.priority === 1) ?? null,
        monthlyTotal: roundMoney(rows.reduce((sum, row) => sum + row.totalMonthly, 0)),
        myBalanceTotal: roundMoney(rows.reduce((sum, row) => sum + row.myBalance, 0)),
        myMinimumTotal,
        pool,
        recommendedTotal,
        redirectOverpayments: input.redirectOverpayments,
        requestedStrategy,
        rows,
        strategy,
        totalBalance: roundMoney(rows.reduce((sum, row) => sum + row.debt.totalBalance, 0)),
        unassigned: roundMoney(pool - extraTotal),
    }
}
