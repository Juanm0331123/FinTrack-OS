import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createFinanceApi } from './api/finance-api'
import { computeSummaryRows } from './domain/annual-summary'
import { buildCalendarWeeks } from './domain/calendar'
import { computeDebtPlan } from './domain/debt-plan'
import { sortSpends } from './domain/pockets'
import { accounts, debt, sampleSheet, settings } from './domain/test-fixtures'
import { createWorkbookStore } from './store/workbook-store'

// F-ENG-03 / F-ENG-04: Next 16 compila para Chrome/Edge/Firefox 111 y Safari 16.4 sin polyfills de
// toSorted/toReversed/toSpliced/with (Firefox 115) ni AbortSignal.any (Chrome 116, Firefox 124,
// Safari 17.4). Se ejecuta el código real con esas APIs ausentes, como en esos navegadores.
const ARRAY_METHODS = ['toSorted', 'toReversed', 'toSpliced', 'with'] as const

describe('code paths on the minimum supported browsers', () => {
    const saved = new Map<string, PropertyDescriptor | undefined>()
    const savedAny = Object.getOwnPropertyDescriptor(AbortSignal, 'any')

    beforeAll(() => {
        for (const method of ARRAY_METHODS) {
            saved.set(method, Object.getOwnPropertyDescriptor(Array.prototype, method))
            delete (Array.prototype as unknown as Record<string, unknown>)[method]
        }

        delete (AbortSignal as unknown as Record<string, unknown>).any
    })

    afterAll(() => {
        for (const [method, descriptor] of saved) {
            if (descriptor) {
                Object.defineProperty(Array.prototype, method, descriptor)
            }
        }

        if (savedAny) {
            Object.defineProperty(AbortSignal, 'any', savedAny)
        }
    })

    it('computes summaries, plans, calendars and spends without the newer Array methods', () => {
        const sheet = sampleSheet()

        expect(computeSummaryRows([sheet], settings, accounts).map((row) => row.yearMonth)).toEqual(['2026-03'])
        expect(
            computeDebtPlan({
                available: 0,
                cushion: 0,
                debts: [debt({ id: 'b', name: 'B', sortOrder: 1 }), debt({ id: 'a', name: 'A', sortOrder: 0 })],
                entries: [],
                redirectOverpayments: false,
            }).rows.map((row) => row.debt.id),
        ).toEqual(['a', 'b'])
        expect(buildCalendarWeeks('2026-03', sheet.entries, '2026-03-10').length).toBeGreaterThan(0)
        expect(
            sortSpends([
                { amount: 1, id: '2', note: null, spentOn: '2026-03-09' },
                { amount: 1, id: '1', note: null, spentOn: '2026-03-02' },
            ]).map((spend) => spend.id),
        ).toEqual(['1', '2'])
    })

    it('loads, reorders accounts and sends requests through the API client', async () => {
        const requests: string[] = []
        const api = createFinanceApi({
            fetch: async (url) => {
                requests.push(String(url))

                // Objeto mínimo con la interfaz que usa el cliente: el Response de Node (undici) usa
                // internamente los métodos que esta prueba retira, y no es código del navegador.
                const body = { data: { accounts, debts: [], settings, sheets: [sampleSheet()] }, success: true }

                return { json: async () => body, ok: true, status: 200 } as unknown as Response
            },
            session: { ensureAccessToken: async () => 'token' },
            userId: 'user-a',
        })
        const store = createWorkbookStore(api)

        await store.actions.load()
        expect(store.getState().error).toBeNull()
        expect(store.getState().status).toBe('ready')

        const [first, second] = store.getState().workbook!.accounts

        store.actions.moveAccount(second.id, -1)

        expect(
            store
                .getState()
                .workbook!.accounts.filter((account) => [first.id, second.id].includes(account.id))
                .map((account) => [account.id, account.sortOrder]),
        ).toEqual([
            [first.id, 1],
            [second.id, 0],
        ])
        expect(requests).toHaveLength(1)
        store.stop()
    })
})

// Guarda estática para las rutas que la prueba anterior no ejecuta. abort-signals.ts usa
// AbortSignal.any solo tras comprobar que existe.
describe('source compatibility with the supported browser targets', () => {
    it('does not call APIs missing from Chrome/Edge/Firefox 111 and Safari 16.4', () => {
        const root = fileURLToPath(new URL('../../', import.meta.url))
        const files = (readdirSync(root, { recursive: true }) as string[]).filter(
            (file) => /\.(ts|tsx)$/.test(file) && !/\.test\.ts$/.test(file) && !/abort-signals\.ts$/.test(file),
        )
        const offenders = files.filter((file) => /\.(toSorted|toReversed|toSpliced)\(|AbortSignal\.any\(/.test(readFileSync(join(root, file), 'utf8')))

        expect(offenders).toEqual([])
    })
})
