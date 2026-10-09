import { FinanceOperationKind, Prisma } from '@prisma/client'
import { isForeignKeyViolation, isUniqueViolation } from '../../config/database-errors.ts'
import { prisma, withTransaction, type TransactionClient } from '../../config/prisma.ts'
import type { DebtStrategy } from './finance.types.ts'
import type { CopiedEntry, CopiedIncome, CopyableIncome } from './sheet-copy.ts'

// Solo los campos que expone la API (sin userId ni marcas de tiempo).
const spendSelect = {
    amount: true,
    id: true,
    note: true,
    spentOn: true,
} satisfies Prisma.PocketSpendSelect

const entrySelect = {
    accountId: true,
    amount: true,
    category: true,
    concept: true,
    debtId: true,
    dueDay: true,
    id: true,
    isPaid: true,
    note: true,
    sortOrder: true,
    spends: { orderBy: [{ spentOn: 'asc' }, { createdAt: 'asc' }], select: spendSelect },
} satisfies Prisma.MonthEntrySelect

const sheetFieldsSelect = {
    benefitsOverride: true,
    disabilityIncome: true,
    id: true,
    leftoverDestination: true,
    notes: true,
    otherDeductions: true,
    previousLeftover: true,
    salary: true,
    transportAllowance: true,
    yearMonth: true,
} satisfies Prisma.MonthSheetSelect

const sheetSelect = {
    ...sheetFieldsSelect,
    entries: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: entrySelect },
} satisfies Prisma.MonthSheetSelect

const accountSelect = { archivedAt: true, id: true, name: true, sortOrder: true } satisfies Prisma.MoneyAccountSelect

const settingsSelect = {
    benefitsRate: true,
    cushionAmount: true,
    debtStrategy: true,
    redirectDebtOverpayments: true,
} satisfies Prisma.FinanceSettingsSelect

const debtSelect = {
    datesNote: true,
    dueDay: true,
    id: true,
    insuranceRate: true,
    lender: true,
    minimumPayment: true,
    monthlyRate: true,
    myMinimumOverride: true,
    name: true,
    notes: true,
    partnerContribution: true,
    paymentCap: true,
    sharedAmount: true,
    sharedPercent: true,
    sharedWith: true,
    sortOrder: true,
    status: true,
    totalBalance: true,
} satisfies Prisma.DebtSelect

export const DEFAULT_ACCOUNT_NAME = 'Efectivo'

export function accountNameKey(name: string) {
    return name.trim().normalize('NFC').toLowerCase()
}

export type CopyOutcome =
    | { status: 'copied' | 'replayed'; sheet: Prisma.MonthSheetGetPayload<{ select: typeof sheetSelect }> }
    | { status: 'no-previous' }
    | { status: 'missing-sheet' }

async function maxEntrySortOrder(transaction: TransactionClient, sheetId: string) {
    const result = await transaction.monthEntry.aggregate({ _max: { sortOrder: true }, where: { sheetId } })

    return result._max.sortOrder ?? -1
}

export class FinanceRepository {
    // Valores iniciales idempotentes: INSERT … ON CONFLICT DO NOTHING. Varias primeras lecturas
    // simultáneas no compiten por la misma fila ni fallan con violaciones de unicidad.
    async ensureFinanceDefaults(userId: string) {
        await prisma.financeSettings.createMany({ data: [{ userId }], skipDuplicates: true })

        if ((await prisma.moneyAccount.count({ where: { userId } })) === 0) {
            await prisma.moneyAccount.createMany({
                data: [{ name: DEFAULT_ACCOUNT_NAME, nameKey: accountNameKey(DEFAULT_ACCOUNT_NAME), sortOrder: 0, userId }],
                skipDuplicates: true,
            })
        }
    }

    findSettings(userId: string) {
        return prisma.financeSettings.findUniqueOrThrow({ select: settingsSelect, where: { userId } })
    }

    upsertSettings(
        userId: string,
        fields: { benefitsRate?: number; cushionAmount?: number; debtStrategy?: DebtStrategy; redirectDebtOverpayments?: boolean },
    ) {
        return prisma.financeSettings.upsert({
            create: { userId, ...fields },
            select: settingsSelect,
            update: fields,
            where: { userId },
        })
    }

