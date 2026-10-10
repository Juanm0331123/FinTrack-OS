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
import { createSaveQueue, SaveRejectedError } from './save-queue'

export type SaveState = {
    error: string | null
    failed: number
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
    return [...sheets].sort((left, right) => left.yearMonth.localeCompare(right.yearMonth))
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback
}

function cleanNote(note: string | null | undefined) {
    const trimmed = note?.trim()

    return trimmed ? trimmed : null
}

function accountNameKey(name: string) {
    return name.trim().normalize('NFC').toLowerCase()
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

// Un rechazo definitivo de una creación (cuota, validación, mes inexistente): la fila optimista se
// retira y el motivo se informa sin ofrecer un reintento que fallaría igual.
function rejectedCreation(error: unknown) {
    return new SaveRejectedError(errorMessage(error, 'No pudimos guardar el registro.'))
}

function isIdempotencyConflict(error: unknown) {
    return error instanceof FinanceApiError && error.code === 'IDEMPOTENCY_CONFLICT'
}

// Valores canónicos de una respuesta (p. ej. tasas normalizadas a la escala de su columna), solo
// para los campos que ninguna edición posterior ha superado.
function canonicalFields<T>(result: T | null, fields: string[]): Partial<T> {
    if (result === null || typeof result !== 'object') {
        return {}
    }

    const source = result as Record<string, unknown>

    return Object.fromEntries(fields.filter((field) => field in source).map((field) => [field, source[field]])) as Partial<T>
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

// Fusiona una hoja recibida del servidor con la local: los campos y filas escritos localmente
// después de pedirla (touched) conservan su versión local; el resto adopta la del servidor.
function mergeSheetSnapshot(server: MonthSheet, local: MonthSheet, touched: Map<string, Set<string>>): MonthSheet {
    const sheetFields = touched.get(`sheet:${local.yearMonth}`) ?? new Set<string>()
    const localFields = Object.fromEntries(
        [...sheetFields].filter((field) => field in local).map((field) => [field, local[field as keyof MonthSheet]]),
    )
    const localById = new Map(local.entries.map((entry) => [entry.id, entry]))
    const isTouched = (id: string) => touched.has(`entry:${id}`)
        || localById.get(id)?.spends.some((spend) => touched.has(`spend:${spend.id}`))
    const serverIds = new Set(server.entries.map((entry) => entry.id))
    const entries = server.entries
        .filter((entry) => !isTouched(entry.id) || localById.has(entry.id))
        .map((entry) => (isTouched(entry.id) ? localById.get(entry.id)! : entry))
        .concat(local.entries.filter((entry) => !serverIds.has(entry.id) && isTouched(entry.id)))

    return { ...server, ...localFields, entries }
}

export function createWorkbookStore(api: FinanceApi) {
    let state: WorkbookState = {
        error: null,
        save: { error: null, failed: 0, pending: 0 },
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
            if (save.error !== state.save.error || save.failed !== state.save.failed || save.pending !== state.save.pending) {
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
        // cerrar sesión, para que se guarden con la identidad de su dueño. saved=false significa que
        // algo falló o no terminó a tiempo: quien sale debe ofrecer reintentar o descartar.
        async settle(timeoutMs: number): Promise<{ saved: boolean }> {
            queue.flushAll()

            let timer: ReturnType<typeof setTimeout> | undefined

            await Promise.race([
                queue.idle(),
                new Promise<void>((resolve) => {
                    timer = setTimeout(resolve, timeoutMs)
                }),
            ])
            clearTimeout(timer)

            return { saved: !queue.hasUnsaved() }
        },

        hasUnsavedChanges() {
            return queue.hasUnsaved()
        },

        // Descarte explícito: olvida los fallos y vuelve a leer el libro del servidor.
        async discardFailedSaves() {
            queue.discardFailed()
            await queue.idle()

            return actions.reload()
        },

        retrySaves() {
            queue.retryFailed()
        },

        dismissSaveError() {
            queue.dismissError()
        },

        updateSettings(patch: Partial<FinanceSettings>) {
            updateWorkbook((workbook) => ({
                ...workbook,
                settings: { ...workbook.settings, ...patch },
            }))
            queue.patch('settings', patch, (merged) => api.updateSettings(merged), (saved, fields) =>
                updateWorkbook((workbook) => ({
                    ...workbook,
                    settings: { ...workbook.settings, ...canonicalFields(saved, fields) },
                })),
            )
        },

        async createAccount(name: string) {
            const archived = state.workbook?.accounts.find(
                (account) => account.archived && accountNameKey(account.name) === accountNameKey(name),
            )
            // Restaurar conserva el id y los movimientos. Si se pierde la respuesta, el estado
            // local sigue archivado y el siguiente intento repite el mismo PATCH idempotente.
            // Una creación sin respuesta puede haberse aplicado: el reintento con el mismo nombre usa
            // el mismo id y el servidor la reconoce, en vez de responder «ya existe».
            const account = archived
                ? await api.updateAccount(archived.id, { archived: false })
                : await withOperationId(`account:${accountNameKey(name)}`, (id) => api.createAccount({ id, name: name.trim() }))

            updateWorkbook((workbook) => ({
                ...workbook,
                accounts: [
                    ...workbook.accounts.filter((item) => item.id !== account.id),
                    account,
                ].sort((left, right) => left.sortOrder - right.sortOrder),
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
            queue.patch(`account:${id}`, patch, (merged) => api.updateAccount(id, merged), (saved, fields) =>
                updateWorkbook((workbook) => ({
                    ...workbook,
                    accounts: workbook.accounts.map((account) =>
                        account.id === id ? { ...account, ...canonicalFields(saved, fields) } : account,
                    ),
                })),
            )
        },

        moveAccount(id: string, direction: -1 | 1) {
            const active = (state.workbook?.accounts ?? [])
                .filter((account) => !account.archived)
                .sort((left, right) => left.sortOrder - right.sortOrder)
            const index = active.findIndex((account) => account.id === id)
            const target = active[index + direction]

            if (index < 0 || !target) {
                return
            }

            const reordered = active.filter((_, position) => position !== index)

            reordered.splice(index + direction, 0, active[index])

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

        // La copia se ejecuta sobre lo ya guardado: primero se envían y esperan los guardados en
        // vuelo (así el servidor ve el salario vigente y respeta un destino distinto de cero). Con
        // fallos sin resolver no se copia. Lo que se edite mientras la copia viaja se conserva al
        // fusionar la respuesta y se guarda después.
        async copyPreviousSheet(yearMonth: string) {
            queue.flushAll()

            const startedAt = queue.revision()

            await queue.idle()

            if (queue.hasFailed()) {
                throw new Error('Hay cambios sin guardar. Reintenta o descártalos antes de copiar el mes.')
            }

            const copied = await withOperationId(`copy:${yearMonth}`, (operationId) =>
                api.copyPreviousSheet(yearMonth, operationId),
            )

            const touched = queue.touchedSince(startedAt)
            const local = state.workbook?.sheets.find((sheet) => sheet.yearMonth === yearMonth)

            upsertSheet(local ? mergeSheetSnapshot(copied, local, touched) : copied)

            return copied
        },

        updateSheet(yearMonth: string, patch: SheetFieldsInput) {
            updateSheet(yearMonth, (sheet) => ({ ...sheet, ...patch }))
            queue.patch(`sheet:${yearMonth}`, patch, (merged) => api.updateSheet(yearMonth, merged), (saved, fields) =>
                updateSheet(yearMonth, (sheet) => ({ ...sheet, ...canonicalFields(saved, fields) })),
            )
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
                    if (isIdempotencyConflict(error)) {
                        await api.updateEntry(id, entryPayload(current))
                        return
                    }

                    if (isRetryableFailure(error)) {
                        throw error
                    }

                    queue.cancel(`entry:${id}`)
                    updateSheet(yearMonth, (sheet) => ({
                        ...sheet,
                        entries: sheet.entries.filter((entry) => entry.id !== id),
                    }))
                    throw rejectedCreation(error)
                }
            })

            return id
        },

        updateEntry(yearMonth: string, id: string, patch: EntryInput) {
            updateEntryIn(yearMonth, id, (entry) => ({ ...entry, ...patch }))
            // Si la fila se retiró (creación rechazada o borrada) el parche ya no tiene destino.
            queue.patch(`entry:${id}`, patch, (merged) => (findEntry(yearMonth, id) ? api.updateEntry(id, merged) : Promise.resolve(null)), (saved, fields) =>
                updateEntryIn(yearMonth, id, (entry) => ({ ...entry, ...canonicalFields(saved, fields) })),
            )
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
                    if (isIdempotencyConflict(error)) {
                        await api.updateSpend(current.id, { amount: current.amount, note: current.note, spentOn: current.spentOn })
                        return
                    }

                    if (isRetryableFailure(error)) {
                        throw error
                    }

                    updateEntryIn(yearMonth, entryId, (entry) => ({
                        ...entry,
                        spends: entry.spends.filter((item) => item.id !== spend.id),
                    }))
                    throw rejectedCreation(error)
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
            queue.patch(
                `spend:${spendId}`,
                cleaned,
                (merged) => (findEntry(yearMonth, entryId)?.spends.some((spend) => spend.id === spendId)
                    ? api.updateSpend(spendId, merged)
                    : Promise.resolve(null)),
                (saved, fields) => updateEntryIn(yearMonth, entryId, (entry) => ({
                    ...entry,
                    spends: sortSpends(entry.spends.map((spend) => spend.id === spendId
                        ? { ...spend, ...canonicalFields(saved, fields) }
                        : spend)),
                })),
                `entry:${entryId}`,
            )
        },

        deleteSpend(yearMonth: string, entryId: string, spendId: string) {
            queue.cancel(`spend:${spendId}`)
            updateEntryIn(yearMonth, entryId, (entry) => ({
                ...entry,
                spends: entry.spends.filter((spend) => spend.id !== spendId),
            }))
            void queue.run(`entry:${entryId}`, () => deleteIgnoringMissing(() => api.deleteSpend(spendId)))
        },

        // clientId identifica la acción del usuario (un formulario de deuda nueva): repetirla tras una
        // respuesta perdida reutiliza el mismo id y el servidor la reconoce como reintento. Si el
        // contenido cambió, el servidor responde conflicto de idempotencia y la misma deuda se
        // actualiza con el contenido vigente, en lugar de crear otra.
        async createDebt(draft: DebtInput & { name: string }, clientId: string) {
            const sortOrder =
                (state.workbook?.debts ?? []).reduce((max, debt) => Math.max(max, debt.sortOrder), -1) + 1
            let debt: Debt

            try {
                debt = await api.createDebt({ ...draft, id: clientId, sortOrder })
            } catch (error) {
                if (!isIdempotencyConflict(error)) {
                    throw error
                }

                debt = await api.updateDebt(clientId, { ...draft, sortOrder })
            }

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
            queue.patch(`debt:${id}`, patch, (merged) => api.updateDebt(id, merged), (saved, fields) =>
                updateWorkbook((workbook) => ({
                    ...workbook,
                    debts: workbook.debts.map((debt) => (debt.id === id ? { ...debt, ...canonicalFields(saved, fields) } : debt)),
                })),
            )
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
