import {
    FinanceApiError,
    type AccountInput,
    type DebtInput,
    type EntryInput,
    type FinanceApi,
    type SheetFieldsInput,
    type SpendInput,
} from '../api/finance-api'
import { sortSpends } from '../domain/pockets'
import type {
    Debt,
    FinanceSettings,
    MoneyAccount,
    MonthEntry,
    MonthSheet,
    PocketSpend,
    Workbook,
} from '../domain/types'
import { createId } from './create-id'
import { createSaveQueue } from './save-queue'

export type SaveState = {
    error: string | null
    pending: number
}

export type WorkbookState = {
    error: string | null
    save: SaveState
    status: 'error' | 'loading' | 'ready'
    workbook: Workbook | null
}

export type NewEntryDraft = Omit<EntryInput, 'concept'> & { concept: string }

export type NewSpendDraft = Omit<PocketSpend, 'id'>

export type WorkbookStore = ReturnType<typeof createWorkbookStore>

function sortSheets(sheets: MonthSheet[]) {
    return sheets.toSorted((left, right) => left.yearMonth.localeCompare(right.yearMonth))
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback
}

function cleanNote(note: string | null | undefined) {
    const trimmed = note?.trim()

    return trimmed ? trimmed : null
}

// Un fallo sin respuesta definitiva (red, timeout, 5xx, 429) puede haberse aplicado en el
// servidor: el reintento debe usar el mismo operationId. Un 4xx definitivo cierra la operación.
function isRetryableFailure(error: unknown) {
    return !(error instanceof FinanceApiError) || error.status === 0 || error.status === 429 || error.status >= 500
}

// Borrar algo que el servidor ya no tiene (o nunca recibió) deja el mismo resultado.
async function deleteIgnoringMissing(run: () => Promise<unknown>) {
    try {
        await run()
    } catch (error) {
        if (!(error instanceof FinanceApiError && error.status === 404)) {
            throw error
        }
    }
}

function isIdempotencyConflict(error: unknown) {
    return error instanceof FinanceApiError && error.code === 'IDEMPOTENCY_CONFLICT'
}

function entryPayload(entry: MonthEntry) {
    return {
        accountId: entry.accountId,
        amount: entry.amount,
        category: entry.category,
        concept: entry.concept,
        debtId: entry.debtId,
        dueDay: entry.dueDay,
        isPaid: entry.isPaid,
        note: entry.note,
        sortOrder: entry.sortOrder,
    }
}

