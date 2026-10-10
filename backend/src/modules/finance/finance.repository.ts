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

type SheetRecord = Prisma.MonthSheetGetPayload<{ select: typeof sheetSelect }>

export type CopyOutcome =
    | { status: 'copied' | 'replayed'; sheet: SheetRecord }
    | { status: 'idempotency-conflict' | 'limit-reached' | 'missing-sheet' | 'no-previous' }

export type CreateSheetOutcome =
    | { status: 'created' | 'replayed'; sheet: SheetRecord }
    | { status: 'entries-limit' | 'idempotency-conflict' | 'limit-reached' | 'sheet-exists' }

async function maxEntrySortOrder(transaction: TransactionClient, sheetId: string) {
    const result = await transaction.monthEntry.aggregate({ _max: { sortOrder: true }, where: { sheetId } })

    return result._max.sortOrder ?? -1
}

// Serializa por usuario las escrituras que cuentan contra una cuota (cuentas, deudas, meses,
// copias e importación) y el registro de claves de operación. Es un bloqueo transaccional: se
// libera al confirmar o deshacer. Orden de bloqueo: usuario y después filas (hoja, fila).
export async function lockUserFinance(transaction: TransactionClient, userId: string) {
    await transaction.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`finance:${userId}`}, 0))`
}

// Una clave de operación solo reproduce la misma acción: mismo tipo, mismo mes y misma huella.
// Las operaciones registradas antes de existir la huella se comparan por tipo y mes.
function sameOperation(
    recorded: { fingerprint: string | null; kind: FinanceOperationKind; yearMonth: string },
    expected: { fingerprint: string | null; kind: FinanceOperationKind; yearMonth: string },
) {
    return (
        recorded.kind === expected.kind &&
        recorded.yearMonth === expected.yearMonth &&
        (recorded.fingerprint === null || recorded.fingerprint === expected.fingerprint)
    )
}

function findOperation(transaction: TransactionClient, userId: string, key: string) {
    return transaction.financeOperation.findUnique({
        select: { fingerprint: true, kind: true, yearMonth: true },
        where: { userId_key: { key, userId } },
    })
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

    findAccount(userId: string, id: string) {
        return prisma.moneyAccount.findFirst({ select: accountSelect, where: { id, userId } })
    }

    findAccountOwner(id: string) {
        return prisma.moneyAccount.findUnique({ select: { name: true, userId: true }, where: { id } })
    }

    // Id, nombre, cuota y orden se deciden bajo el bloqueo del usuario y en este orden: un id ya
    // usado se resuelve como posible reintento antes de mirar el nombre o la cuota, así que un
    // reintento idéntico nunca choca con su propia creación ni consume cupo.
    createAccount(data: { id?: string; name: string; userId: string }, limit: number) {
        return withTransaction(async (transaction) => {
            await lockUserFinance(transaction, data.userId)

            if (data.id && (await transaction.moneyAccount.findUnique({ select: { id: true }, where: { id: data.id } }))) {
                return { status: 'id-taken' as const }
            }

            const sameName = await transaction.moneyAccount.findUnique({
                select: { id: true },
                where: { userId_nameKey: { nameKey: accountNameKey(data.name), userId: data.userId } },
            })

            if (sameName) {
                // Restaurar es un PATCH del id original. Un POST con un id nuevo nunca cambia
                // otra cuenta ni acepta un id que después no se pueda reintentar.
                return { status: 'name-taken' as const }
            }

            if ((await transaction.moneyAccount.count({ where: { userId: data.userId } })) >= limit) {
                return { status: 'limit-reached' as const }
            }

            const last = await transaction.moneyAccount.aggregate({ _max: { sortOrder: true }, where: { userId: data.userId } })
            const account = await transaction.moneyAccount.create({
                data: { ...data, nameKey: accountNameKey(data.name), sortOrder: (last._max.sortOrder ?? -1) + 1 },
                select: accountSelect,
            })

            return { account, status: 'created' as const }
        })
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

    // Crea la hoja (vacía o copiada del mes anterior) bajo el bloqueo del usuario. Con
    // operationId, primero se resuelve el reintento (antes de la cuota: el último mes permitido
    // también se puede reintentar); una clave usada para otra acción es un conflicto.
    async createSheet(input: {
        buildContent: (
            previous: Awaited<ReturnType<FinanceRepository['findPreviousSheet']>>,
            sheetId: string,
        ) => { entries: CopiedEntry[]; income: CopiedIncome | Record<string, never> }
        copyPrevious: boolean
        entriesLimit: number
        fingerprint: string
        operationId?: string
        sheetId: string
        sheetsLimit: number
        userId: string
        yearMonth: string
    }): Promise<CreateSheetOutcome> {
        const expected = { fingerprint: input.fingerprint, kind: FinanceOperationKind.CREATE_SHEET, yearMonth: input.yearMonth }

        try {
            return await withTransaction<CreateSheetOutcome>(async (transaction) => {
                await lockUserFinance(transaction, input.userId)

                if (input.operationId) {
                    const recorded = await findOperation(transaction, input.userId, input.operationId)

                    if (recorded) {
                        const sheet = sameOperation(recorded, expected)
                            ? await transaction.monthSheet.findUnique({
                                  select: sheetSelect,
                                  where: { userId_yearMonth: { userId: input.userId, yearMonth: input.yearMonth } },
                              })
                            : null

                        return sheet ? { sheet, status: 'replayed' } : { status: 'idempotency-conflict' }
                    }
                }

                const existing = await transaction.monthSheet.findUnique({
                    select: { id: true },
                    where: { userId_yearMonth: { userId: input.userId, yearMonth: input.yearMonth } },
                })

                if (existing) {
                    return { status: 'sheet-exists' }
                }

                if ((await transaction.monthSheet.count({ where: { userId: input.userId } })) >= input.sheetsLimit) {
                    return { status: 'limit-reached' }
                }

                const previous = input.copyPrevious ? await this.findPreviousSheet(transaction, input.userId, input.yearMonth) : null
                const content = input.buildContent(previous, input.sheetId)

                if (content.entries.length > input.entriesLimit) {
                    return { status: 'entries-limit' }
                }

                if (input.operationId) {
                    await transaction.financeOperation.create({ data: { ...expected, key: input.operationId, userId: input.userId } })
                }

                await transaction.monthSheet.create({
                    data: { id: input.sheetId, userId: input.userId, yearMonth: input.yearMonth, ...content.income },
                })

                if (content.entries.length > 0) {
                    await transaction.monthEntry.createMany({ data: content.entries })
                }

                return {
                    sheet: await transaction.monthSheet.findUniqueOrThrow({ select: sheetSelect, where: { id: input.sheetId } }),
                    status: 'created',
                }
            })
        } catch (error) {
            if (isUniqueViolation(error)) {
                return { status: 'sheet-exists' }
            }

            throw error
        }
    }

    // Copia del mes anterior serializada por usuario y por hoja (FOR UPDATE): dos copias
    // simultáneas no calculan el mismo orden ni superan la cuota de filas, y el ingreso solo se
    // copia si el salario sigue en cero al escribir, así que un salario confirmado en paralelo no se
    // sobrescribe. La operación se registra solo si la copia se hace: una copia fallida (sin mes
    // anterior o sobre la cuota) no consume su clave y su reintento vuelve a intentarlo.
    copyPreviousSheet(input: {
        buildEntries: (
            previous: NonNullable<Awaited<ReturnType<FinanceRepository['findPreviousSheet']>>>,
            sheetId: string,
            startSortOrder: number,
        ) => CopiedEntry[]
        buildIncome: (previous: CopyableIncome) => CopiedIncome
        entriesLimit: number
        operationId?: string
        userId: string
        yearMonth: string
    }) {
        const expected = { fingerprint: null, kind: FinanceOperationKind.COPY_PREVIOUS_SHEET, yearMonth: input.yearMonth }

        return withTransaction<CopyOutcome>(async (transaction) => {
            await lockUserFinance(transaction, input.userId)

            const locked = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "month_sheets"
                WHERE "user_id" = ${input.userId}::uuid AND "year_month" = ${input.yearMonth} FOR UPDATE`
            const sheetId = locked[0]?.id

            if (!sheetId) {
                return { status: 'missing-sheet' }
            }

            if (input.operationId) {
                const recorded = await findOperation(transaction, input.userId, input.operationId)

                if (recorded) {
                    return sameOperation(recorded, expected)
                        ? {
                              sheet: await transaction.monthSheet.findUniqueOrThrow({ select: sheetSelect, where: { id: sheetId } }),
                              status: 'replayed',
                          }
                        : { status: 'idempotency-conflict' }
                }
            }

            const previous = await this.findPreviousSheet(transaction, input.userId, input.yearMonth)

            if (!previous) {
                return { status: 'no-previous' }
            }

            const entries = input.buildEntries(previous, sheetId, (await maxEntrySortOrder(transaction, sheetId)) + 1)
            const current = await transaction.monthEntry.count({ where: { sheetId } })

            if (current + entries.length > input.entriesLimit) {
                return { status: 'limit-reached' }
            }

            if (input.operationId) {
                await transaction.financeOperation.create({ data: { ...expected, key: input.operationId, userId: input.userId } })
            }

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

    // Alta de fila con la hoja bloqueada (FOR UPDATE): la cuota y el orden se deciden sobre el
    // estado actual, también frente a copias y altas simultáneas.
    createEntry(data: Omit<Prisma.MonthEntryUncheckedCreateInput, 'sortOrder'> & { sortOrder?: number }, limit: number) {
        return withTransaction(async (transaction) => {
            const locked = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "month_sheets"
                WHERE "id" = ${data.sheetId}::uuid AND "user_id" = ${data.userId}::uuid FOR UPDATE`

            if (!locked[0]) {
                return { status: 'missing-sheet' as const }
            }

            // Un id ya usado es un posible reintento: se resuelve antes de la cuota.
            if (data.id && (await transaction.monthEntry.findUnique({ select: { id: true }, where: { id: data.id } }))) {
                return { status: 'id-taken' as const }
            }

            if ((await transaction.monthEntry.count({ where: { sheetId: data.sheetId } })) >= limit) {
                return { status: 'limit-reached' as const }
            }

            const entry = await transaction.monthEntry.create({
                data: { ...data, sortOrder: data.sortOrder ?? (await maxEntrySortOrder(transaction, data.sheetId)) + 1 },
                select: entrySelect,
            })

            return { entry, status: 'created' as const }
        })
    }

    // Cambio de categoría serializado con el registro de gastos: si la fila deja de ser (o no es)
    // bolsillo, se bloquea y se decide sobre sus gastos actuales, no sobre una lectura previa.
    // createSpend bloquea la misma fila.
    updateEntry(userId: string, id: string, data: Prisma.MonthEntryUncheckedUpdateInput, toNonPocket: boolean) {
        return withTransaction(async (transaction) => {
            if (toNonPocket) {
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

    // Gasto con la fila del bolsillo bloqueada (FOR UPDATE): la categoría y la cuota se comprueban
    // sobre el estado actual y se serializan con otros gastos y con el cambio de categoría.
    createSpend(userId: string, entryId: string, data: { amount: number; id?: string; note: string | null; spentOn: Date }, limit: number) {
        return withTransaction(async (transaction) => {
            const locked = await transaction.$queryRaw<Array<{ category: string }>>`SELECT "category" FROM "month_entries"
                WHERE "id" = ${entryId}::uuid AND "user_id" = ${userId}::uuid FOR UPDATE`

            if (data.id && (await transaction.pocketSpend.findUnique({ select: { id: true }, where: { id: data.id } }))) {
                return { status: 'id-taken' as const }
            }

            if (locked[0]?.category !== 'POCKET') {
                return { status: 'not-pocket' as const }
            }

            if ((await transaction.pocketSpend.count({ where: { entryId } })) >= limit) {
                return { status: 'limit-reached' as const }
            }

            return {
                spend: await transaction.pocketSpend.create({ data: { ...data, entryId, userId }, select: spendSelect }),
                status: 'created' as const,
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

    findDebtForReplay(id: string) {
        return prisma.debt.findUnique({ select: { ...debtSelect, userId: true }, where: { id } })
    }

    findDebt(userId: string, id: string) {
        return prisma.debt.findFirst({ select: { id: true }, where: { id, userId } })
    }

    createDebt(data: Omit<Prisma.DebtUncheckedCreateInput, 'sortOrder'> & { sortOrder?: number }, limit: number) {
        return withTransaction(async (transaction) => {
            await lockUserFinance(transaction, data.userId)

            if (data.id && (await transaction.debt.findUnique({ select: { id: true }, where: { id: data.id } }))) {
                return { status: 'id-taken' as const }
            }

            if ((await transaction.debt.count({ where: { userId: data.userId } })) >= limit) {
                return { status: 'limit-reached' as const }
            }

            const last = await transaction.debt.aggregate({ _max: { sortOrder: true }, where: { userId: data.userId } })
            const debt = await transaction.debt.create({
                data: { ...data, sortOrder: data.sortOrder ?? (last._max.sortOrder ?? -1) + 1 },
                select: debtSelect,
            })

            return { debt, status: 'created' as const }
        })
    }

    updateDebt(userId: string, id: string, data: Prisma.DebtUncheckedUpdateInput) {
        return prisma.debt.update({ data, select: debtSelect, where: { id_userId: { id, userId } } })
    }

    deleteDebt(userId: string, id: string) {
        return prisma.debt.delete({ select: { id: true }, where: { id_userId: { id, userId } } })
    }
}