    listAccounts(userId: string) {
        return prisma.moneyAccount.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: accountSelect,
            where: { userId },
        })
    }

    countAccounts(userId: string) {
        return prisma.moneyAccount.count({ where: { userId } })
    }

    findAccount(userId: string, id: string) {
        return prisma.moneyAccount.findFirst({ select: accountSelect, where: { id, userId } })
    }

    findAccountByName(userId: string, name: string) {
        return prisma.moneyAccount.findUnique({
            select: accountSelect,
            where: { userId_nameKey: { nameKey: accountNameKey(name), userId } },
        })
    }

    findAccountOwner(id: string) {
        return prisma.moneyAccount.findUnique({ select: { name: true, userId: true }, where: { id } })
    }

    async nextAccountSortOrder(userId: string) {
        const result = await prisma.moneyAccount.aggregate({ _max: { sortOrder: true }, where: { userId } })

        return (result._max.sortOrder ?? -1) + 1
    }

    createAccount(data: { id?: string; name: string; sortOrder: number; userId: string }) {
        return prisma.moneyAccount.create({ data: { ...data, nameKey: accountNameKey(data.name) }, select: accountSelect })
    }

    updateAccount(userId: string, id: string, data: { archivedAt?: Date | null; name?: string; sortOrder?: number }) {
        return prisma.moneyAccount.update({
            data: { ...data, ...(data.name ? { nameKey: accountNameKey(data.name) } : {}) },
            select: accountSelect,
            where: { id_userId: { id, userId } },
        })
    }

    // Decisión atómica: la base rechaza borrar una cuenta referenciada (FK sin acción), así que una
    // fila insertada en paralelo nunca pierde su cuenta. En ese caso la cuenta se archiva.
    async deleteOrArchiveAccount(userId: string, id: string) {
        try {
            await prisma.moneyAccount.delete({ where: { id_userId: { id, userId } } })

            return { result: 'deleted' as const }
        } catch (error) {
            if (!isForeignKeyViolation(error)) {
                throw error
            }
        }

        const account = await prisma.moneyAccount.findUniqueOrThrow({
            select: accountSelect,
            where: { id_userId: { id, userId } },
        })
        const archived = account.archivedAt
            ? account
            : await this.updateAccount(userId, id, { archivedAt: new Date() })

        return { account: archived, result: 'archived' as const }
    }

    listSheets(userId: string, period: { from?: string; to?: string }) {
        return prisma.monthSheet.findMany({
            orderBy: { yearMonth: 'asc' },
            select: sheetSelect,
            where: {
                userId,
                ...(period.from || period.to
                    ? { yearMonth: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
                    : {}),
            },
        })
    }

    countSheets(userId: string) {
        return prisma.monthSheet.count({ where: { userId } })
    }

    findSheetRef(userId: string, yearMonth: string) {
        return prisma.monthSheet.findUnique({
            select: { id: true, yearMonth: true },
            where: { userId_yearMonth: { userId, yearMonth } },
        })
    }

    findSheet(userId: string, yearMonth: string) {
        return prisma.monthSheet.findUnique({ select: sheetSelect, where: { userId_yearMonth: { userId, yearMonth } } })
    }

    findPreviousSheet(transaction: TransactionClient, userId: string, yearMonth: string) {
        return transaction.monthSheet.findFirst({
            orderBy: { yearMonth: 'desc' },
            select: {
                benefitsOverride: true,
                entries: {
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                    select: {
                        accountId: true,
                        amount: true,
                        category: true,
                        concept: true,
                        debtId: true,
                        dueDay: true,
                        note: true,
                        sortOrder: true,
                    },
                },
                otherDeductions: true,
                salary: true,
                transportAllowance: true,
            },
            where: { userId, yearMonth: { lt: yearMonth } },
        })
    }

    // Crea la hoja (vacía o copiada del mes anterior) en una transacción. Con operationId, un
    // reintento de la misma acción devuelve la hoja ya creada en lugar de un conflicto.
    async createSheet(input: {
        buildContent: (
            previous: Awaited<ReturnType<FinanceRepository['findPreviousSheet']>>,
            sheetId: string,
        ) => { entries: CopiedEntry[]; income: CopiedIncome | Record<string, never> }
        copyPrevious: boolean
        operationId?: string
        sheetId: string
        userId: string
        yearMonth: string
    }) {
        try {
            return await withTransaction(async (transaction) => {
                if (input.operationId) {
                    const recorded = await transaction.financeOperation.createMany({
                        data: [{ key: input.operationId, kind: FinanceOperationKind.CREATE_SHEET, userId: input.userId, yearMonth: input.yearMonth }],
                        skipDuplicates: true,
                    })

                    if (recorded.count === 0) {
                        return { replayed: true, sheet: await this.findReplayedSheet(transaction, input) }
                    }
                }

                const previous = input.copyPrevious ? await this.findPreviousSheet(transaction, input.userId, input.yearMonth) : null
                const content = input.buildContent(previous, input.sheetId)

                await transaction.monthSheet.create({
                    data: { id: input.sheetId, userId: input.userId, yearMonth: input.yearMonth, ...content.income },
                })

                if (content.entries.length > 0) {
                    await transaction.monthEntry.createMany({ data: content.entries })
                }

                return {
                    replayed: false,
                    sheet: await transaction.monthSheet.findUniqueOrThrow({ select: sheetSelect, where: { id: input.sheetId } }),
                }
            })
        } catch (error) {
            if (isUniqueViolation(error)) {
                return { conflict: true as const }
            }

            throw error
        }
    }

    private async findReplayedSheet(
        transaction: TransactionClient,
        input: { operationId?: string; userId: string; yearMonth: string },
    ) {
        const operation = await transaction.financeOperation.findUniqueOrThrow({
            where: { userId_key: { key: input.operationId!, userId: input.userId } },
        })

        if (operation.kind !== FinanceOperationKind.CREATE_SHEET || operation.yearMonth !== input.yearMonth) {
            return null
        }

        return transaction.monthSheet.findUnique({
            select: sheetSelect,
            where: { userId_yearMonth: { userId: input.userId, yearMonth: input.yearMonth } },
        })
    }

    // Copia del mes anterior serializada por hoja (FOR UPDATE): dos copias simultáneas no
    // calculan el mismo orden, y el ingreso solo se copia si el salario sigue en cero en el
    // momento de escribir, así que un salario confirmado en paralelo no se sobrescribe.
    copyPreviousSheet(input: {
        buildEntries: (
            previous: NonNullable<Awaited<ReturnType<FinanceRepository['findPreviousSheet']>>>,
            sheetId: string,
            startSortOrder: number,
        ) => CopiedEntry[]
        buildIncome: (previous: CopyableIncome) => CopiedIncome
        operationId?: string
        userId: string
        yearMonth: string
    }) {
        return withTransaction<CopyOutcome>(async (transaction) => {
            const locked = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "month_sheets"
                WHERE "user_id" = ${input.userId}::uuid AND "year_month" = ${input.yearMonth} FOR UPDATE`
            const sheetId = locked[0]?.id

            if (!sheetId) {
                return { status: 'missing-sheet' }
            }

            if (input.operationId) {
                const recorded = await transaction.financeOperation.createMany({
                    data: [{ key: input.operationId, kind: FinanceOperationKind.COPY_PREVIOUS_SHEET, userId: input.userId, yearMonth: input.yearMonth }],
                    skipDuplicates: true,
                })

                if (recorded.count === 0) {
                    return {
                        sheet: await transaction.monthSheet.findUniqueOrThrow({ select: sheetSelect, where: { id: sheetId } }),
                        status: 'replayed',
                    }
                }
            }

            const previous = await this.findPreviousSheet(transaction, input.userId, input.yearMonth)

            if (!previous) {
                return { status: 'no-previous' }
            }

            const entries = input.buildEntries(previous, sheetId, (await maxEntrySortOrder(transaction, sheetId)) + 1)

            if (entries.length > 0) {
                await transaction.monthEntry.createMany({ data: entries })
            }

            await transaction.monthSheet.updateMany({
                data: input.buildIncome(previous),
                where: { id: sheetId, salary: 0, userId: input.userId },
            })

            return {
                sheet: await transaction.monthSheet.findUniqueOrThrow({ select: sheetSelect, where: { id: sheetId } }),
                status: 'copied',
            }
        })
    }

    updateSheet(userId: string, yearMonth: string, data: Prisma.MonthSheetUpdateInput) {
        return prisma.monthSheet.update({
            data,
            select: sheetFieldsSelect,
            where: { userId_yearMonth: { userId, yearMonth } },
        })
    }

    deleteSheet(userId: string, yearMonth: string) {
        return prisma.monthSheet.delete({ select: { id: true }, where: { userId_yearMonth: { userId, yearMonth } } })
    }

    async nextEntrySortOrder(sheetId: string) {
        const result = await prisma.monthEntry.aggregate({ _max: { sortOrder: true }, where: { sheetId } })

        return (result._max.sortOrder ?? -1) + 1
    }

    countEntries(sheetId: string) {
        return prisma.monthEntry.count({ where: { sheetId } })
    }

    // Lectura sin filtrar por usuario, solo para resolver idempotencia: el servicio nunca devuelve
    // el contenido si el dueño o el destino no coinciden.
    findEntryForReplay(id: string) {
        return prisma.monthEntry.findUnique({ select: { ...entrySelect, sheetId: true, userId: true }, where: { id } })
    }

    findEntryRef(userId: string, id: string) {
        return prisma.monthEntry.findUnique({
            select: { category: true, id: true, sheet: { select: { yearMonth: true } }, sheetId: true },
            where: { id_userId: { id, userId } },
        })
    }

    createEntry(data: Prisma.MonthEntryUncheckedCreateInput) {
        return prisma.monthEntry.create({ data, select: entrySelect })
    }

    // Cambio de categoría serializado con el registro de gastos: la fila se bloquea y, si deja de
    // ser bolsillo, no puede tener gastos. createSpend bloquea la misma fila (FOR SHARE).
    updateEntry(userId: string, id: string, data: Prisma.MonthEntryUncheckedUpdateInput, leavingPocket: boolean) {
        return withTransaction(async (transaction) => {
            if (leavingPocket) {
                await transaction.$queryRaw`SELECT "id" FROM "month_entries" WHERE "id" = ${id}::uuid AND "user_id" = ${userId}::uuid FOR UPDATE`

                if ((await transaction.pocketSpend.count({ where: { entryId: id } })) > 0) {
                    return { blocked: true as const }
                }
            }

            return {
                blocked: false as const,
                entry: await transaction.monthEntry.update({
                    data,
                    select: entrySelect,
                    where: { id_userId: { id, userId } },
                }),
            }
        })
    }

    deleteEntry(userId: string, id: string) {
        return prisma.monthEntry.delete({ select: { id: true }, where: { id_userId: { id, userId } } })
    }

    findSpendForReplay(id: string) {
        return prisma.pocketSpend.findUnique({ select: { ...spendSelect, entryId: true, userId: true }, where: { id } })
    }

    findSpendRef(userId: string, id: string) {
        return prisma.pocketSpend.findFirst({
            select: { entry: { select: { sheet: { select: { yearMonth: true } } } }, id: true },
            where: { id, userId },
        })
    }

    countSpends(entryId: string) {
        return prisma.pocketSpend.count({ where: { entryId } })
    }

    createSpend(userId: string, entryId: string, data: { amount: number; id?: string; note: string | null; spentOn: Date }) {
        return withTransaction(async (transaction) => {
            const locked = await transaction.$queryRaw<Array<{ category: string }>>`SELECT "category" FROM "month_entries"
                WHERE "id" = ${entryId}::uuid AND "user_id" = ${userId}::uuid FOR SHARE`

            if (locked[0]?.category !== 'POCKET') {
                return { notPocket: true as const }
            }

            return {
                notPocket: false as const,
                spend: await transaction.pocketSpend.create({ data: { ...data, entryId, userId }, select: spendSelect }),
            }
        })
    }

    updateSpend(userId: string, id: string, data: Prisma.PocketSpendUncheckedUpdateInput) {
        return prisma.pocketSpend.update({ data, select: spendSelect, where: { id, userId } })
    }

    deleteSpend(userId: string, id: string) {
        return prisma.pocketSpend.delete({ select: { id: true }, where: { id, userId } })
    }

    listDebts(userId: string) {
        return prisma.debt.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: debtSelect, where: { userId } })
    }

    countDebts(userId: string) {
        return prisma.debt.count({ where: { userId } })
    }

    findDebtForReplay(id: string) {
        return prisma.debt.findUnique({ select: { ...debtSelect, userId: true }, where: { id } })
    }

    findDebt(userId: string, id: string) {
        return prisma.debt.findFirst({ select: { id: true }, where: { id, userId } })
    }

    async nextDebtSortOrder(userId: string) {
        const result = await prisma.debt.aggregate({ _max: { sortOrder: true }, where: { userId } })

        return (result._max.sortOrder ?? -1) + 1
    }

    createDebt(data: Prisma.DebtUncheckedCreateInput) {
        return prisma.debt.create({ data, select: debtSelect })
    }

    updateDebt(userId: string, id: string, data: Prisma.DebtUncheckedUpdateInput) {
        return prisma.debt.update({ data, select: debtSelect, where: { id_userId: { id, userId } } })
    }

    deleteDebt(userId: string, id: string) {
        return prisma.debt.delete({ select: { id: true }, where: { id_userId: { id, userId } } })
    }
}
