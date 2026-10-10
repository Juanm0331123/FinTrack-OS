import { randomUUID } from 'node:crypto'
import { isUniqueViolation } from '../../config/database-errors.ts'
import {
    ConflictError,
    NotFoundError,
    RequestValidationError,
    type ValidationIssue,
} from '../../utils/app-error.ts'
import { toAccountDto, toDebtDto, toEntryDto, toSettingsDto, toSheetDto, toSheetFieldsDto, toSpendDto } from './finance.mappers.ts'
import { FinanceRepository } from './finance.repository.ts'
import type {
    CopyPreviousSheetInput,
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
    WorkbookQuery,
} from './finance.schemas.ts'
import type { DecimalLike, WorkbookDto } from './finance.types.ts'
import { toNullableNumber, toNumber } from './finance.mappers.ts'
import { buildCopiedEntries, buildCopiedIncome } from './sheet-copy.ts'

// Cuotas funcionales por usuario: acotan el tamaño del libro y el costo de cada lectura.
export const FINANCE_LIMITS = {
    accounts: 50,
    debts: 100,
    entriesPerSheet: 300,
    sheets: 240,
    spendsPerEntry: 500,
}

export type Created<T> = { replayed: boolean; value: T }

function toDateOnly(isoDate: string) {
    return new Date(`${isoDate}T00:00:00.000Z`)
}

const idempotencyConflict = () =>
    new ConflictError(
        'Ese identificador ya se usó para otro registro. Recarga la página e intenta de nuevo.',
        'IDEMPOTENCY_CONFLICT',
    )

const limitReached = (message: string) => new ConflictError(message, 'LIMIT_REACHED')

// Un id ocupado que ya no se puede leer (otro dueño o borrado entretanto) no es un reintento.
function throwIdempotencyConflict(): never {
    throw idempotencyConflict()
}

function sameValue(stored: unknown, requested: unknown) {
    if (requested === undefined) {
        return true
    }

    if (stored !== null && typeof stored === 'object' && 'toNumber' in stored) {
        return toNullableNumber(stored as DecimalLike) === requested
    }

    return (stored ?? null) === (requested ?? null)
}

// Un reintento es equivalente si cada campo enviado coincide con lo guardado.
function matchesStored(stored: Record<string, unknown>, requested: Record<string, unknown>) {
    return Object.entries(requested).every(([key, value]) => key === 'id' || sameValue(stored[key], value))
}

type SharedTerms = { sharedAmount: number; sharedPercent: number | null; totalBalance: number }

// Con valor fijo, la parte de la otra persona no puede superar el saldo total (con porcentaje ya
// está acotada a 100 %). El campo señalado es el que el cambio intentó mover.
function sharedPortionIssue(terms: SharedTerms, changed: { sharedAmount?: unknown; totalBalance?: unknown }): ValidationIssue | null {
    if (terms.sharedPercent !== null || terms.sharedAmount <= terms.totalBalance) {
        return null
    }

    return changed.totalBalance !== undefined && changed.sharedAmount === undefined
        ? { field: 'totalBalance', message: 'El saldo total no puede ser menor que la parte de la otra persona.' }
        : { field: 'sharedAmount', message: 'La parte de la otra persona no puede superar el saldo total.' }
}

function touchesSharedTerms(input: UpdateDebtInput) {
    return input.sharedAmount !== undefined || input.sharedPercent !== undefined || input.totalBalance !== undefined
}

function assertDateInMonth(spentOn: string, yearMonth: string) {
    if (!spentOn.startsWith(`${yearMonth}-`)) {
        throw new RequestValidationError('Revisa los datos enviados.', [
            { field: 'spentOn', message: `La fecha debe estar dentro del mes ${yearMonth}.` },
        ])
    }
}

export class FinanceService {
    private readonly repository: FinanceRepository

    constructor(repository = new FinanceRepository()) {
        this.repository = repository
    }

