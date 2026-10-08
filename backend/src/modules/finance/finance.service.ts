import { randomUUID } from 'node:crypto'
import {
    ConflictError,
    NotFoundError,
    RequestValidationError,
    type ValidationIssue,
} from '../../utils/app-error.ts'
import {
    toAccountDto,
    toDebtDto,
    toEntryDto,
    toNumber,
    toSettingsDto,
    toSheetDto,
    toSheetFieldsDto,
    toSpendDto,
} from './finance.mappers.ts'
import { FinanceRepository } from './finance.repository.ts'
import type {
    CreateAccountInput,
    CreateDebtInput,
    CreateEntryInput,
    CreateSheetInput,
    CreateSpendInput,
    UpdateAccountInput,
    UpdateDebtInput,
    UpdateEntryInput,
    UpdateSettingsInput,
    UpdateSheetInput,
    UpdateSpendInput,
} from './finance.schemas.ts'
import type { WorkbookDto } from './finance.types.ts'
import { buildCopiedEntries, buildCopiedIncome, type CopiedEntry } from './sheet-copy.ts'

function toDateOnly(isoDate: string) {
    return new Date(`${isoDate}T00:00:00.000Z`)
}

function isUniqueViolation(error: unknown) {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2002'
    )
}

export class FinanceService {
    private readonly repository: FinanceRepository

    constructor(repository = new FinanceRepository()) {
        this.repository = repository
    }

    async getWorkbook(userId: string): Promise<WorkbookDto> {
        const [settings, accounts, sheets, debts] = await Promise.all([
            this.repository.ensureSettings(userId),
            this.repository
                .ensureDefaultAccount(userId)
                .then(() => this.repository.listAccounts(userId)),
            this.repository.listSheets(userId),
            this.repository.listDebts(userId),
        ])

        return {
            accounts: accounts.map(toAccountDto),
            debts: debts.map(toDebtDto),
            settings: toSettingsDto(settings),
            sheets: sheets.map(toSheetDto),
        }
    }

    async updateSettings(userId: string, input: UpdateSettingsInput) {
        const settings = await this.repository.upsertSettings(userId, input)

        return toSettingsDto(settings)
    }

