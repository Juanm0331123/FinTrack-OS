import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FinanceApiError, type FinanceApi } from '../api/finance-api'
import { accounts, debt, sampleSheet, settings } from '../domain/test-fixtures'
import type { Workbook } from '../domain/types'
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

        store.actions.updateSpend('2026-03', mercado.id, spendId, { amount: 85_000 })
        expect(spendsOf()[0]).toMatchObject({ amount: 85_000, id: spendId })

        store.actions.deleteSpend('2026-03', mercado.id, spendId)
        expect(spendsOf()).toHaveLength(0)

        await vi.runAllTimersAsync()

        expect(api.updateSpend).toHaveBeenCalledWith(spendId, { amount: 85_000 })
        expect(api.deleteSpend).toHaveBeenCalledWith(spendId)
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
})
