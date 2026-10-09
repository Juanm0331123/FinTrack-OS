import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSessionManager } from '@/modules/auth/session-manager'
import type { AuthenticatedResponse } from '@/modules/auth/auth.types'
import { accounts, sampleSheet, settings } from '../domain/test-fixtures'
import { createWorkbookStore } from '../store/workbook-store'
import { createFinanceApi } from './finance-api'

function user(id: string) {
    return {
        createdAt: '2026-10-01T00:00:00.000Z',
        email: `${id}@fintrack.test`,
        firstName: id,
        id,
        lastLoginAt: null,
        lastName: null,
        preferredCurrencyCode: 'COP',
        role: 'USER' as const,
        status: 'ACTIVE' as const,
        timezone: 'UTC',
        updatedAt: '2026-10-01T00:00:00.000Z',
    }
}

function login(id: string): AuthenticatedResponse {
    return { accessToken: `token-${id}`, accessTokenExpiresInSeconds: 900, user: user(id) }
}

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status })
}

type Call = { body: unknown; identity: string; path: string }

// Servidor sintético: registra con qué identidad llegó cada petición.
function fakeServer(handler: (call: Call) => Response | Promise<Response> = () => json(200, { data: {}, success: true })) {
    const calls: Call[] = []
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const authorization = new Headers(init?.headers).get('Authorization') ?? ''
        const call = {
            body: init?.body ? JSON.parse(String(init.body)) : undefined,
            identity: authorization.replace('Bearer token-', ''),
            path: new URL(String(url)).pathname,
        }

        calls.push(call)

        return handler(call)
    })

    return { calls, fetch: fetch as unknown as typeof globalThis.fetch }
}

function sessionFor(id: string, refreshAs = id) {
    const session = createSessionManager({
        hint: { get: () => true, set: () => undefined },
        now: () => Date.now(),
        refresh: async () => login(refreshAs),
        sleep: async () => undefined,
    })

    session.setSession(login(id))

    return session
}

describe('finance requests stay bound to the account that started them (RCLIENT-03)', () => {
    it('does not resend an operation started as A with B’s identity after a 401', async () => {
        const session = sessionFor('A', 'B')
        const server = fakeServer(() => {
            // Mientras la petición de A viaja, otra pestaña inicia sesión como B.
            session.setSession(login('B'))

            return json(401, { code: 'SESSION_EXPIRED', message: 'expirada', success: false })
        })
        const api = createFinanceApi({ fetch: server.fetch, session, userId: 'A' })

        await expect(api.updateSettings({ cushionAmount: 345_678 })).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
        expect(server.calls.map((call) => call.identity)).toEqual(['A'])
    })

    it('refuses to send anything once the session belongs to another account', async () => {
        const session = sessionFor('B')
        const server = fakeServer()
        const api = createFinanceApi({ fetch: server.fetch, session, userId: 'A' })

        await expect(api.updateSettings({ cushionAmount: 1 })).rejects.toMatchObject({ code: 'SESSION_CHANGED', status: 401 })
        expect(server.calls).toEqual([])
    })

    it('still retries a 401 once for the same account', async () => {
        const session = sessionFor('A')
        let attempts = 0
        const server = fakeServer(() =>
            attempts++ === 0
                ? json(401, { code: 'SESSION_EXPIRED', message: 'expirada', success: false })
                : json(200, { data: settings, success: true }),
        )
        const api = createFinanceApi({ fetch: server.fetch, session, userId: 'A' })

        await expect(api.updateSettings({ cushionAmount: 2 })).resolves.toEqual(settings)
        expect(server.calls.map((call) => call.identity)).toEqual(['A', 'A'])
    })

    it('aborts requests in flight when the owner stops using the API', async () => {
        const session = sessionFor('A')
        const fetch = vi.fn(
            (_url: string | URL | Request, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
                }),
        )
        const api = createFinanceApi({ fetch: fetch as unknown as typeof globalThis.fetch, session, userId: 'A' })
        const pending = api.updateSettings({ cushionAmount: 3 })

        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        api.abortPending()

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    })
})

describe('the workbook never carries one account’s data or pending saves into another (RCLIENT-02)', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    function workbookServer() {
        return fakeServer((call) =>
            call.path.endsWith('/workbook')
                ? json(200, { data: { accounts, debts: [], settings, sheets: [sampleSheet()] }, success: true })
                : json(200, { data: settings, success: true }),
        )
    }

    it('does not send A’s pending change authenticated as B after the account switches', async () => {
        const session = sessionFor('A')
        const server = workbookServer()
        const store = createWorkbookStore(createFinanceApi({ fetch: server.fetch, session, userId: 'A' }))

        store.start()
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'))

        store.actions.updateSettings({ cushionAmount: 123_456 })
        session.setSession(login('B'))
        await vi.advanceTimersByTimeAsync(5_000)

        expect(server.calls.filter((call) => call.identity === 'B')).toEqual([])
        expect(server.calls.some((call) => JSON.stringify(call.body ?? '').includes('123456'))).toBe(false)
    })

    it('drops pending timers and failed saves when the store stops', async () => {
        const session = sessionFor('A')
        const server = workbookServer()
        const store = createWorkbookStore(createFinanceApi({ fetch: server.fetch, session, userId: 'A' }))

        store.start()
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'))

        store.actions.updateSettings({ cushionAmount: 234_567 })
        store.stop()
        session.clear()
        session.setSession(login('B'))
        await vi.advanceTimersByTimeAsync(5_000)
        store.actions.retrySaves()
        await vi.advanceTimersByTimeAsync(5_000)

        expect(server.calls.map((call) => call.path)).toEqual(['/api/finance/workbook'])
        expect(store.actions.hasUnsavedChanges()).toBe(false)
    })

    it('ignores a workbook load that finishes after the store stopped', async () => {
        const session = sessionFor('A')
        let deliver: (response: Response) => void = () => undefined
        const fetch = vi.fn(() => new Promise<Response>((resolve) => (deliver = resolve)))
        const store = createWorkbookStore(createFinanceApi({ fetch: fetch as unknown as typeof globalThis.fetch, session, userId: 'A' }))

        store.start()
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        store.stop()
        deliver(json(200, { data: { accounts, debts: [], settings, sheets: [] }, success: true }))
        await vi.advanceTimersByTimeAsync(0)

        expect(store.getState().workbook).toBeNull()
    })

    it('loads again when the same store restarts (remount in development)', async () => {
        const session = sessionFor('A')
        const server = workbookServer()
        const store = createWorkbookStore(createFinanceApi({ fetch: server.fetch, session, userId: 'A' }))

        store.start()
        store.stop()
        store.start()
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'))

        expect(store.getState().workbook?.accounts).toEqual(accounts)
    })

    it('saves pending changes as their owner before signing out', async () => {
        const session = sessionFor('A')
        const server = workbookServer()
        const store = createWorkbookStore(createFinanceApi({ fetch: server.fetch, session, userId: 'A' }))

        store.start()
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'))

        store.actions.updateSettings({ cushionAmount: 99 })
        await store.actions.settle(1_000)

        expect(server.calls.at(-1)).toMatchObject({ body: { cushionAmount: 99 }, identity: 'A', path: '/api/finance/settings' })
    })
})
