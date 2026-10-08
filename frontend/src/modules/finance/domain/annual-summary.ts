import { computeMonthSheet } from './month-sheet'
import { roundMoney } from './money'
import type { FinanceSettings, MoneyAccount, MonthSheet } from './types'
import { yearOf } from './year-month'

export type SummaryRow = {
    accumulatedSavings: number
    available: number
    cushion: number
    debtPayments: number
    meetsCushion: boolean
    netIncome: number
    savings: number
    subscriptions: number
    totalExpenses: number
    yearMonth: string
}

export type YearSummary = {
    accumulatedSavings: number
    debtPayments: number
    monthsMeetingCushion: number
    netIncome: number
    rows: SummaryRow[]
    savings: number
    subscriptions: number
    totalExpenses: number
}

export function computeSummaryRows(
    sheets: readonly MonthSheet[],
    settings: FinanceSettings,
    accounts: readonly MoneyAccount[],
): SummaryRow[] {
    let accumulatedSavings = 0

    return sheets
        .toSorted((left, right) => left.yearMonth.localeCompare(right.yearMonth))
        .map((sheet) => {
            const summary = computeMonthSheet(sheet, settings, accounts)

            accumulatedSavings = roundMoney(accumulatedSavings + summary.savings)

            return {
                accumulatedSavings,
                available: summary.available,
                cushion: summary.cushion,
                debtPayments: summary.byCategory.DEBT,
                meetsCushion: summary.meetsCushion,
                netIncome: summary.netIncome,
                savings: summary.savings,
                subscriptions: summary.byCategory.SUBSCRIPTION,
                totalExpenses: summary.totalExpenses,
                yearMonth: sheet.yearMonth,
            }
        })
}

export function summarizeYear(rows: readonly SummaryRow[], year: number): YearSummary {
    const yearRows = rows.filter((row) => yearOf(row.yearMonth) === year)
    const total = (pick: (row: SummaryRow) => number) =>
        roundMoney(yearRows.reduce((sum, row) => sum + pick(row), 0))

    return {
        accumulatedSavings: yearRows.at(-1)?.accumulatedSavings ?? 0,
        debtPayments: total((row) => row.debtPayments),
        monthsMeetingCushion: yearRows.filter((row) => row.meetsCushion).length,
        netIncome: total((row) => row.netIncome),
        rows: yearRows,
        savings: total((row) => row.savings),
        subscriptions: total((row) => row.subscriptions),
        totalExpenses: total((row) => row.totalExpenses),
    }
}
