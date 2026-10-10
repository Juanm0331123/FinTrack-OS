import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FinanceApiError, type FinanceApi } from '../api/finance-api'
import { accounts, debt, entry, sampleSheet, settings } from '../domain/test-fixtures'
import type { MonthSheet, PocketSpend, Workbook } from '../domain/types'
import { createWorkbookStore } from './workbook-store'

function workbook(): Workbook {
    return {
        accounts,
        debts: [debt({ id: 'card', name: 'Tarjeta' })],
        settings,
        sheets: [sampleSheet()],
    }
}

function fakeApi(overrides: Partial<FinanceApi> = {}) {
    return {
        abortPending: vi.fn(),
        createEntry: vi.fn(async (_yearMonth: string, input: { id: string }) => ({ ...input })),
        createSpend: vi.fn(async (_entryId: string, input: { id: string }) => ({ ...input })),
        deleteSpend: vi.fn(async () => ({ deleted: true as const })),
        deleteDebt: vi.fn(async () => ({ deleted: true as const })),
        deleteEntry: vi.fn(async () => ({ deleted: true as const })),
        getWorkbook: vi.fn(async () => workbook()),
        updateEntry: vi.fn(async (id: string) => ({ id })),
        updateSettings: vi.fn(async () => settings),
        updateSheet: vi.fn(async () => sampleSheet()),
        updateSpend: vi.fn(async (id: string) => ({ id })),
        ...overrides,
    } as unknown as FinanceApi
}