    async getWorkbook(userId: string, period: WorkbookQuery = {}): Promise<WorkbookDto> {
        await this.repository.ensureFinanceDefaults(userId)

        const [settings, accounts, sheets, debts] = await Promise.all([
            this.repository.findSettings(userId),
            this.repository.listAccounts(userId),
            this.repository.listSheets(userId, period),
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
        return toSettingsDto(await this.repository.upsertSettings(userId, input))
    }

    async createAccount(userId: string, input: CreateAccountInput): Promise<Created<ReturnType<typeof toAccountDto>>> {
        if (input.id) {
            const replay = await this.replayAccount(userId, input)

            if (replay) {
                return replay
            }
        }

        try {
            const result = await this.repository.createAccount({ id: input.id, name: input.name, userId }, FINANCE_LIMITS.accounts)

            switch (result.status) {
                case 'created':
                    return { replayed: false, value: toAccountDto(result.account) }
                case 'id-taken':
                    return (await this.replayAccount(userId, input)) ?? throwIdempotencyConflict()
                case 'name-taken':
                    throw new ConflictError('Ya tienes una cuenta con ese nombre.', 'ACCOUNT_NAME_TAKEN')
                case 'limit-reached':
                    throw limitReached(`Puedes tener hasta ${FINANCE_LIMITS.accounts} cuentas.`)
            }
        } catch (error) {
            if (!isUniqueViolation(error)) {
                throw error
            }

            // Reintentos simultáneos con el mismo id y nombre: el que llegó segundo es un reintento.
            const replay = input.id ? await this.replayAccount(userId, input) : null

            if (replay) {
                return replay
            }

            throw new ConflictError('Ya tienes una cuenta con ese nombre.', 'ACCOUNT_NAME_TAKEN')
        }
    }

    async updateAccount(userId: string, id: string, input: UpdateAccountInput) {
        const account = await this.getOwnedAccount(userId, id)

        try {
            const updated = await this.repository.updateAccount(userId, id, {
                archivedAt: input.archived === undefined ? undefined : input.archived ? (account.archivedAt ?? new Date()) : null,
                name: input.name,
                sortOrder: input.sortOrder,
            })

            return toAccountDto(updated)
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictError('Ya tienes una cuenta con ese nombre.', 'ACCOUNT_NAME_TAKEN')
            }

            throw error
        }
    }

    async deleteAccount(userId: string, id: string) {
        await this.getOwnedAccount(userId, id)

        const outcome = await this.repository.deleteOrArchiveAccount(userId, id)

        return outcome.result === 'deleted'
            ? { id, result: 'deleted' as const }
            : { account: toAccountDto(outcome.account), result: 'archived' as const }
    }

    async createSheet(userId: string, input: CreateSheetInput): Promise<Created<ReturnType<typeof toSheetDto>>> {
        const copyFrom = input.copyFrom ?? 'NONE'
        const result = await this.repository.createSheet({
            buildContent: (previous, sheetId) =>
                previous
                    ? {
                          entries: buildCopiedEntries(previous.entries, { sheetId, startSortOrder: 0, userId }),
                          income: buildCopiedIncome(previous),
                      }
                    : { entries: [], income: {} },
            copyPrevious: copyFrom === 'PREVIOUS',
            entriesLimit: FINANCE_LIMITS.entriesPerSheet,
            fingerprint: `copyFrom=${copyFrom}`,
            operationId: input.operationId,
            sheetId: randomUUID(),
            sheetsLimit: FINANCE_LIMITS.sheets,
            userId,
            yearMonth: input.yearMonth,
        })

        switch (result.status) {
            case 'created':
            case 'replayed':
                return { replayed: result.status === 'replayed', value: toSheetDto(result.sheet) }
            case 'idempotency-conflict':
                throw idempotencyConflict()
            case 'limit-reached':
                throw limitReached(`Puedes tener hasta ${FINANCE_LIMITS.sheets} meses.`)
            case 'entries-limit':
                throw limitReached(`Un mes puede tener hasta ${FINANCE_LIMITS.entriesPerSheet} filas.`)
            case 'sheet-exists':
                throw new ConflictError('Ese mes ya tiene una hoja.', 'SHEET_EXISTS')
        }
    }

    async updateSheet(userId: string, yearMonth: string, input: UpdateSheetInput) {
        await this.getOwnedSheetRef(userId, yearMonth)

        return toSheetFieldsDto(await this.repository.updateSheet(userId, yearMonth, input))
    }

    async deleteSheet(userId: string, yearMonth: string) {
        await this.getOwnedSheetRef(userId, yearMonth)
        await this.repository.deleteSheet(userId, yearMonth)

        return { deleted: true as const, yearMonth }
    }

    async copyPreviousSheet(userId: string, yearMonth: string, input: CopyPreviousSheetInput = {}) {
        const outcome = await this.repository.copyPreviousSheet({
            buildEntries: (previous, sheetId, startSortOrder) =>
                buildCopiedEntries(previous.entries, { sheetId, startSortOrder, userId }),
            buildIncome: buildCopiedIncome,
            entriesLimit: FINANCE_LIMITS.entriesPerSheet,
            operationId: input.operationId,
            userId,
            yearMonth,
        })

        switch (outcome.status) {
            case 'copied':
            case 'replayed':
                return toSheetDto(outcome.sheet)
            case 'missing-sheet':
                throw new NotFoundError('Ese mes todavía no tiene hoja.')
            case 'no-previous':
                throw new NotFoundError('No hay un mes anterior para copiar.')
            case 'idempotency-conflict':
                throw idempotencyConflict()
            case 'limit-reached':
                throw limitReached(`Un mes puede tener hasta ${FINANCE_LIMITS.entriesPerSheet} filas: la copia las superaría.`)
        }
    }

    async createEntry(userId: string, yearMonth: string, input: CreateEntryInput): Promise<Created<ReturnType<typeof toEntryDto>>> {
        const sheet = await this.getOwnedSheetRef(userId, yearMonth)

        if (input.id) {
            const replay = await this.replayEntry(userId, sheet.id, input)

            if (replay) {
                return replay
            }
        }

        await this.assertReferences(userId, input.accountId, input.debtId)

        try {
            const result = await this.repository.createEntry({
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
                sortOrder: input.sortOrder,
                userId,
            }, FINANCE_LIMITS.entriesPerSheet)

            switch (result.status) {
                case 'created':
                    return { replayed: false, value: toEntryDto(result.entry) }
                case 'id-taken':
                    return (await this.replayEntry(userId, sheet.id, input)) ?? throwIdempotencyConflict()
                case 'missing-sheet':
                    throw new NotFoundError('Ese mes todavía no tiene hoja.')
                case 'limit-reached':
                    throw limitReached(`Un mes puede tener hasta ${FINANCE_LIMITS.entriesPerSheet} filas.`)
            }
        } catch (error) {
            // Dos reintentos simultáneos con el mismo id: el segundo resuelve como reintento.
            if (input.id && isUniqueViolation(error)) {
                const replay = await this.replayEntry(userId, sheet.id, input)

                if (replay) {
                    return replay
                }
            }

            throw error
        }
    }

    async updateEntry(userId: string, id: string, input: UpdateEntryInput) {
        const entry = await this.repository.findEntryRef(userId, id)

        if (!entry) {
            throw new NotFoundError('No encontramos ese gasto.')
        }

        await this.assertReferences(userId, input.accountId, input.debtId)

        // La decisión sobre los gastos se toma dentro de la transacción con la fila bloqueada: la
        // categoría leída aquí puede haber cambiado (otro cambio pudo convertirla en bolsillo y
        // registrarle gastos).
        const toNonPocket = input.category !== undefined && input.category !== 'POCKET'
        const result = await this.repository.updateEntry(userId, id, input, toNonPocket)

        if (result.blocked) {
            throw new ConflictError(
                'Este bolsillo tiene gastos registrados. Elimínalos antes de cambiar la categoría para no perderlos de los totales.',
                'POCKET_HAS_SPENDS',
            )
        }

        return toEntryDto(result.entry)
    }

    async deleteEntry(userId: string, id: string) {
        if (!(await this.repository.findEntryRef(userId, id))) {
            throw new NotFoundError('No encontramos ese gasto.')
        }

        await this.repository.deleteEntry(userId, id)

        return { deleted: true as const, id }
    }

    async createSpend(userId: string, entryId: string, input: CreateSpendInput): Promise<Created<ReturnType<typeof toSpendDto>>> {
        const entry = await this.repository.findEntryRef(userId, entryId)

        if (!entry) {
            throw new NotFoundError('No encontramos ese bolsillo.')
        }

        if (input.id) {
            const replay = await this.replaySpend(userId, entryId, input)

            if (replay) {
                return replay
            }
        }

        if (entry.category !== 'POCKET') {
            throw new RequestValidationError('Revisa los datos enviados.', [
                { field: 'entryId', message: 'Solo los bolsillos registran gastos.' },
            ])
        }

        assertDateInMonth(input.spentOn, entry.sheet.yearMonth)

        try {
            const result = await this.repository.createSpend(userId, entryId, {
                amount: input.amount,
                id: input.id,
                note: input.note ?? null,
                spentOn: toDateOnly(input.spentOn),
            }, FINANCE_LIMITS.spendsPerEntry)

            switch (result.status) {
                case 'created':
                    return { replayed: false, value: toSpendDto(result.spend) }
                case 'id-taken':
                    return (await this.replaySpend(userId, entryId, input)) ?? throwIdempotencyConflict()
                case 'not-pocket':
                    throw new RequestValidationError('Revisa los datos enviados.', [
                        { field: 'entryId', message: 'Solo los bolsillos registran gastos.' },
                    ])
                case 'limit-reached':
                    throw limitReached(`Un bolsillo puede tener hasta ${FINANCE_LIMITS.spendsPerEntry} gastos.`)
            }
        } catch (error) {
            if (input.id && isUniqueViolation(error)) {
                const replay = await this.replaySpend(userId, entryId, input)

                if (replay) {
                    return replay
                }
            }

            throw error
        }
    }

    async updateSpend(userId: string, id: string, input: UpdateSpendInput) {
        const spend = await this.repository.findSpendRef(userId, id)

        if (!spend) {
            throw new NotFoundError('No encontramos ese gasto del bolsillo.')
        }

        if (input.spentOn !== undefined) {
            assertDateInMonth(input.spentOn, spend.entry.sheet.yearMonth)
        }

        const updated = await this.repository.updateSpend(userId, id, {
            ...(input.amount !== undefined ? { amount: input.amount } : {}),
            ...(input.note !== undefined ? { note: input.note } : {}),
            ...(input.spentOn !== undefined ? { spentOn: toDateOnly(input.spentOn) } : {}),
        })

        return toSpendDto(updated)
    }

    async deleteSpend(userId: string, id: string) {
        if (!(await this.repository.findSpendRef(userId, id))) {
            throw new NotFoundError('No encontramos ese gasto del bolsillo.')
        }

        await this.repository.deleteSpend(userId, id)

        return { deleted: true as const, id }
    }

    async createDebt(userId: string, input: CreateDebtInput): Promise<Created<ReturnType<typeof toDebtDto>>> {
        const sharedIssue = sharedPortionIssue(
            { sharedAmount: input.sharedAmount ?? 0, sharedPercent: input.sharedPercent ?? null, totalBalance: input.totalBalance ?? 0 },
            input,
        )

        if (sharedIssue) {
            throw new RequestValidationError('Revisa los datos enviados.', [sharedIssue])
        }

        if (input.id) {
            const replay = await this.replayDebt(userId, input)

            if (replay) {
                return replay
            }
        }

        try {
            const result = await this.repository.createDebt({ ...input, userId }, FINANCE_LIMITS.debts)

            switch (result.status) {
                case 'created':
                    return { replayed: false, value: toDebtDto(result.debt) }
                case 'id-taken':
                    return (await this.replayDebt(userId, input)) ?? throwIdempotencyConflict()
                case 'limit-reached':
                    throw limitReached(`Puedes tener hasta ${FINANCE_LIMITS.debts} deudas.`)
            }
        } catch (error) {
            if (input.id && isUniqueViolation(error)) {
                return (await this.replayDebt(userId, input)) ?? throwIdempotencyConflict()
            }

            throw error
        }
    }

    async updateDebt(userId: string, id: string, input: UpdateDebtInput) {
        await this.getOwnedDebt(userId, id)

        // Solo los cambios que tocan saldo o parte compartida se validan contra el estado vigente:
        // editar el nombre de una deuda antigua inconsistente sigue siendo posible.
        const result = await this.repository.updateDebtChecked(userId, id, input, (current) =>
            touchesSharedTerms(input)
                ? sharedPortionIssue(
                      {
                          sharedAmount: input.sharedAmount ?? toNumber(current.sharedAmount),
                          sharedPercent: input.sharedPercent !== undefined ? input.sharedPercent : toNullableNumber(current.sharedPercent),
                          totalBalance: input.totalBalance ?? toNumber(current.totalBalance),
                      },
                      input,
                  )
                : null,
        )

        switch (result.status) {
            case 'missing':
                throw new NotFoundError('No encontramos esa deuda.')
            case 'rejected':
                throw new RequestValidationError('Revisa los datos enviados.', [result.rejection])
            case 'updated':
                return toDebtDto(result.debt)
        }
    }

    async deleteDebt(userId: string, id: string) {
        await this.getOwnedDebt(userId, id)
        await this.repository.deleteDebt(userId, id)

        return { deleted: true as const, id }
    }

    private async replayDebt(userId: string, input: CreateDebtInput) {
        const existing = await this.repository.findDebtForReplay(input.id!)

        if (!existing) {
            return null
        }

        if (existing.userId !== userId || !matchesStored(existing, input)) {
            throw idempotencyConflict()
        }

        return { replayed: true, value: toDebtDto(existing) }
    }

    // Una cuenta con ese id: mismo dueño y nombre es un reintento; otro dueño o nombre, conflicto.
    private async replayAccount(userId: string, input: CreateAccountInput) {
        const owner = await this.repository.findAccountOwner(input.id!)

        if (!owner) {
            return null
        }

        if (owner.userId !== userId || owner.name.toLowerCase() !== input.name.toLowerCase()) {
            throw idempotencyConflict()
        }

        return { replayed: true, value: toAccountDto((await this.repository.findAccount(userId, input.id!))!) }
    }

    // Reintento de creación: mismo dueño, misma hoja y mismo contenido devuelven la fila; un
    // identificador reutilizado para otro destino o contenido es un conflicto explícito. Nunca se
    // devuelve una fila ajena.
    private async replayEntry(userId: string, sheetId: string, input: CreateEntryInput) {
        const existing = await this.repository.findEntryForReplay(input.id!)

        if (!existing) {
            return null
        }

        if (existing.userId !== userId || existing.sheetId !== sheetId || !matchesStored(existing, input)) {
            throw idempotencyConflict()
        }

        return { replayed: true, value: toEntryDto(existing) }
    }

    private async replaySpend(userId: string, entryId: string, input: CreateSpendInput) {
        const existing = await this.repository.findSpendForReplay(input.id!)

        if (!existing) {
            return null
        }

        const stored = { ...existing, spentOn: existing.spentOn.toISOString().slice(0, 10) }

        if (existing.userId !== userId || existing.entryId !== entryId || !matchesStored(stored, input)) {
            throw idempotencyConflict()
        }

        return { replayed: true, value: toSpendDto(existing) }
    }

    private async getOwnedAccount(userId: string, id: string) {
        const account = await this.repository.findAccount(userId, id)

        if (!account) {
            throw new NotFoundError('No encontramos esa cuenta.')
        }

        return account
    }

    private async getOwnedSheetRef(userId: string, yearMonth: string) {
        const sheet = await this.repository.findSheetRef(userId, yearMonth)

        if (!sheet) {
            throw new NotFoundError('Ese mes todavía no tiene hoja.')
        }

        return sheet
    }

    private async getOwnedDebt(userId: string, id: string) {
        if (!(await this.repository.findDebt(userId, id))) {
            throw new NotFoundError('No encontramos esa deuda.')
        }
    }

    private async assertReferences(userId: string, accountId: string | null | undefined, debtId: string | null | undefined) {
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
