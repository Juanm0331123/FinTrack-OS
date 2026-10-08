import { roundMoney } from './money'
import { isPocket, summarizePockets, type PocketTotals } from './pockets'
import {
    ENTRY_CATEGORIES,
    type EntryCategory,
    type FinanceSettings,
    type MoneyAccount,
    type MonthSheet,
    type MonthSheetFields,
} from './types'

export const UNASSIGNED_ACCOUNT_LABEL = 'Sin cuenta asignada'

export type AccountTotal = {
    archived: boolean
    id: string | null
    name: string
    total: number
}

export type IncomeBreakdown = {
    baseNet: number
    benefits: number
    benefitsIsManual: boolean
    grossNet: number
    leftoverToAvailable: number
    leftoverToSavings: number
    netIncome: number
    usesDisabilityIncome: boolean
}

export type MonthSheetSummary = IncomeBreakdown & {
    available: number
    billsTotal: number
    byAccount: AccountTotal[]
    byCategory: Record<EntryCategory, number>
    cushion: number
    entryCount: number
    isOverspent: boolean
    meetsCushion: boolean
    missingAccountCount: number
    missingAmountCount: number
    paidTotal: number
    pendingTotal: number
    pockets: PocketTotals
    savings: number
    surplus: number
    totalExpenses: number
}

export function computeIncome(
    sheet: MonthSheetFields,
    settings: FinanceSettings,
): IncomeBreakdown {
    const benefitsIsManual = sheet.benefitsOverride !== null
    const benefits = roundMoney(sheet.benefitsOverride ?? sheet.salary * settings.benefitsRate)
    const grossNet = roundMoney(
        sheet.salary - benefits - sheet.otherDeductions + sheet.transportAllowance,
    )
    const usesDisabilityIncome = (sheet.disabilityIncome ?? 0) > 0
    const baseNet = usesDisabilityIncome ? roundMoney(sheet.disabilityIncome ?? 0) : grossNet
    const leftoverToAvailable =
        sheet.leftoverDestination === 'AVAILABLE' ? sheet.previousLeftover : 0
    const leftoverToSavings = sheet.leftoverDestination === 'SAVINGS' ? sheet.previousLeftover : 0

    return {
        baseNet,
        benefits,
        benefitsIsManual,
        grossNet,
        leftoverToAvailable,
        leftoverToSavings,
        netIncome: roundMoney(baseNet + leftoverToAvailable),
        usesDisabilityIncome,
    }
}

function emptyCategoryTotals() {
    return Object.fromEntries(ENTRY_CATEGORIES.map((category) => [category, 0])) as Record<
        EntryCategory,
        number
    >
}

export function computeMonthSheet(
    sheet: MonthSheet,
    settings: FinanceSettings,
    accounts: readonly MoneyAccount[],
): MonthSheetSummary {
    const income = computeIncome(sheet, settings)
    const byCategory = emptyCategoryTotals()
    const accountTotals = new Map<string, number>()
    const knownAccounts = new Map(accounts.map((account) => [account.id, account]))
    let totalExpenses = 0
    let billsTotal = 0
    let paidTotal = 0
    let unassignedTotal = 0
    let missingAccountCount = 0
    let missingAmountCount = 0

    for (const entry of sheet.entries) {
        const amount = entry.amount ?? 0

        totalExpenses += amount
        byCategory[entry.category] += amount

        if (!isPocket(entry)) {
            billsTotal += amount

            if (entry.isPaid) {
                paidTotal += amount
            }
        }

        if (entry.amount === null) {
            missingAmountCount += 1
        }

        if (entry.accountId && knownAccounts.has(entry.accountId)) {
            accountTotals.set(entry.accountId, (accountTotals.get(entry.accountId) ?? 0) + amount)
        } else {
            unassignedTotal += amount
            missingAccountCount += 1
        }
    }

    for (const category of ENTRY_CATEGORIES) {
        byCategory[category] = roundMoney(byCategory[category])
    }

    totalExpenses = roundMoney(totalExpenses)
    billsTotal = roundMoney(billsTotal)
    paidTotal = roundMoney(paidTotal)

    const byAccount: AccountTotal[] = accounts
        .filter((account) => !account.archived || accountTotals.has(account.id))
        .map((account) => ({
            archived: account.archived,
            id: account.id,
            name: account.name,
            total: roundMoney(accountTotals.get(account.id) ?? 0),
        }))

    byAccount.push({
        archived: false,
        id: null,
        name: UNASSIGNED_ACCOUNT_LABEL,
        total: roundMoney(unassignedTotal),
    })

    const available = roundMoney(income.netIncome - totalExpenses)
    const cushion = settings.cushionAmount

    return {
        ...income,
        available,
        billsTotal,
        byAccount,
        byCategory,
        cushion,
        entryCount: sheet.entries.length,
        isOverspent: available < 0,
        meetsCushion: available >= cushion,
        missingAccountCount,
        missingAmountCount,
        paidTotal,
        pendingTotal: roundMoney(billsTotal - paidTotal),
        pockets: summarizePockets(sheet.entries).totals,
        savings: roundMoney(byCategory.SAVINGS + income.leftoverToSavings),
        surplus: roundMoney(Math.max(0, available - cushion)),
        totalExpenses,
    }
}
