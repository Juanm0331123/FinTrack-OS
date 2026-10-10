import { describe, expect, it, vi } from 'vitest'

import { AuthApiError } from './auth.api'
import type { AuthenticatedResponse } from './auth.types'
import { createSessionManager, SessionChangedError, SessionUnavailableError, type SessionChannel } from './session-manager'

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

function response(token: string, expiresInSeconds = 900, user = USER): AuthenticatedResponse {
    return { accessToken: token, accessTokenExpiresInSeconds: expiresInSeconds, user }
}

function userB() {
    return { ...USER, email: 'otra@fintrack.test', firstName: 'Otra', id: 'user-2' }
}

// Renovación controlada por la prueba: queda en vuelo hasta que se resuelve a mano.
function deferredRefresh() {
    const calls: Array<{ resolve: (value: AuthenticatedResponse) => void; signal?: AbortSignal }> = []
    const refresh = vi.fn(
        (signal?: AbortSignal) =>
            new Promise<AuthenticatedResponse>((resolve) => {
                calls.push({ resolve, signal })
            }),
    )

    return { calls, refresh }
}

async function settle() {
    for (let index = 0; index < 5; index += 1) {
        await Promise.resolve()
    }
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

    describe('late refreshes never resurrect or replace a session (RCLIENT-01)', () => {
        it('does not restore a session that was closed while the refresh was in flight', async () => {
            const hint = memoryHint(true)
            const posted: unknown[] = []
            const { calls, refresh } = deferredRefresh()
            const session = manager({ channel: { post: (message) => posted.push(message), subscribe: () => undefined }, hint, refresh })
            const pending = session.ensureAccessToken()

            await settle()
            session.clear()
            calls[0].resolve(response('tardío'))

            expect(await pending).toBeNull()
            expect(session.getSnapshot()).toMatchObject({ session: null, status: 'unauthenticated' })
            expect(hint.get()).toBe(false)
            expect(posted).toEqual([{ type: 'signed-out' }])
        })

        it('cancels the in-flight refresh request when the session is closed', async () => {
            const { calls, refresh } = deferredRefresh()
            const session = manager({ refresh })

            void session.ensureAccessToken()
            await settle()
            session.clear()

            expect(calls[0].signal?.aborted).toBe(true)
        })

        it('keeps account B when a refresh started for account A finishes after B signed in', async () => {
            const { calls, refresh } = deferredRefresh()
            const session = manager({ refresh })
            const pending = session.ensureAccessToken()

            await settle()
            session.setSession(response('token-b', 900, userB()))
            calls[0].resolve(response('token-a-tardío'))
            await pending

            expect(session.getSnapshot().session?.user.id).toBe('user-2')
            expect(session.getSnapshot().session?.accessToken).toBe('token-b')
        })

        it('ignores a late refresh after another tab signed out', async () => {
            const channel = sharedChannel()
            const { calls, refresh } = deferredRefresh()
            const tabA = manager({ channel: channel() })
            const tabB = manager({ channel: channel(), refresh })
            const pending = tabB.ensureAccessToken()

            await settle()
            tabA.clear()
            calls[0].resolve(response('tardío'))

            expect(await pending).toBeNull()
            expect(tabB.getSnapshot().status).toBe('unauthenticated')
        })

        it('does not sign out account B because a stale refresh for account A was rejected', async () => {
            let rejectStale: (error: unknown) => void = () => undefined
            const refresh = vi.fn(
                () =>
                    new Promise<AuthenticatedResponse>((_resolve, reject) => {
                        rejectStale = reject
                    }),
            )
            const session = manager({ refresh })
            const pending = session.ensureAccessToken()

            await settle()
            session.setSession(response('token-b', 900, userB()))
            rejectStale(apiError(401, 'SESSION_EXPIRED'))
            await pending

            expect(session.getSnapshot()).toMatchObject({ status: 'authenticated' })
            expect(session.getSnapshot().session?.user.id).toBe('user-2')
        })

        it('starts a new refresh after a sign-out instead of joining the stale one', async () => {
            const { calls, refresh } = deferredRefresh()
            const session = manager({ refresh })

            void session.ensureAccessToken()
            await settle()
            session.clear()
            session.setSession(response('expirado', 0, userB()))

            const next = session.ensureAccessToken()

            await settle()
            expect(refresh).toHaveBeenCalledTimes(2)
            calls[1].resolve(response('nuevo-b', 900, userB()))
            expect(await next).toBe('nuevo-b')
        })

        it('refuses a token that belongs to a different user than the caller expects', async () => {
            const session = manager()

            session.setSession(response('token-b', 900, userB()))

            await expect(session.ensureAccessToken({ userId: 'user-1' })).rejects.toBeInstanceOf(SessionChangedError)
            expect(await session.ensureAccessToken({ userId: 'user-2' })).toBe('token-b')
        })

        it('signs out instead of silently switching accounts when the refresh cookie belongs to someone else', async () => {
            let now = 0
            const refresh = vi.fn(async () => response('de-otra-cuenta', 900, userB()))
            const session = manager({ now: () => now, refresh })

            session.setSession(response('token-a', 60))
            now = 59_000

            expect(await session.ensureAccessToken()).toBeNull()
            expect(session.getSnapshot().status).toBe('unauthenticated')
        })
    })

    it('keeps checking the identity after a temporary refresh failure (RCLIENT-R2-02)', async () => {
        let now = 0
        const refresh = vi
            .fn<() => Promise<AuthenticatedResponse>>()
            .mockRejectedValueOnce(apiError(429, 'AUTH_RATE_LIMITED', { retryAfterSeconds: 5 }))
            .mockResolvedValueOnce(response('de-otra-cuenta', 900, userB()))
        const session = manager({ now: () => now, refresh })

        session.setSession(response('token-a', 60))
        now = 59_000

        await expect(session.ensureAccessToken()).rejects.toBeInstanceOf(SessionUnavailableError)
        expect(session.getSnapshot()).toMatchObject({ status: 'unavailable' })

        expect(await session.ensureAccessToken()).toBeNull()
        expect(session.getSnapshot()).toMatchObject({ session: null, status: 'unauthenticated' })
    })
})
