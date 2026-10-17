import { afterEach, describe, expect, it, vi } from 'vitest'

import { loginWithEmail, refreshSession, registerWithEmail } from './auth.api'
import { createSessionManager, SessionUnavailableError } from './session-manager'

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('authentication errors shown to the user', () => {
    it('hides database details returned by a failing login server', async () => {
        const diagnostic = 'Invalid `prisma.user.findFirst()` invocation: The column `users.password_hash_version` does not exist in the current database.'
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
            code: 'P2022',
            details: { stack: diagnostic },
            errors: [{ field: 'email', message: diagnostic }],
            message: `Algo falló en el servidor. Intenta de nuevo. (${diagnostic})`,
            success: false,
        }), { headers: { 'Content-Type': 'application/json' }, status: 500 }))

        await expect(loginWithEmail({ email: 'qa@fintrack.test', password: 'test-only' })).rejects.toMatchObject({
            code: undefined,
            details: undefined,
            errors: undefined,
            message: 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.',
            status: 500,
        })
    })

    it.each([200, 502, 503])('hides unexpected diagnostics even when the response uses HTTP %s', async (status) => {
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
            message: 'Error at C:\\private\\server.ts:12 SELECT password_hash FROM users',
            success: false,
        }), { headers: { 'Content-Type': 'application/json' }, status }))

        await expect(registerWithEmail({ email: 'qa@fintrack.test', firstName: 'QA', password: 'test-only' })).rejects.toMatchObject({
            message: 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.',
            status,
        })
    })

    it('preserves field validation and business instructions on a rejected registration', async () => {
        const errors = [{ field: 'password', message: 'La contraseña debe tener al menos 12 caracteres.' }]
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
            code: 'VALIDATION_ERROR',
            errors,
            message: 'Revisa los campos indicados.',
            success: false,
        }), { headers: { 'Content-Type': 'application/json' }, status: 422 }))

        await expect(registerWithEmail({ email: 'qa@fintrack.test', firstName: 'QA', password: 'short' })).rejects.toMatchObject({
            code: 'VALIDATION_ERROR',
            errors,
            message: 'Revisa los campos indicados.',
            status: 422,
        })
    })

    it('preserves rate-limit instructions, details and the numeric Retry-After header', async () => {
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
            code: 'AUTH_RATE_LIMITED',
            details: { retryAfterSeconds: 42 },
            message: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
            success: false,
        }), { headers: { 'Content-Type': 'application/json', 'Retry-After': '42' }, status: 429 }))

        await expect(loginWithEmail({ email: 'qa@fintrack.test', password: 'test-only' })).rejects.toMatchObject({
            code: 'AUTH_RATE_LIMITED',
            details: { retryAfterSeconds: 42 },
            message: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
            retryAfterSeconds: 42,
            status: 429,
        })
    })

    it('reports a safe temporary refresh failure while retaining the account identity', async () => {
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
            message: 'Invalid prisma.user.findFirst() invocation',
            success: false,
        }), { headers: { 'Content-Type': 'application/json', 'Retry-After': '10' }, status: 503 }))
        const session = createSessionManager({
            hint: { get: () => true, set: () => undefined },
            now: () => 0,
            refresh: refreshSession,
            sleep: async () => undefined,
        })
        session.setSession({
            accessToken: 'synthetic-token',
            accessTokenExpiresInSeconds: 1,
            user: {
                createdAt: '2026-10-01T00:00:00.000Z',
                email: 'qa@fintrack.test',
                firstName: 'QA',
                id: 'qa-user',
                lastLoginAt: null,
                lastName: null,
                preferredCurrencyCode: 'COP',
                role: 'USER',
                status: 'ACTIVE',
                timezone: 'America/Bogota',
                updatedAt: '2026-10-01T00:00:00.000Z',
            },
        })

        const failure = await session.ensureAccessToken({ userId: 'qa-user' }).catch((error: unknown) => error)

        expect(failure).toBeInstanceOf(SessionUnavailableError)
        expect(failure).toMatchObject({ message: 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.' })
        expect(session.getSnapshot()).toMatchObject({ session: { user: { id: 'qa-user' } }, status: 'unavailable' })
    })
})