export function createWorkbookStore(api: FinanceApi) {
    let state: WorkbookState = {
        error: null,
        save: { error: null, pending: 0 },
        status: 'loading',
        workbook: null,
    }
    let loadPromise: Promise<void> | null = null
    // Cambia en cada stop: una carga iniciada antes no se aplica al terminar.
    let lifecycle = 0
    const listeners = new Set<() => void>()
    const pendingOperations = new Map<string, string>()

    async function withOperationId<T>(key: string, run: (operationId: string) => Promise<T>) {
        const operationId = pendingOperations.get(key) ?? createId()

        pendingOperations.set(key, operationId)

        try {
            const result = await run(operationId)

            pendingOperations.delete(key)

            return result
        } catch (error) {
            if (!isRetryableFailure(error)) {
                pendingOperations.delete(key)
            }

            throw error
        }
    }

    function findEntry(yearMonth: string, entryId: string) {
        return state.workbook?.sheets.find((sheet) => sheet.yearMonth === yearMonth)?.entries.find((entry) => entry.id === entryId)
    }

    function setState(next: WorkbookState) {
        state = next

        for (const listener of listeners) {
            listener()
        }
    }

    function updateWorkbook(updater: (workbook: Workbook) => Workbook) {
        if (state.workbook) {
            setState({ ...state, workbook: updater(state.workbook) })
        }
    }

    function updateSheet(yearMonth: string, updater: (sheet: MonthSheet) => MonthSheet) {
        updateWorkbook((workbook) => ({
            ...workbook,
            sheets: workbook.sheets.map((sheet) =>
                sheet.yearMonth === yearMonth ? updater(sheet) : sheet,
            ),
        }))
    }

    function updateEntryIn(yearMonth: string, entryId: string, updater: (entry: MonthEntry) => MonthEntry) {
        updateSheet(yearMonth, (sheet) => ({
            ...sheet,
            entries: sheet.entries.map((entry) => (entry.id === entryId ? updater(entry) : entry)),
        }))
    }

    function upsertSheet(sheet: MonthSheet) {
        updateWorkbook((workbook) => ({
            ...workbook,
            sheets: sortSheets([
                ...workbook.sheets.filter((item) => item.yearMonth !== sheet.yearMonth),
                sheet,
            ]),
        }))
    }

    const queue = createSaveQueue({
        onStatus: (save) => {
            if (save.error !== state.save.error || save.pending !== state.save.pending) {
                setState({ ...state, save })
            }
        },
    })

    const actions = {
        load() {
            const startedIn = lifecycle

            loadPromise ??= api
                .getWorkbook()
                .then((workbook) => {
                    if (startedIn === lifecycle) {
                        setState({ ...state, error: null, status: 'ready', workbook })
                    }
                })
                .catch((error: unknown) => {
                    if (startedIn !== lifecycle) {
                        return
                    }

                    loadPromise = null
                    setState({
                        ...state,
                        error: errorMessage(error, 'No pudimos cargar tu información.'),
                        status: 'error',
                    })
                })

            return loadPromise
        },

        reload() {
            loadPromise = null
            setState({ ...state, error: null, status: 'loading' })

            return actions.load()
        },

        flush() {
            queue.flushAll()
        },

        // Envía ya los cambios pendientes y espera a que terminen (con tope), p. ej. antes de
        // cerrar sesión, para que se guarden con la identidad de su dueño.
        async settle(timeoutMs: number) {
            queue.flushAll()

            let timer: ReturnType<typeof setTimeout> | undefined

            await Promise.race([
                queue.idle(),
                new Promise<void>((resolve) => {
                    timer = setTimeout(resolve, timeoutMs)
                }),
            ])
            clearTimeout(timer)
        },

        hasUnsavedChanges() {
            return queue.hasUnsaved()
        },

        retrySaves() {
            queue.retryFailed()
        },

        updateSettings(patch: Partial<FinanceSettings>) {
            updateWorkbook((workbook) => ({
                ...workbook,
                settings: { ...workbook.settings, ...patch },
            }))
            queue.patch('settings', patch, (merged) => api.updateSettings(merged))
        },

        async createAccount(name: string) {
            const account = await api.createAccount({ id: createId(), name: name.trim() })

            updateWorkbook((workbook) => ({
                ...workbook,
                accounts: [
                    ...workbook.accounts.filter((item) => item.id !== account.id),
                    account,
                ].toSorted((left, right) => left.sortOrder - right.sortOrder),
            }))

            return account
        },

        updateAccount(id: string, patch: AccountInput) {
            updateWorkbook((workbook) => ({
                ...workbook,
                accounts: workbook.accounts.map((account) =>
                    account.id === id ? { ...account, ...patch } : account,
                ),
            }))
            queue.patch(`account:${id}`, patch, (merged) => api.updateAccount(id, merged))
        },

        moveAccount(id: string, direction: -1 | 1) {
            const active = (state.workbook?.accounts ?? [])
                .filter((account) => !account.archived)
                .toSorted((left, right) => left.sortOrder - right.sortOrder)
            const index = active.findIndex((account) => account.id === id)
            const target = active[index + direction]

            if (index < 0 || !target) {
                return
            }

            const reordered = active.toSpliced(index, 1).toSpliced(index + direction, 0, active[index])

            reordered.forEach((account, position) => {
                if (account.sortOrder !== position) {
                    actions.updateAccount(account.id, { sortOrder: position })
                }
            })
        },

        async removeAccount(id: string) {
            const result = await api.deleteAccount(id)

            updateWorkbook((workbook) => ({
                ...workbook,
                accounts:
                    result.result === 'deleted'
                        ? workbook.accounts.filter((account) => account.id !== id)
                        : workbook.accounts.map((account) =>
                              account.id === id ? result.account : account,
                          ),
            }))

            return result.result
        },

        async createSheet(yearMonth: string, copyFrom: 'NONE' | 'PREVIOUS') {
            const sheet = await withOperationId(`create:${yearMonth}:${copyFrom}`, (operationId) =>
                api.createSheet({ copyFrom, operationId, yearMonth }),
            )

            upsertSheet(sheet)

            return sheet
        },

        async copyPreviousSheet(yearMonth: string) {
            queue.flushAll()

            const sheet = await withOperationId(`copy:${yearMonth}`, (operationId) =>
                api.copyPreviousSheet(yearMonth, operationId),
            )

            upsertSheet(sheet)

            return sheet
        },

        updateSheet(yearMonth: string, patch: SheetFieldsInput) {
            updateSheet(yearMonth, (sheet) => ({ ...sheet, ...patch }))
            queue.patch(`sheet:${yearMonth}`, patch, (merged) => api.updateSheet(yearMonth, merged))
        },

        addEntry(yearMonth: string, draft: NewEntryDraft) {
            const sheet = state.workbook?.sheets.find((item) => item.yearMonth === yearMonth)

            if (!sheet) {
                return null
            }

            const id = createId()
            const sortOrder = sheet.entries.reduce((max, entry) => Math.max(max, entry.sortOrder), -1) + 1
            const entry: MonthEntry = {
                accountId: draft.accountId ?? null,
                amount: draft.amount ?? null,
                category: draft.category ?? 'OTHER',
                concept: draft.concept.trim(),
                debtId: draft.debtId ?? null,
                dueDay: draft.dueDay ?? null,
                id,
                isPaid: draft.isPaid ?? false,
                note: draft.note ?? null,
                sortOrder,
                spends: [],
            }

            updateSheet(yearMonth, (current) => ({ ...current, entries: [...current.entries, entry] }))
            // El trabajo lee la fila al ejecutarse: un reintento envía su estado actual (con las
            // ediciones posteriores). Si el servidor ya la tenía con otro contenido, se concilia
            // con un PATCH del estado local.
            void queue.run(`entry:${id}`, async () => {
                const current = findEntry(yearMonth, id)

                if (!current) {
                    return
                }

                try {
                    await api.createEntry(yearMonth, { ...entryPayload(current), id })
                } catch (error) {
                    if (!isIdempotencyConflict(error)) {
                        throw error
                    }

                    await api.updateEntry(id, entryPayload(current))
                }
            })

            return id
        },

        updateEntry(yearMonth: string, id: string, patch: EntryInput) {
            updateEntryIn(yearMonth, id, (entry) => ({ ...entry, ...patch }))
            queue.patch(`entry:${id}`, patch, (merged) => api.updateEntry(id, merged))
        },

        deleteEntry(yearMonth: string, id: string) {
            updateSheet(yearMonth, (sheet) => ({
                ...sheet,
                entries: sheet.entries.filter((entry) => entry.id !== id),
            }))
            queue.cancel(`entry:${id}`)
            void queue.run(`entry:${id}`, () => deleteIgnoringMissing(() => api.deleteEntry(id)))
        },

        addSpend(yearMonth: string, entryId: string, draft: NewSpendDraft) {
            const spend: PocketSpend = {
                amount: draft.amount,
                id: createId(),
                note: cleanNote(draft.note),
                spentOn: draft.spentOn,
            }

            updateEntryIn(yearMonth, entryId, (entry) => ({ ...entry, spends: sortSpends([...entry.spends, spend]) }))
            void queue.run(`entry:${entryId}`, async () => {
                const current = findEntry(yearMonth, entryId)?.spends.find((item) => item.id === spend.id)

                if (!current) {
                    return
                }

                try {
                    await api.createSpend(entryId, current)
                } catch (error) {
                    if (!isIdempotencyConflict(error)) {
                        throw error
                    }

                    await api.updateSpend(current.id, { amount: current.amount, note: current.note, spentOn: current.spentOn })
                }
            })

            return spend.id
        },

        updateSpend(yearMonth: string, entryId: string, spendId: string, patch: SpendInput) {
            const cleaned = patch.note === undefined ? patch : { ...patch, note: cleanNote(patch.note) }

            updateEntryIn(yearMonth, entryId, (entry) => ({
                ...entry,
                spends: sortSpends(
                    entry.spends.map((spend) => (spend.id === spendId ? { ...spend, ...cleaned } : spend)),
                ),
            }))
            void queue.run(`entry:${entryId}`, () => api.updateSpend(spendId, cleaned))
        },

        deleteSpend(yearMonth: string, entryId: string, spendId: string) {
            updateEntryIn(yearMonth, entryId, (entry) => ({
                ...entry,
                spends: entry.spends.filter((spend) => spend.id !== spendId),
            }))
            void queue.run(`entry:${entryId}`, () => deleteIgnoringMissing(() => api.deleteSpend(spendId)))
        },

        async createDebt(draft: DebtInput & { name: string }) {
            const sortOrder =
                (state.workbook?.debts ?? []).reduce((max, debt) => Math.max(max, debt.sortOrder), -1) + 1
            const debt = await api.createDebt({ ...draft, id: createId(), sortOrder })

            updateWorkbook((workbook) => ({
                ...workbook,
                debts: [...workbook.debts.filter((item) => item.id !== debt.id), debt],
            }))

            return debt
        },

        updateDebt(id: string, patch: DebtInput) {
            updateWorkbook((workbook) => ({
                ...workbook,
                debts: workbook.debts.map((debt) => (debt.id === id ? ({ ...debt, ...patch } as Debt) : debt)),
            }))
            queue.patch(`debt:${id}`, patch, (merged) => api.updateDebt(id, merged))
        },

        deleteDebt(id: string) {
            updateWorkbook((workbook) => ({
                ...workbook,
                debts: workbook.debts.filter((debt) => debt.id !== id),
                sheets: workbook.sheets.map((sheet) =>
                    sheet.entries.some((entry) => entry.debtId === id)
                        ? {
                              ...sheet,
                              entries: sheet.entries.map((entry) =>
                                  entry.debtId === id ? { ...entry, debtId: null } : entry,
                              ),
                          }
                        : sheet,
                ),
            }))
            queue.cancel(`debt:${id}`)
            void queue.run(`debt:${id}`, () => api.deleteDebt(id))
        },
    }

    return {
        actions,
        getState: () => state,
        // Ciclo de vida ligado al montaje del proveedor. stop descarta temporizadores, cambios sin
        // enviar y fallos pendientes, cancela las peticiones en vuelo e ignora cargas tardías: nada
        // de este libro se envía después ni con otra identidad.
        start() {
            void actions.load()
        },
        stop() {
            lifecycle += 1
            loadPromise = null
            queue.dispose()
            api.abortPending()
        },
        subscribe(listener: () => void) {
            listeners.add(listener)

            return () => {
                listeners.delete(listener)
            }
        },
    }
}

export type WorkbookActions = WorkbookStore['actions']

export type AccountRecord = MoneyAccount
