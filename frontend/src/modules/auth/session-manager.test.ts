import { describe, expect, it, vi } from 'vitest'

import { AuthApiError } from './auth.api'
import type { AuthenticatedResponse } from './auth.types'
import { createSessionManager, SessionUnavailableError, type SessionChannel } from './session-manager'

const USER = {
    createdAt: '2026-10-01T00:00:00.000Z',
    email: 'persona@fintrack.test',
    firstName: 'Persona',
    id: 'user-1',
    lastLoginAt: null,
    lastName: null,
    preferredCurrencyCode: 'COP',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    timezone: 'UTC',
    updatedAt: '2026-10-01T00:00:00.000Z',
}

function response(token: string, expiresInSeconds = 900): AuthenticatedResponse {
    return { accessToken: token, accessTokenExpiresInSeconds: expiresInSeconds, user: USER }
}

function apiError(status: number, code?: string, details?: Record<string, unknown>) {
    return new AuthApiError(status, { code, details, message: 'error', success: false })
}

function memoryHint(initial = true) {
    let value = initial

    return { get: () => value, set: (next: boolean) => (value = next) }
}

// Canal en memoria que reparte mensajes entre gestores, como BroadcastChannel entre pestañas.
function sharedChannel() {
    const handlers = new Set<(message: unknown) => void>()

    return (): SessionChannel => {
        let own: ((message: unknown) => void) | null = null

        return {
            post: (message) => handlers.forEach((handler) => handler !== own && handler(message)),
            subscribe: (handler) => {
                own = handler
                handlers.add(handler)
            },
        }
    }
}

// Lock exclusivo compartido, como navigator.locks entre pestañas del mismo origen.
function sharedLock() {
    let tail = Promise.resolve()

    return <T,>(work: () => Promise<T>) => {
        const run = tail.then(work, work)

        tail = run.then(
            () => undefined,
            () => undefined,
        )

        return run
    }
}

function manager(overrides: Partial<Parameters<typeof createSessionManager>[0]> = {}) {
    return createSessionManager({
        hint: memoryHint(),
        now: () => Date.now(),
        refresh: vi.fn(async () => response('fresh')),
        sleep: async () => undefined,
        ...overrides,
    })
}

describe('createSessionManager', () => {
    it('shares one refresh between concurrent callers in the same tab', async () => {
        const refresh = vi.fn(async () => response('nuevo'))
        const session = manager({ refresh })
        const tokens = await Promise.all([session.ensureAccessToken(), session.ensureAccessToken(), session.ensureAccessToken()])

        expect(tokens).toEqual(['nuevo', 'nuevo', 'nuevo'])
        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('reuses a fresh token and renews one that is about to expire', async () => {
        let now = 0
        const refresh = vi.fn(async () => response(`token-${refresh.mock.calls.length}`, 900))
        const session = manager({ now: () => now, refresh })

        session.setSession(response('inicial', 900))
        expect(await session.ensureAccessToken()).toBe('inicial')

        now = 890_000
        expect(await session.ensureAccessToken()).toBe('token-1')
        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('signs out on 401 and clears the session hint', async () => {
        const hint = memoryHint(true)
        const session = manager({ hint, refresh: vi.fn(async () => Promise.reject(apiError(401, 'SESSION_EXPIRED'))) })

        expect(await session.ensureAccessToken()).toBeNull()
        expect(session.getSnapshot().status).toBe('unauthenticated')
        expect(hint.get()).toBe(false)
    })

    it('retries when another tab rotated the cookie first (409) and keeps the session', async () => {
        const refresh = vi
            .fn<() => Promise<AuthenticatedResponse>>()
            .mockRejectedValueOnce(apiError(409, 'REFRESH_TOKEN_ROTATED'))
            .mockResolvedValueOnce(response('tras-reintento'))
        const session = manager({ refresh })

        expect(await session.ensureAccessToken()).toBe('tras-reintento')
        expect(refresh).toHaveBeenCalledTimes(2)
        expect(session.getSnapshot().status).toBe('authenticated')
    })

    it('respects Retry-After on 429 without signing out or looping', async () => {
        const hint = memoryHint(true)
        const refresh = vi.fn(async () => Promise.reject(apiError(429, 'AUTH_RATE_LIMITED', { retryAfterSeconds: 42 })))
        const session = manager({ hint, refresh })

        await expect(session.ensureAccessToken()).rejects.toMatchObject({ retryAfterSeconds: 42 })
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(session.getSnapshot().status).toBe('unavailable')
        expect(hint.get()).toBe(true)
    })

    it('keeps the session through temporary failures and gives up after a bounded number of attempts', async () => {
        const hint = memoryHint(true)
        const refresh = vi.fn(async () => Promise.reject(new TypeError('fetch failed')))
        const session = manager({ hint, refresh })

        await expect(session.ensureAccessToken()).rejects.toBeInstanceOf(SessionUnavailableError)
        expect(refresh).toHaveBeenCalledTimes(3)
        expect(hint.get()).toBe(true)
    })

    it('treats 503 as temporary, not as a signed-out session', async () => {
        const refresh = vi
            .fn<() => Promise<AuthenticatedResponse>>()
            .mockRejectedValueOnce(apiError(503, 'DB_UNAVAILABLE'))
            .mockResolvedValueOnce(response('recuperado'))

        expect(await manager({ refresh }).ensureAccessToken()).toBe('recuperado')
    })

    it('reports unauthenticated without a network call when no session hint exists', async () => {
        const refresh = vi.fn(async () => response('no-deberia'))
        const session = manager({ hint: memoryHint(false), refresh })

        expect(await session.resolve()).toBeNull()
        expect(refresh).not.toHaveBeenCalled()
        expect(session.getSnapshot().status).toBe('unauthenticated')
    })

    it('lets a second tab reuse the session the first tab just renewed instead of refreshing again', async () => {
        const channel = sharedChannel()
        const lock = sharedLock()
        const refreshA = vi.fn(async () => response('de-pestaña-a'))
        const refreshB = vi.fn(async () => response('de-pestaña-b'))
        const tabA = manager({ channel: channel(), refresh: refreshA, withLock: lock })
        const tabB = manager({ channel: channel(), refresh: refreshB, withLock: lock })
        const [tokenA, tokenB] = await Promise.all([tabA.ensureAccessToken(), tabB.ensureAccessToken()])

        expect(tokenA).toBe('de-pestaña-a')
        expect(tokenB).toBe('de-pestaña-a')
        expect(refreshB).not.toHaveBeenCalled()
    })

    it('signs out every tab when one logs out', async () => {
        const channel = sharedChannel()
        const tabA = manager({ channel: channel() })
        const tabB = manager({ channel: channel() })

        tabA.setSession(response('a'))
        tabB.setSession(response('b'))
        tabA.clear()

        expect(tabB.getSnapshot().status).toBe('unauthenticated')
        expect(tabB.getSnapshot().session).toBeNull()
    })

    it('never persists the access token in the hint', async () => {
        const writes: unknown[] = []
        const session = manager({ hint: { get: () => true, set: (value) => writes.push(value) } })

        session.setSession(response('secreto'))

        expect(JSON.stringify(writes)).not.toContain('secreto')
    })
})