    async createAccount(userId: string, input: CreateAccountInput) {
        if (input.id) {
            const existingById = await this.repository.findAccount(userId, input.id)

            if (existingById) {
                return toAccountDto(existingById)
            }
        }

        const existingByName = await this.repository.findAccountByName(userId, input.name)

        if (existingByName) {
            if (existingByName.archivedAt) {
                const restored = await this.repository.updateAccount(existingByName.id, {
                    archivedAt: null,
                })

                return toAccountDto(restored)
            }

            throw new ConflictError('Ya tienes una cuenta con ese nombre.')
        }

        const sortOrder = await this.repository.nextAccountSortOrder(userId)

        try {
            const account = await this.repository.createAccount({
                id: input.id,
                name: input.name,
                sortOrder,
                userId,
            })

            return toAccountDto(account)
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictError('Ya tienes una cuenta con ese nombre.')
            }

            throw error
        }
    }

    async updateAccount(userId: string, id: string, input: UpdateAccountInput) {
        const account = await this.getOwnedAccount(userId, id)

        if (input.name && input.name.toLowerCase() !== account.name.toLowerCase()) {
            const duplicate = await this.repository.findAccountByName(userId, input.name)

            if (duplicate && duplicate.id !== id) {
                throw new ConflictError('Ya tienes una cuenta con ese nombre.')
            }
        }

        const updated = await this.repository.updateAccount(id, {
            archivedAt:
                input.archived === undefined
                    ? undefined
                    : input.archived
                      ? (account.archivedAt ?? new Date())
                      : null,
            name: input.name,
            sortOrder: input.sortOrder,
        })

        return toAccountDto(updated)
    }

    async deleteAccount(userId: string, id: string) {
        const account = await this.getOwnedAccount(userId, id)
        const usage = await this.repository.countAccountEntries(id)

        if (usage > 0) {
            const archived = await this.repository.updateAccount(id, {
                archivedAt: account.archivedAt ?? new Date(),
            })

            return { account: toAccountDto(archived), result: 'archived' as const }
        }

        await this.repository.deleteAccount(id)

        return { id, result: 'deleted' as const }
    }

    async createSheet(userId: string, input: CreateSheetInput) {
        const existing = await this.repository.findSheet(userId, input.yearMonth)

        if (existing) {
            throw new ConflictError('Ese mes ya tiene una hoja.')
        }

        const sheetId = randomUUID()
        let income = {}
        let entries: CopiedEntry[] = []

        if (input.copyFrom === 'PREVIOUS') {
            const previous = await this.repository.findPreviousSheet(userId, input.yearMonth)

            if (previous) {
                income = buildCopiedIncome(previous)
                entries = buildCopiedEntries(previous.entries, {
                    sheetId,
                    startSortOrder: 0,
                    userId,
                })
            }
        }

        try {
            const sheet = await this.repository.createSheetWithEntries(
                {
                    id: sheetId,
                    userId,
                    yearMonth: input.yearMonth,
                    ...income,
                },
                entries,
            )

            return toSheetDto(sheet)
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictError('Ese mes ya tiene una hoja.')
            }

            throw error
        }
    }

    async updateSheet(userId: string, yearMonth: string, input: UpdateSheetInput) {
        const sheet = await this.getOwnedSheet(userId, yearMonth)
        const updated = await this.repository.updateSheet(sheet.id, input)

        return toSheetFieldsDto(updated)
    }

    async deleteSheet(userId: string, yearMonth: string) {
        const sheet = await this.getOwnedSheet(userId, yearMonth)

        await this.repository.deleteSheet(sheet.id)

        return { deleted: true as const, yearMonth }
    }

    async copyPreviousSheet(userId: string, yearMonth: string) {
        const sheet = await this.getOwnedSheet(userId, yearMonth)
        const previous = await this.repository.findPreviousSheet(userId, yearMonth)

        if (!previous) {
            throw new NotFoundError('No hay un mes anterior para copiar.')
        }

        const startSortOrder =
            sheet.entries.reduce((max, entry) => Math.max(max, entry.sortOrder), -1) + 1
        const entries = buildCopiedEntries(previous.entries, {
            sheetId: sheet.id,
            startSortOrder,
            userId,
        })
        const income = toNumber(sheet.salary) === 0 ? buildCopiedIncome(previous) : null
        const updated = await this.repository.appendEntries(sheet.id, entries, income)

        return toSheetDto(updated)
    }

    async createEntry(userId: string, yearMonth: string, input: CreateEntryInput) {
        const sheet = await this.getOwnedSheet(userId, yearMonth)

        if (input.id) {
            const existing = await this.repository.findEntryById(input.id)

            if (existing) {
                if (existing.userId !== userId) {
                    throw new ConflictError('Ese identificador ya está en uso.')
                }

                return toEntryDto(existing)
            }
        }

        await this.assertReferences(userId, input.accountId, input.debtId)

        const sortOrder =
            input.sortOrder ?? (await this.repository.nextEntrySortOrder(sheet.id))
        const entry = await this.repository.createEntry({
            accountId: input.accountId ?? null,
            amount: input.amount ?? null,
            category: input.category ?? 'OTHER',
            concept: input.concept,
            debtId: input.debtId ?? null,
            dueDay: input.dueDay ?? null,
            id: input.id,
            isPaid: input.isPaid ?? false,
            note: input.note ?? null,
            sheetId: sheet.id,
            sortOrder,
            userId,
        })

        return toEntryDto(entry)
    }

    async updateEntry(userId: string, id: string, input: UpdateEntryInput) {
        const entry = await this.repository.findEntry(userId, id)

        if (!entry) {
            throw new NotFoundError('No encontramos ese gasto.')
        }

        await this.assertReferences(userId, input.accountId, input.debtId)

        const updated = await this.repository.updateEntry(id, input)

        return toEntryDto(updated)
    }

    async deleteEntry(userId: string, id: string) {
        const entry = await this.repository.findEntry(userId, id)

        if (!entry) {
            throw new NotFoundError('No encontramos ese gasto.')
        }

        await this.repository.deleteEntry(id)

        return { deleted: true as const, id }
    }

    async createSpend(userId: string, entryId: string, input: CreateSpendInput) {
        const entry = await this.repository.findEntry(userId, entryId)

        if (!entry) {
            throw new NotFoundError('No encontramos ese bolsillo.')
        }

        if (entry.category !== 'POCKET') {
            throw new RequestValidationError('Revisa los datos enviados.', [
                { field: 'entryId', message: 'Solo los bolsillos registran gastos.' },
            ])
        }

        if (input.id) {
            const existing = await this.repository.findSpendById(input.id)

            if (existing) {
                if (existing.userId !== userId) {
                    throw new ConflictError('Ese identificador ya está en uso.')
                }

                return toSpendDto(existing)
            }
        }

        const spend = await this.repository.createSpend({
            amount: input.amount,
            entryId,
            id: input.id,
            note: input.note ?? null,
            spentOn: toDateOnly(input.spentOn),
            userId,
        })

        return toSpendDto(spend)
    }

    async updateSpend(userId: string, id: string, input: UpdateSpendInput) {
        const spend = await this.repository.findSpend(userId, id)

        if (!spend) {
            throw new NotFoundError('No encontramos ese gasto del bolsillo.')
        }

        const updated = await this.repository.updateSpend(id, {
            ...(input.amount !== undefined ? { amount: input.amount } : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            ...(input.spentOn !== undefined ? { spentOn: toDateOnly(input.spentOn) } : {}),
        })

        return toSpendDto(updated)
    }

    async deleteSpend(userId: string, id: string) {
        const spend = await this.repository.findSpend(userId, id)

        if (!spend) {
            throw new NotFoundError('No encontramos ese gasto del bolsillo.')
        }

        await this.repository.deleteSpend(id)

        return { deleted: true as const, id }
    }

    async createDebt(userId: string, input: CreateDebtInput) {
        if (input.id) {
            const existing = await this.repository.findDebtById(input.id)

            if (existing) {
                if (existing.userId !== userId) {
                    throw new ConflictError('Ese identificador ya está en uso.')
                }

                return toDebtDto(existing)
            }
        }

        const sortOrder =
            input.sortOrder ?? (await this.repository.nextDebtSortOrder(userId))
        const debt = await this.repository.createDebt({
            ...input,
            sortOrder,
            userId,
        })

        return toDebtDto(debt)
    }

    async updateDebt(userId: string, id: string, input: UpdateDebtInput) {
        await this.getOwnedDebt(userId, id)

        const updated = await this.repository.updateDebt(id, input)

        return toDebtDto(updated)
    }

    async deleteDebt(userId: string, id: string) {
        await this.getOwnedDebt(userId, id)
        await this.repository.deleteDebt(id)

        return { deleted: true as const, id }
    }

    private async getOwnedAccount(userId: string, id: string) {
        const account = await this.repository.findAccount(userId, id)

        if (!account) {
            throw new NotFoundError('No encontramos esa cuenta.')
        }

        return account
    }

    private async getOwnedSheet(userId: string, yearMonth: string) {
        const sheet = await this.repository.findSheet(userId, yearMonth)

        if (!sheet) {
            throw new NotFoundError('Ese mes todavía no tiene hoja.')
        }

        return sheet
    }

    private async getOwnedDebt(userId: string, id: string) {
        const debt = await this.repository.findDebt(userId, id)

        if (!debt) {
            throw new NotFoundError('No encontramos esa deuda.')
        }

        return debt
    }

    private async assertReferences(
        userId: string,
        accountId: string | null | undefined,
        debtId: string | null | undefined,
    ) {
        const [account, debt] = await Promise.all([
            accountId ? this.repository.findAccount(userId, accountId) : null,
            debtId ? this.repository.findDebt(userId, debtId) : null,
        ])
        const issues: ValidationIssue[] = []

        if (accountId && !account) {
            issues.push({ field: 'accountId', message: 'La cuenta no existe.' })
        }

        if (debtId && !debt) {
            issues.push({ field: 'debtId', message: 'La deuda no existe.' })
        }

        if (issues.length > 0) {
            throw new RequestValidationError('Revisa los datos enviados.', issues)
        }
    }
}
