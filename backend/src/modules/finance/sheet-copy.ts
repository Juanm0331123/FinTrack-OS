import { toNullableNumber, toNumber } from './finance.mappers.ts'
import type { DecimalLike, EntryCategory } from './finance.types.ts'

export type CopyableEntry = {
    accountId: string | null
    amount: DecimalLike | null
    category: EntryCategory
    concept: string
    debtId: string | null
    dueDay: number | null
    note: string | null
    sortOrder: number
}

export type CopyableIncome = {
    benefitsOverride: DecimalLike | null
    otherDeductions: DecimalLike
    salary: DecimalLike
    transportAllowance: DecimalLike
}

export type CopiedEntry = {
    accountId: string | null
    amount: number | null
    category: EntryCategory
    concept: string
    debtId: string | null
    dueDay: number | null
    isPaid: false
    note: string | null
    sheetId: string
    sortOrder: number
    userId: string
}

export function buildCopiedEntries(
    source: CopyableEntry[],
    target: { sheetId: string; startSortOrder: number; userId: string },
): CopiedEntry[] {
    return source
        .toSorted((left, right) => left.sortOrder - right.sortOrder)
        .map((entry, index) => ({
            accountId: entry.accountId,
            amount: toNullableNumber(entry.amount),
            category: entry.category,
            concept: entry.concept,
            debtId: entry.debtId,
            dueDay: entry.dueDay,
            isPaid: false,
            note: entry.note,
            sheetId: target.sheetId,
            sortOrder: target.startSortOrder + index,
            userId: target.userId,
        }))
}

export type CopiedIncome = {
    benefitsOverride: number | null
    otherDeductions: number
    salary: number
    transportAllowance: number
}

export function buildCopiedIncome(source: CopyableIncome): CopiedIncome {
    return {
        benefitsOverride: toNullableNumber(source.benefitsOverride),
        otherDeductions: toNumber(source.otherDeductions),
        salary: toNumber(source.salary),
        transportAllowance: toNumber(source.transportAllowance),
    }
}
