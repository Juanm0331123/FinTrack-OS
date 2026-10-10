import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedResponse } from '@/modules/auth/auth.types'
import { createSessionManager, SessionChangedError, type SessionChannel } from '@/modules/auth/session-manager'
import { createAccountSecurity } from './account-security'

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

function login(id: string, expiresInSeconds = 900): AuthenticatedResponse {
    return { accessToken: `token-${id}`, accessTokenExpiresInSeconds: expiresInSeconds, user: user(id) }
}

// Dos pestañas: la de A con su access token vencido y una renovación retenida; la otra entra
// como B y difunde su sesión. Ninguna operación de A puede salir con el token de B.
function twoTabs() {
    const handlers = new Set<(message: unknown) => void>()
    const channel = (): SessionChannel => {
        let own: ((message: unknown) => void) | null = null

        return {
            post: (message) => handlers.forEach((handler) => handler !== own && handler(message)),
            subscribe: (handler) => {
                own = handler
                handlers.add(handler)
            },
        }
    }
    const pendingRefresh: Array<(value: AuthenticatedResponse) => void> = []
    let retained = false
    const base = { hint: { get: () => true, set: () => undefined }, now: () => Date.now(), sleep: async () => undefined }
    const tabA = createSessionManager({
        ...base,
        channel: channel(),
        // La primera renovación (cookie de A) queda retenida; las siguientes ya ven la cookie de B.
        refresh: () =>
            pendingRefresh.length === 0 && retained
                ? Promise.resolve(login('user-b'))
                : new Promise<AuthenticatedResponse>((resolve) => {
                      retained = true
                      pendingRefresh.push(resolve)
                  }),
    })
    const tabB = createSessionManager({ ...base, channel: channel(), refresh: async () => login('user-b') })

    tabA.setSession(login('user-a', 1))

    return { pendingRefresh, tabA, tabB }
}

async function settle() {
    for (let index = 0; index < 10; index += 1) {
        await Promise.resolve()
    }
}

describe('account security operations bound to the identity that started them', () => {
    const operations = {
        changePassword: (security: ReturnType<typeof createAccountSecurity>) =>
            security.changePassword({ currentPassword: 'Clave-de-A-2026', newPassword: 'Nueva-clave-2026' }),
        confirmEmailChange: (security: ReturnType<typeof createAccountSecurity>) => security.confirmEmailChange({ code: '123456' }),
        requestEmailChange: (security: ReturnType<typeof createAccountSecurity>) =>
            security.requestEmailChange({ currentPassword: 'Clave-de-A-2026', newEmail: 'nuevo@fintrack.test' }),
    }

    for (const [name, run] of Object.entries(operations)) {
        it(`never sends ${name} started by A with B's token`, async () => {
            const { pendingRefresh, tabA, tabB } = twoTabs()
            const api = {
                changePassword: vi.fn(async () => ({ otherSessionsClosed: true as const, passwordChanged: true as const })),
                confirmEmailChange: vi.fn(async () => ({ otherSessionsClosed: true as const, user: user('user-a') })),
                requestEmailChange: vi.fn(async () => ({ email: 'nuevo@fintrack.test', expiresAt: new Date().toISOString() })),
            }
            const security = createAccountSecurity({ api, session: tabA, userId: 'user-a' })
            const outcome = run(security).then(
                () => 'sent',
                (error: unknown) => error,
            )

            await settle()
            tabB.setSession(login('user-b'))
            pendingRefresh.shift()!(login('user-a'))

            const result = await outcome
            const tokens = Object.values(api).flatMap((spy) => (spy.mock.calls as unknown[][]).map((call) => call[0]))

            expect(tokens).not.toContain('token-user-b')
            expect(result).toBeInstanceOf(SessionChangedError)
        })
    }

    it('sends the operation with the token of the account that started it', async () => {
        const session = createSessionManager({ hint: { get: () => true, set: () => undefined }, now: () => Date.now(), refresh: async () => login('user-a'), sleep: async () => undefined })
        const api = {
            changePassword: vi.fn(async () => ({ otherSessionsClosed: true as const, passwordChanged: true as const })),
            confirmEmailChange: vi.fn(),
            requestEmailChange: vi.fn(),
        }

        session.setSession(login('user-a'))
        await createAccountSecurity({ api: api as never, session, userId: 'user-a' }).changePassword({ currentPassword: 'x', newPassword: 'Nueva-clave-2026' })

        expect(api.changePassword).toHaveBeenCalledWith('token-user-a', expect.anything(), expect.anything())
    })
})