describe('createWorkbookStore', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('loads the workbook once even if load is called twice', async () => {
        const api = fakeApi()
        const store = createWorkbookStore(api)

        await Promise.all([store.actions.load(), store.actions.load()])

        expect(api.getWorkbook).toHaveBeenCalledTimes(1)
        expect(store.getState().status).toBe('ready')
    })

    it('restores an archived account by its original id and retries a lost response with the same patch', async () => {
        const original = { archived: true, id: 'archived-account', name: 'Ahorros café', sortOrder: 3 }
        let serverArchived = true
        let attempts = 0
        const api = fakeApi({
            createAccount: vi.fn(async () => {
                throw new FinanceApiError(409, 'Ya tienes una cuenta con ese nombre.', 'ACCOUNT_NAME_TAKEN')
            }),
            getWorkbook: vi.fn(async () => ({ ...workbook(), accounts: [original] })),
            updateAccount: vi.fn(async () => {
                serverArchived = false
                attempts += 1

                if (attempts === 1) {
                    throw new FinanceApiError(0, 'Respuesta perdida')
                }

                return { ...original, archived: false }
            }),
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        await expect(store.actions.createAccount('  AHORROS CAFE\u0301  ')).rejects.toThrow('Respuesta perdida')

        expect(serverArchived).toBe(false)
        expect(store.getState().workbook!.accounts[0].archived).toBe(true)

        const restored = await store.actions.createAccount('  AHORROS CAFE\u0301  ')

        expect(restored).toEqual({ ...original, archived: false })
        expect(api.createAccount).not.toHaveBeenCalled()
        expect(api.updateAccount).toHaveBeenCalledTimes(2)
        expect(api.updateAccount).toHaveBeenNthCalledWith(1, original.id, { archived: false })
        expect(api.updateAccount).toHaveBeenNthCalledWith(2, original.id, { archived: false })
        expect(store.getState().workbook!.accounts).toEqual([{ ...original, archived: false }])

        // Once active, a fresh create request keeps the duplicate-name contract.
        await expect(store.actions.createAccount('Ahorros café')).rejects.toThrow('Ya tienes una cuenta con ese nombre.')
        expect(api.createAccount).toHaveBeenCalledTimes(1)
    })

    it('updates an entry optimistically and saves one coalesced patch', async () => {
        const api = fakeApi()
        const store = createWorkbookStore(api)

        await store.actions.load()

        const [first] = store.getState().workbook!.sheets[0].entries

        store.actions.updateEntry('2026-03', first.id, { amount: 31_000 })
        store.actions.updateEntry('2026-03', first.id, { isPaid: false })

        expect(store.getState().workbook!.sheets[0].entries[0]).toMatchObject({ amount: 31_000, isPaid: false })
        expect(api.updateEntry).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(600)

        expect(api.updateEntry).toHaveBeenCalledTimes(1)
        expect(api.updateEntry).toHaveBeenCalledWith(first.id, { amount: 31_000, isPaid: false })
    })

    it('adds an entry with a client id at the end of the sheet and posts it', async () => {
        const api = fakeApi()
        const store = createWorkbookStore(api)

        await store.actions.load()

        const id = store.actions.addEntry('2026-03', { amount: 9_000, category: 'POCKET', concept: '  Café  ' })
        const entries = store.getState().workbook!.sheets[0].entries

        expect(entries.at(-1)).toMatchObject({ amount: 9_000, concept: 'Café', id })
        await vi.runAllTimersAsync()
        expect(api.createEntry).toHaveBeenCalledWith('2026-03', expect.objectContaining({ concept: 'Café', id }))
    })

    it('records pocket spends in date order and only after the pocket exists on the server', async () => {
        const calls: string[] = []
        const api = fakeApi({
            createEntry: vi.fn(async (_yearMonth: string, input: { id: string }) => {
                calls.push('entry')

                return input
            }) as unknown as FinanceApi['createEntry'],
            createSpend: vi.fn(async (_entryId: string, input: { id: string }) => {
                calls.push('spend')

                return input
            }) as unknown as FinanceApi['createSpend'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()

        const pocketId = store.actions.addEntry('2026-03', { amount: 300_000, category: 'POCKET', concept: 'Gasolina' })!

        store.actions.addSpend('2026-03', pocketId, { amount: 50_000, note: '  Tanqueo  ', spentOn: '2026-03-09' })
        store.actions.addSpend('2026-03', pocketId, { amount: 20_000, note: '', spentOn: '2026-03-02' })

        const pocket = store.getState().workbook!.sheets[0].entries.find((item) => item.id === pocketId)!

        expect(pocket.spends.map((spend) => [spend.spentOn, spend.amount, spend.note])).toEqual([
            ['2026-03-02', 20_000, null],
            ['2026-03-09', 50_000, 'Tanqueo'],
        ])

        await vi.runAllTimersAsync()

        expect(calls).toEqual(['entry', 'spend', 'spend'])
        expect(api.createSpend).toHaveBeenCalledWith(pocketId, expect.objectContaining({ amount: 50_000, note: 'Tanqueo' }))
    })

    it('edits and removes a spend locally and on the server', async () => {
        const api = fakeApi()
        const store = createWorkbookStore(api)

        await store.actions.load()

        const mercado = store.getState().workbook!.sheets[0].entries.find((item) => item.concept === 'Mercado')!
        const spendId = store.actions.addSpend('2026-03', mercado.id, { amount: 80_000, note: null, spentOn: '2026-03-05' })
        const spendsOf = () =>
            store.getState().workbook!.sheets[0].entries.find((item) => item.id === mercado.id)!.spends

        await vi.runAllTimersAsync()
        store.actions.updateSpend('2026-03', mercado.id, spendId, { amount: 85_000 })
        expect(spendsOf()[0]).toMatchObject({ amount: 85_000, id: spendId })
        await vi.runAllTimersAsync()

        store.actions.deleteSpend('2026-03', mercado.id, spendId)
        expect(spendsOf()).toHaveLength(0)

        await vi.runAllTimersAsync()

        expect(api.updateSpend).toHaveBeenCalledWith(spendId, { amount: 85_000 })
        expect(api.deleteSpend).toHaveBeenCalledWith(spendId)
    })

    // FR-01: los gastos tienen las mismas garantías de revisión que los campos de la hoja.
    it('does not replay an older failed pocket amount over a newer saved amount', async () => {
        const server: PocketSpend = { amount: 50, id: 'spend-retry', note: null, spentOn: '2026-03-10' }
        let failNext = true
        const api = fakeApi({
            getWorkbook: vi.fn(async () => ({
                ...workbook(),
                sheets: [sampleSheet({ entries: [entry('Mercado', 1_000, 'POCKET', { id: 'pocket', spends: [{ ...server }] })] })],
            })),
            updateSpend: vi.fn(async (_id, input) => {
                if (failNext) {
                    failNext = false
                    throw new FinanceApiError(503, 'Servicio no disponible')
                }

                Object.assign(server, input)
                return { ...server }
            }),
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSpend('2026-03', 'pocket', server.id, { amount: 100 })
        await vi.runAllTimersAsync()
        expect(store.getState().save.failed).toBe(1)

        store.actions.updateSpend('2026-03', 'pocket', server.id, { amount: 200 })
        await vi.runAllTimersAsync()
        store.actions.retrySaves()
        await vi.runAllTimersAsync()

        expect(server.amount).toBe(200)
        expect(store.getState().workbook!.sheets[0].entries[0].spends[0].amount).toBe(200)
        expect(store.actions.hasUnsavedChanges()).toBe(false)
        await store.actions.reload()
        expect(store.getState().workbook!.sheets[0].entries[0].spends[0].amount).toBe(200)
    })

    function pocketServer() {
        const spends = new Map<string, PocketSpend>([
            ['spend-1', { amount: 50, id: 'spend-1', note: 'Original', spentOn: '2026-03-10' }],
            ['spend-2', { amount: 60, id: 'spend-2', note: null, spentOn: '2026-03-11' }],
        ])
        const snapshot = () => ({
            ...workbook(),
            sheets: [sampleSheet({ entries: [entry('Mercado', 1_000, 'POCKET', {
                id: 'pocket', spends: [...spends.values()].map((spend) => ({ ...spend })),
            })] })],
        })
        const api = fakeApi({
            getWorkbook: vi.fn(async () => snapshot()),
            deleteSpend: vi.fn(async (id) => {
                spends.delete(id)
                return { deleted: true as const }
            }),
            updateSpend: vi.fn(async (id, input) => {
                const updated = { ...spends.get(id)!, ...input }

                spends.set(id, updated)
                return { ...updated }
            }),
        })

        return { api, snapshot, spends }
    }

    it('retries only the unchanged failed spend fields and keeps different spends independent', async () => {
        const { api, spends } = pocketServer()
        const update = api.updateSpend

        api.updateSpend = vi.fn().mockRejectedValueOnce(new FinanceApiError(503, 'Sin servicio')).mockImplementation(update)

        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 100, note: 'Pendiente' })
        await vi.runAllTimersAsync()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 200 })
        store.actions.updateSpend('2026-03', 'pocket', 'spend-2', { amount: 300 })
        await vi.runAllTimersAsync()
        store.actions.retrySaves()
        await vi.runAllTimersAsync()
        await store.actions.reload()

        expect(spends.get('spend-1')).toMatchObject({ amount: 200, note: 'Pendiente' })
        expect(spends.get('spend-2')).toMatchObject({ amount: 300, note: null })
        expect(store.getState().workbook!.sheets[0].entries[0].spends).toEqual([...spends.values()])
        expect(store.actions.hasUnsavedChanges()).toBe(false)
    })

    it('adopts a canonical spend response without replacing a newer pending field', async () => {
        const { api, spends } = pocketServer()
        const release: Array<() => void> = []

        api.updateSpend = vi.fn((id, input) => new Promise<PocketSpend>((resolve) => {
            const updated = { ...spends.get(id)!, ...input, amount: Math.round(input.amount ?? 0) }

            spends.set(id, updated)
            release.push(() => resolve({ ...updated }))
        }))

        const store = createWorkbookStore(api)
        const current = () => store.getState().workbook!.sheets[0].entries[0].spends[0]

        await store.actions.load()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 100.4 })
        await vi.advanceTimersByTimeAsync(600)
        release.shift()!()
        await vi.advanceTimersByTimeAsync(0)
        expect(current().amount).toBe(100)

        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 150.4 })
        await vi.advanceTimersByTimeAsync(600)
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 200.4 })
        release.shift()!()
        await vi.advanceTimersByTimeAsync(0)
        expect(current().amount).toBe(200.4)
        await vi.advanceTimersByTimeAsync(600)
        release.shift()!()
        await vi.runAllTimersAsync()

        expect(current().amount).toBe(200)
        expect(spends.get('spend-1')!.amount).toBe(200)
    })

    it('does not retry or send a cancelled edit after its spend is deleted', async () => {
        const { api, spends } = pocketServer()
        const update = api.updateSpend

        api.updateSpend = vi.fn().mockRejectedValueOnce(new FinanceApiError(503, 'Sin servicio')).mockImplementation(update)

        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 100 })
        await vi.runAllTimersAsync()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 200 })
        store.actions.deleteSpend('2026-03', 'pocket', 'spend-1')
        await vi.runAllTimersAsync()
        store.actions.retrySaves()
        await vi.runAllTimersAsync()
        await store.actions.reload()

        expect(spends.has('spend-1')).toBe(false)
        expect(store.getState().workbook!.sheets[0].entries[0].spends.map((spend) => spend.id)).toEqual(['spend-2'])
        expect(store.actions.hasUnsavedChanges()).toBe(false)
        expect(api.updateSpend).toHaveBeenCalledTimes(1)
    })

    it('waits for a slow pocket spend creation before sending its edited fields', async () => {
        const { api, spends } = pocketServer()
        let releaseCreate: () => void = () => undefined

        api.createSpend = vi.fn((_entryId, input) => new Promise<PocketSpend>((resolve) => {
            releaseCreate = () => {
                spends.set(input.id, { ...input })
                resolve(spends.get(input.id)!)
            }
        }))
        const update = api.updateSpend

        api.updateSpend = vi.fn(async (id, input) => {
            if (!spends.has(id)) {
                throw new FinanceApiError(404, 'Gasto inexistente')
            }

            return update(id, input)
        })

        const store = createWorkbookStore(api)

        await store.actions.load()
        const id = store.actions.addSpend('2026-03', 'pocket', { amount: 100, note: null, spentOn: '2026-03-12' })

        await vi.advanceTimersByTimeAsync(0)
        store.actions.updateSpend('2026-03', 'pocket', id, { amount: 200 })
        await vi.advanceTimersByTimeAsync(600)
        releaseCreate()
        await vi.runAllTimersAsync()
        await store.actions.reload()

        expect(spends.get(id)!.amount).toBe(200)
        expect(store.getState().save).toMatchObject({ error: null, failed: 0, pending: 0 })
        expect(store.getState().workbook!.sheets[0].entries[0].spends.find((spend) => spend.id === id)!.amount).toBe(200)
    })

    it('keeps pocket edits made while a month copy response is in flight', async () => {
        const { api, snapshot, spends } = pocketServer()
        let releaseCopy: () => void = () => undefined

        api.copyPreviousSheet = vi.fn(() => new Promise<MonthSheet>((resolve) => {
            const copied = snapshot().sheets[0]

            releaseCopy = () => resolve(copied)
        }))

        const store = createWorkbookStore(api)

        await store.actions.load()
        const copy = store.actions.copyPreviousSheet('2026-03')

        await vi.advanceTimersByTimeAsync(0)
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 200 })
        releaseCopy()
        await copy

        expect(store.getState().workbook!.sheets[0].entries[0].spends[0].amount).toBe(200)
        await vi.runAllTimersAsync()
        expect(spends.get('spend-1')!.amount).toBe(200)
    })

    it('does not send queued spend edits or apply a late spend response after stopping the store', async () => {
        const { api } = pocketServer()
        let release: () => void = () => undefined

        api.updateSpend = vi.fn((id, input) => new Promise<PocketSpend>((resolve) => {
            release = () => resolve({ amount: input.amount!, id, note: 'Respuesta anterior', spentOn: '2026-03-10' })
        }))
        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 100 })
        await vi.advanceTimersByTimeAsync(600)
        store.actions.updateSpend('2026-03', 'pocket', 'spend-1', { amount: 200 })
        store.stop()
        release()
        await vi.runAllTimersAsync()

        expect(api.updateSpend).toHaveBeenCalledTimes(1)
        expect(store.getState().workbook!.sheets[0].entries[0].spends[0]).toMatchObject({ amount: 200, note: 'Original' })
        expect(store.actions.hasUnsavedChanges()).toBe(false)
    })

    it('unlinks month rows locally when a debt is deleted', async () => {
        const api = fakeApi()
        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.deleteDebt('card')

        const linked = store
            .getState()
            .workbook!.sheets[0].entries.filter((entry) => entry.debtId === 'card')

        expect(linked).toHaveLength(0)
        expect(store.getState().workbook!.debts).toHaveLength(0)
    })

    it('exposes a load error and recovers with reload', async () => {
        let fail = true
        const api = fakeApi({
            getWorkbook: vi.fn(async () => {
                if (fail) {
                    throw new Error('Sin conexión')
                }

                return workbook()
            }),
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        expect(store.getState()).toMatchObject({ error: 'Sin conexión', status: 'error' })

        fail = false
        await store.actions.reload()
        expect(store.getState().status).toBe('ready')
    })
    it('retries a failed month copy with the same operation id and uses a new id for a new copy', async () => {
        const operationIds: string[] = []
        let failNext = true
        const api = fakeApi({
            copyPreviousSheet: vi.fn(async (_yearMonth: string, operationId: string) => {
                operationIds.push(operationId)

                if (failNext) {
                    failNext = false
                    throw new FinanceApiError(0, 'Sin conexión')
                }

                return sampleSheet()
            }) as unknown as FinanceApi['copyPreviousSheet'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        await expect(store.actions.copyPreviousSheet('2026-03')).rejects.toThrow('Sin conexión')
        await store.actions.copyPreviousSheet('2026-03')
        await store.actions.copyPreviousSheet('2026-03')

        expect(operationIds[0]).toBe(operationIds[1])
        expect(operationIds[2]).not.toBe(operationIds[1])
    })

    it('does not reuse an operation id after a definitive rejection', async () => {
        const operationIds: string[] = []
        const api = fakeApi({
            createSheet: vi.fn(async (input: { operationId: string }) => {
                operationIds.push(input.operationId)

                if (operationIds.length === 1) {
                    throw new FinanceApiError(409, 'Ese mes ya tiene una hoja.', 'SHEET_EXISTS')
                }

                return sampleSheet()
            }) as unknown as FinanceApi['createSheet'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        await expect(store.actions.createSheet('2026-04', 'NONE')).rejects.toThrow()
        await store.actions.createSheet('2026-04', 'NONE')

        expect(operationIds[0]).not.toBe(operationIds[1])
    })

    it('retries a failed row creation with the row as it is now and reconciles an id conflict with a patch', async () => {
        let createAttempts = 0
        const api = fakeApi({
            createEntry: vi.fn(async () => {
                createAttempts += 1

                if (createAttempts === 1) {
                    throw new FinanceApiError(0, 'Sin conexión')
                }

                throw new FinanceApiError(409, 'Ese identificador ya se usó.', 'IDEMPOTENCY_CONFLICT')
            }) as unknown as FinanceApi['createEntry'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()

        const id = store.actions.addEntry('2026-03', { amount: 1_000, category: 'FIXED', concept: 'Gimnasio' })!

        await vi.runAllTimersAsync()
        store.actions.updateEntry('2026-03', id, { amount: 2_000 })
        await vi.advanceTimersByTimeAsync(600)
        store.actions.retrySaves()
        await vi.runAllTimersAsync()

        const secondCreate = (api.createEntry as ReturnType<typeof vi.fn>).mock.calls[1][1]

        expect(secondCreate).toMatchObject({ amount: 2_000, concept: 'Gimnasio', id })
        expect(api.updateEntry).toHaveBeenLastCalledWith(id, expect.objectContaining({ amount: 2_000, concept: 'Gimnasio' }))
        expect(store.getState().save.error).toBeNull()
    })

    // F-DATA-01: un reintento de un PATCH fallido no puede deshacer una edición posterior ya guardada.
    it('never lets a retried stale patch overwrite a newer saved edit', async () => {
        const server = { salary: 0 }
        let failNext = true
        const api = fakeApi({
            updateSheet: vi.fn(async (_yearMonth: string, input: { salary?: number }) => {
                if (failNext) {
                    failNext = false
                    throw new FinanceApiError(503, 'Servicio no disponible')
                }

                Object.assign(server, input)

                return { ...sampleSheet(), ...server }
            }) as unknown as FinanceApi['updateSheet'],
        })
        const store = createWorkbookStore(api)
        const salary = () => store.getState().workbook!.sheets[0].salary

        await store.actions.load()
        store.actions.updateSheet('2026-03', { salary: 1_000 })
        await vi.advanceTimersByTimeAsync(600)
        expect(store.getState().save.error).not.toBeNull()

        store.actions.updateSheet('2026-03', { salary: 2_000 })
        await vi.advanceTimersByTimeAsync(600)
        expect(server.salary).toBe(2_000)

        store.actions.retrySaves()
        await vi.runAllTimersAsync()

        expect(server.salary).toBe(2_000)
        expect(salary()).toBe(2_000)
        expect(store.getState().save.error).toBeNull()
        expect(store.actions.hasUnsavedChanges()).toBe(false)
    })

    // F-DATA-10: un trabajo fallido sigue siendo un cambio sin guardar hasta reintentarlo o descartarlo.
    it('keeps a failed save as an unsaved change and reports it when settling before leaving', async () => {
        let fail = true
        const api = fakeApi({
            updateSheet: vi.fn(async () => {
                if (fail) {
                    throw new FinanceApiError(0, 'Sin conexión')
                }

                return sampleSheet()
            }) as unknown as FinanceApi['updateSheet'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSheet('2026-03', { salary: 1_000 })
        await vi.advanceTimersByTimeAsync(600)

        expect(store.getState().save.pending).toBe(0)
        expect(store.actions.hasUnsavedChanges()).toBe(true)
        await expect(store.actions.settle(1_000)).resolves.toEqual({ saved: false })

        fail = false
        store.actions.retrySaves()
        await vi.runAllTimersAsync()

        expect(store.actions.hasUnsavedChanges()).toBe(false)
        await expect(store.actions.settle(1_000)).resolves.toEqual({ saved: true })
    })

    // F-DATA-07: el valor normalizado que devuelve la API es el canónico, salvo que el campo se haya
    // vuelto a editar mientras la respuesta viajaba.
    it('adopts the canonical value returned by the API without overwriting a newer edit', async () => {
        const responses: Array<(value: unknown) => void> = []
        const api = fakeApi({
            updateSettings: vi.fn(
                (input: { benefitsRate?: number }) =>
                    new Promise((resolve) => {
                        // El backend guarda prestaciones con 4 decimales (numeric(6, 4)).
                        responses.push(() => resolve({ ...settings, benefitsRate: Math.round((input.benefitsRate ?? 0) * 10_000) / 10_000 }))
                    }),
            ) as unknown as FinanceApi['updateSettings'],
        })
        const store = createWorkbookStore(api)
        const benefitsRate = () => store.getState().workbook!.settings.benefitsRate

        await store.actions.load()
        store.actions.updateSettings({ benefitsRate: 0.123456 })
        await vi.advanceTimersByTimeAsync(600)
        responses.shift()!(undefined)
        await vi.runAllTimersAsync()

        expect(benefitsRate()).toBe(0.1235)

        store.actions.updateSettings({ benefitsRate: 0.081234 })
        await vi.advanceTimersByTimeAsync(600)
        // Mientras la respuesta del primer envío viaja, se escribe otro valor.
        store.actions.updateSettings({ benefitsRate: 0.05 })
        responses.shift()!(undefined)
        await vi.advanceTimersByTimeAsync(0)

        expect(benefitsRate()).toBe(0.05)

        await vi.advanceTimersByTimeAsync(600)
        responses.shift()!(undefined)
        await vi.runAllTimersAsync()

        expect(benefitsRate()).toBe(0.05)
    })

    // F-DATA-11: un rechazo definitivo (cuota) no deja una fila fantasma en los totales; un fallo
    // ambiguo sí la conserva para reintentar con el mismo id.
    it('rolls back a definitively rejected row creation and keeps an ambiguous one for retry', async () => {
        const api = fakeApi({
            createEntry: vi.fn(async (_yearMonth: string, input: { concept: string }) => {
                if (input.concept === 'Sobre la cuota') {
                    throw new FinanceApiError(409, 'Un mes puede tener hasta 300 filas.', 'LIMIT_REACHED')
                }

                throw new FinanceApiError(0, 'Sin conexión')
            }) as unknown as FinanceApi['createEntry'],
        })
        const store = createWorkbookStore(api)
        const concepts = () => store.getState().workbook!.sheets[0].entries.map((entry) => entry.concept)

        await store.actions.load()

        const before = concepts()

        store.actions.addEntry('2026-03', { amount: 5_000, category: 'FIXED', concept: 'Sobre la cuota' })
        await vi.runAllTimersAsync()

        expect(concepts()).toEqual(before)
        expect(store.getState().save).toMatchObject({ error: 'Un mes puede tener hasta 300 filas.', failed: 0 })
        expect(store.actions.hasUnsavedChanges()).toBe(false)

        store.actions.addEntry('2026-03', { amount: 7_000, category: 'FIXED', concept: 'Sin respuesta' })
        await vi.runAllTimersAsync()

        expect(concepts()).toEqual([...before, 'Sin respuesta'])
        expect(store.getState().save.failed).toBe(1)
        expect(store.actions.hasUnsavedChanges()).toBe(true)
    })

    it('does not send an edit queued behind a creation that the server rejected', async () => {
        let releaseCreate: () => void = () => undefined
        const api = fakeApi({
            createEntry: vi.fn(
                () =>
                    new Promise((_resolve, reject) => {
                        releaseCreate = () => reject(new FinanceApiError(409, 'Un mes puede tener hasta 300 filas.', 'LIMIT_REACHED'))
                    }),
            ) as unknown as FinanceApi['createEntry'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()

        const id = store.actions.addEntry('2026-03', { amount: 5_000, category: 'FIXED', concept: 'Sobre la cuota' })!

        store.actions.updateEntry('2026-03', id, { amount: 6_000 })
        await vi.advanceTimersByTimeAsync(600)
        releaseCreate()
        await vi.runAllTimersAsync()

        expect(api.updateEntry).not.toHaveBeenCalled()
        expect(store.getState().save).toMatchObject({ error: 'Un mes puede tener hasta 300 filas.', failed: 0 })

        store.actions.dismissSaveError()
        expect(store.getState().save.error).toBeNull()
    })

    // F-DATA-02: el servidor creó la deuda pero la respuesta se perdió. Reintentar la misma creación
    // conserva su identidad; si el formulario cambió entretanto, la misma deuda adopta el contenido nuevo.
    function debtServer() {
        const debts = new Map<string, Record<string, unknown>>()
        let loseNextResponse = true
        const api = fakeApi({
            createDebt: vi.fn(async (input: Record<string, unknown> & { id: string }) => {
                const existing = debts.get(input.id)

                if (existing) {
                    const same = Object.entries(input).every(([key, value]) => existing[key] === value)

                    if (!same) {
                        throw new FinanceApiError(409, 'Ese identificador ya se usó para otro registro.', 'IDEMPOTENCY_CONFLICT')
                    }

                    return { ...debt({ id: input.id, name: String(existing.name) }), ...existing }
                }

                debts.set(input.id, { ...input })

                if (loseNextResponse) {
                    loseNextResponse = false
                    throw new FinanceApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión.')
                }

                return { ...debt({ id: input.id, name: String(input.name) }), ...input }
            }) as unknown as FinanceApi['createDebt'],
            updateDebt: vi.fn(async (id: string, input: Record<string, unknown>) => {
                const stored = { ...debts.get(id)!, ...input }

                debts.set(id, stored)

                return { ...debt({ id, name: String(stored.name) }), ...stored }
            }) as unknown as FinanceApi['updateDebt'],
        })

        return { api, debts }
    }

    it('reuses the identity of a debt creation whose response was lost instead of duplicating it', async () => {
        const { api, debts } = debtServer()
        const store = createWorkbookStore(api)
        const draft = { minimumPayment: 20_000, name: 'Deuda respuesta perdida', totalBalance: 100_000 }

        await store.actions.load()
        await expect(store.actions.createDebt(draft, 'debt-op-1')).rejects.toThrow('No pudimos conectar')
        await store.actions.createDebt(draft, 'debt-op-1')

        expect([...debts.values()].filter((item) => item.name === 'Deuda respuesta perdida')).toHaveLength(1)
        expect(store.getState().workbook!.debts.filter((item) => item.name === 'Deuda respuesta perdida')).toHaveLength(1)
    })

    it('updates the same debt when the form changed after a lost creation response', async () => {
        const { api, debts } = debtServer()
        const store = createWorkbookStore(api)

        await store.actions.load()
        await expect(
            store.actions.createDebt({ name: 'Moto', totalBalance: 100_000 }, 'debt-op-2'),
        ).rejects.toThrow('No pudimos conectar')

        const saved = await store.actions.createDebt({ name: 'Moto', totalBalance: 120_000 }, 'debt-op-2')

        expect(debts.size).toBe(1)
        expect(debts.get(saved.id)).toMatchObject({ name: 'Moto', totalBalance: 120_000 })
        expect(store.getState().workbook!.debts.filter((item) => item.name === 'Moto')).toEqual([
            expect.objectContaining({ id: saved.id, totalBalance: 120_000 }),
        ])
    })

    it('retries a lost account creation with the same id instead of reporting a false name conflict', async () => {
        const created = new Map<string, string>()
        let loseNextResponse = true
        const api = fakeApi({
            createAccount: vi.fn(async (input: { id: string; name: string }) => {
                const replay = created.get(input.id)

                if (replay === undefined && [...created.values()].some((name) => name.toLowerCase() === input.name.toLowerCase())) {
                    throw new FinanceApiError(409, 'Ya tienes una cuenta con ese nombre.', 'ACCOUNT_NAME_TAKEN')
                }

                created.set(input.id, input.name)

                if (loseNextResponse) {
                    loseNextResponse = false
                    throw new FinanceApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión.')
                }

                return { archived: false, id: input.id, name: input.name, sortOrder: 9 }
            }) as unknown as FinanceApi['createAccount'],
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        await expect(store.actions.createAccount('Nequi')).rejects.toThrow('No pudimos conectar')

        const account = await store.actions.createAccount('Nequi')

        expect(created.size).toBe(1)
        expect(store.getState().workbook!.accounts).toContainEqual(expect.objectContaining({ id: account.id, name: 'Nequi' }))
    })

    // F-DATA-03: la copia del mes anterior espera a los guardados en vuelo del mes y conserva lo que
    // se edita mientras la copia viaja. El servidor respeta un salario destino distinto de cero.
    function copyServer() {
        const server = { ...sampleSheet(), salary: 800 }
        const held: Array<() => void> = []
        let holdNext: 'arrival' | 'release' | null = null
        // 'release': la petición no llega al servidor hasta soltarla. 'arrival': el servidor la
        // procesa al llegar y solo se retrasa la respuesta.
        const hold = <T,>(work: () => T) => {
            const mode = holdNext

            holdNext = null

            if (!mode) {
                return Promise.resolve(work())
            }

            const early = mode === 'arrival' ? { value: work() } : null

            return new Promise<T>((resolve) => held.push(() => resolve(early ? early.value : work())))
        }
        const api = fakeApi({
            copyPreviousSheet: vi.fn(() =>
                hold(() => {
                    const copied = { ...server.entries[0], concept: 'Copiado', id: 'copied-row', isPaid: false }

                    server.entries = [...server.entries, copied]

                    return { ...server, entries: [...server.entries] }
                }),
            ) as unknown as FinanceApi['copyPreviousSheet'],
            getWorkbook: vi.fn(async () => ({ ...workbook(), sheets: [{ ...server, entries: [...server.entries] }] })),
            updateSheet: vi.fn((_yearMonth: string, input: { salary?: number }) =>
                hold(() => {
                    Object.assign(server, input)

                    return { ...server }
                }),
            ) as unknown as FinanceApi['updateSheet'],
        })

        return { api, held, holdNextRequest: (mode: 'arrival' | 'release') => (holdNext = mode), server }
    }

    it('waits for an in-flight salary save before copying the previous month', async () => {
        const { api, held, holdNextRequest, server } = copyServer()
        const store = createWorkbookStore(api)
        const sheet = () => store.getState().workbook!.sheets[0]

        await store.actions.load()
        store.actions.updateSheet('2026-03', { salary: 401 })
        holdNextRequest('release')
        await vi.advanceTimersByTimeAsync(600)

        // Si la copia saliera ya, el servidor la ejecutaría antes del PATCH y su respuesta llegaría
        // después de la del PATCH.
        holdNextRequest('arrival')

        const copy = store.actions.copyPreviousSheet('2026-03')

        await vi.advanceTimersByTimeAsync(0)
        held.shift()!()
        await vi.advanceTimersByTimeAsync(0)
        held.shift()?.()
        await copy
        await vi.runAllTimersAsync()

        expect(server.salary).toBe(401)
        expect(sheet().salary).toBe(server.salary)
        expect(sheet().entries.map((entry) => entry.id)).toContain('copied-row')
    })

    it('keeps edits made while the copy is in flight and saves them afterwards', async () => {
        const { api, held, holdNextRequest, server } = copyServer()
        const store = createWorkbookStore(api)
        const sheet = () => store.getState().workbook!.sheets[0]

        await store.actions.load()
        holdNextRequest('arrival')

        const copy = store.actions.copyPreviousSheet('2026-03')

        await vi.advanceTimersByTimeAsync(0)
        store.actions.updateSheet('2026-03', { salary: 900 })
        held.shift()!()
        await copy

        expect(sheet().salary).toBe(900)
        expect(sheet().entries.map((entry) => entry.id)).toContain('copied-row')

        await vi.runAllTimersAsync()

        expect(server.salary).toBe(900)
        expect(sheet().salary).toBe(900)
    })

    it('refuses to copy over a month whose last save failed until it is retried or discarded', async () => {
        const { api } = copyServer()
        let fail = true

        api.updateSheet = vi.fn(async () => {
            if (fail) {
                throw new FinanceApiError(503, 'Servicio no disponible')
            }

            return sampleSheet()
        }) as unknown as FinanceApi['updateSheet']

        const store = createWorkbookStore(api)

        await store.actions.load()
        store.actions.updateSheet('2026-03', { salary: 401 })
        await vi.advanceTimersByTimeAsync(600)

        await expect(store.actions.copyPreviousSheet('2026-03')).rejects.toThrow('Hay cambios sin guardar')
        expect(api.copyPreviousSheet).not.toHaveBeenCalled()

        fail = false
        store.actions.retrySaves()
        await vi.runAllTimersAsync()
        await store.actions.copyPreviousSheet('2026-03')

        expect(api.copyPreviousSheet).toHaveBeenCalledTimes(1)
    })
})
