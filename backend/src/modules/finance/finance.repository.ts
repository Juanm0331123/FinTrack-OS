import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.ts'
import type { DebtStrategy } from './finance.types.ts'
import type { CopiedEntry } from './sheet-copy.ts'

const entryOrderBy = [
    { sortOrder: 'asc' },
    { createdAt: 'asc' },
] satisfies Prisma.MonthEntryOrderByWithRelationInput[]

const spendOrderBy = [
    { spentOn: 'asc' },
    { createdAt: 'asc' },
] satisfies Prisma.PocketSpendOrderByWithRelationInput[]

const entryWithSpends = {
    spends: {
        orderBy: spendOrderBy,
    },
} satisfies Prisma.MonthEntryInclude

const sheetWithEntries = {
    entries: {
        include: entryWithSpends,
        orderBy: entryOrderBy,
    },
} satisfies Prisma.MonthSheetInclude

export const DEFAULT_ACCOUNT_NAME = 'Efectivo'

export class FinanceRepository {
    ensureSettings(userId: string) {
        return prisma.financeSettings.upsert({
            create: { userId },
            update: {},
            where: { userId },
        })
    }

    upsertSettings(
        userId: string,
        fields: {
            benefitsRate?: number
            cushionAmount?: number
            debtStrategy?: DebtStrategy
            redirectDebtOverpayments?: boolean
        },
    ) {
        return prisma.financeSettings.upsert({
            create: { userId, ...fields },
            update: fields,
            where: { userId },
        })
    }

    async ensureDefaultAccount(userId: string) {
        const count = await prisma.moneyAccount.count({ where: { userId } })

        if (count > 0) {
            return
        }

        await prisma.moneyAccount.createMany({
            data: [{ name: DEFAULT_ACCOUNT_NAME, sortOrder: 0, userId }],
            skipDuplicates: true,
        })
    }

    listAccounts(userId: string) {
        return prisma.moneyAccount.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            where: { userId },
        })
    }

    findAccount(userId: string, id: string) {
        return prisma.moneyAccount.findFirst({ where: { id, userId } })
    }

    findAccountByName(userId: string, name: string) {
        return prisma.moneyAccount.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, userId },
        })
    }

    async nextAccountSortOrder(userId: string) {
        const result = await prisma.moneyAccount.aggregate({
            _max: { sortOrder: true },
            where: { userId },
        })

        return (result._max.sortOrder ?? -1) + 1
    }

    createAccount(data: Prisma.MoneyAccountUncheckedCreateInput) {
        return prisma.moneyAccount.create({ data })
    }

    updateAccount(id: string, data: Prisma.MoneyAccountUpdateInput) {
        return prisma.moneyAccount.update({ data, where: { id } })
    }

    countAccountEntries(accountId: string) {
        return prisma.monthEntry.count({ where: { accountId } })
    }

    deleteAccount(id: string) {
        return prisma.moneyAccount.delete({ where: { id } })
    }

    listSheets(userId: string) {
        return prisma.monthSheet.findMany({
            include: sheetWithEntries,
            orderBy: { yearMonth: 'asc' },
            where: { userId },
        })
    }

    findSheet(userId: string, yearMonth: string) {
        return prisma.monthSheet.findUnique({
            include: sheetWithEntries,
            where: { userId_yearMonth: { userId, yearMonth } },
        })
    }

    findPreviousSheet(userId: string, yearMonth: string) {
        return prisma.monthSheet.findFirst({
            include: sheetWithEntries,
            orderBy: { yearMonth: 'desc' },
            where: { userId, yearMonth: { lt: yearMonth } },
        })
    }

    createSheetWithEntries(
        data: Prisma.MonthSheetUncheckedCreateInput & { id: string },
        entries: CopiedEntry[],
    ) {
        return prisma.$transaction(async (transaction) => {
            await transaction.monthSheet.create({ data })

            if (entries.length > 0) {
                await transaction.monthEntry.createMany({ data: entries })
            }

            return transaction.monthSheet.findUniqueOrThrow({
                include: sheetWithEntries,
                where: { id: data.id },
            })
        })
    }

    appendEntries(
        sheetId: string,
        entries: CopiedEntry[],
        sheetData: Prisma.MonthSheetUpdateInput | null,
    ) {
        return prisma.$transaction(async (transaction) => {
            if (sheetData) {
                await transaction.monthSheet.update({ data: sheetData, where: { id: sheetId } })
            }

            if (entries.length > 0) {
                await transaction.monthEntry.createMany({ data: entries })
            }

            return transaction.monthSheet.findUniqueOrThrow({
                include: sheetWithEntries,
                where: { id: sheetId },
            })
        })
    }

    updateSheet(id: string, data: Prisma.MonthSheetUpdateInput) {
        return prisma.monthSheet.update({ data, where: { id } })
    }

    deleteSheet(id: string) {
        return prisma.monthSheet.delete({ where: { id } })
    }

    async nextEntrySortOrder(sheetId: string) {
        const result = await prisma.monthEntry.aggregate({
            _max: { sortOrder: true },
            where: { sheetId },
        })

        return (result._max.sortOrder ?? -1) + 1
    }

    findEntryById(id: string) {
        return prisma.monthEntry.findUnique({ include: entryWithSpends, where: { id } })
    }

    findEntry(userId: string, id: string) {
        return prisma.monthEntry.findFirst({ where: { id, userId } })
    }

    createEntry(data: Prisma.MonthEntryUncheckedCreateInput) {
        return prisma.monthEntry.create({ data, include: entryWithSpends })
    }

    updateEntry(id: string, data: Prisma.MonthEntryUncheckedUpdateInput) {
        return prisma.monthEntry.update({ data, include: entryWithSpends, where: { id } })
    }

    deleteEntry(id: string) {
        return prisma.monthEntry.delete({ where: { id } })
    }

    findSpendById(id: string) {
        return prisma.pocketSpend.findUnique({ where: { id } })
    }

    findSpend(userId: string, id: string) {
        return prisma.pocketSpend.findFirst({ where: { id, userId } })
    }

    createSpend(data: Prisma.PocketSpendUncheckedCreateInput) {
        return prisma.pocketSpend.create({ data })
    }

    updateSpend(id: string, data: Prisma.PocketSpendUncheckedUpdateInput) {
        return prisma.pocketSpend.update({ data, where: { id } })
    }

    deleteSpend(id: string) {
        return prisma.pocketSpend.delete({ where: { id } })
    }

    listDebts(userId: string) {
        return prisma.debt.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            where: { userId },
        })
    }

    findDebtById(id: string) {
        return prisma.debt.findUnique({ where: { id } })
    }

    findDebt(userId: string, id: string) {
        return prisma.debt.findFirst({ where: { id, userId } })
    }

    async nextDebtSortOrder(userId: string) {
        const result = await prisma.debt.aggregate({
            _max: { sortOrder: true },
            where: { userId },
        })

        return (result._max.sortOrder ?? -1) + 1
    }

    createDebt(data: Prisma.DebtUncheckedCreateInput) {
        return prisma.debt.create({ data })
    }

    updateDebt(id: string, data: Prisma.DebtUncheckedUpdateInput) {
        return prisma.debt.update({ data, where: { id } })
    }

    deleteDebt(id: string) {
        return prisma.debt.delete({ where: { id } })
    }
}
