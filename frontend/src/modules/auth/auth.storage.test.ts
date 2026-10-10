import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    clearPendingVerification,
    loadPendingVerification,
    peekPasswordResetHandoff,
    savePendingVerification,
} from './auth.storage'

const PENDING_KEY = 'fintrack.auth.pending-verification'
const HANDOFF_KEY = 'fintrack.auth.password-reset-required'

function memoryStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial))

    return {
        data,
        getItem: (key: string) => data.get(key) ?? null,
        removeItem: (key: string) => void data.delete(key),
        setItem: (key: string, value: string) => void data.set(key, value),
    }
}

function withSessionStorage(storage: object) {
    vi.stubGlobal('window', { sessionStorage: storage })
}

const future = () => new Date(Date.now() + 10 * 60_000).toISOString()

afterEach(() => {
    vi.unstubAllGlobals()
})

// F-AUTH-04: un estado persistido incompatible se descarta en lugar de romper el formulario.
describe('persisted verification state', () => {
    it('keeps a valid pending verification', () => {
        const valid = { email: 'ana@fintrack.test', expiresAt: future(), source: 'login' }

        withSessionStorage(memoryStorage({ [PENDING_KEY]: JSON.stringify(valid) }))

        expect(loadPendingVerification()).toEqual(valid)
    })

    for (const [name, raw] of [
        ['an empty object', '{}'],
        ['JSON null', 'null'],
        ['a non-string email', JSON.stringify({ email: 5, expiresAt: future(), source: 'login' })],
        ['an unknown source', JSON.stringify({ email: 'ana@fintrack.test', expiresAt: future(), source: 'otra' })],
        ['an invalid date', JSON.stringify({ email: 'ana@fintrack.test', expiresAt: 'mañana', source: 'register' })],
        ['an expired code', JSON.stringify({ email: 'ana@fintrack.test', expiresAt: new Date(Date.now() - 1_000).toISOString(), source: 'login' })],
        ['malformed JSON', '{"email":'],
    ] as const) {
        it(`discards ${name}`, () => {
            const storage = memoryStorage({ [PENDING_KEY]: raw })

            withSessionStorage(storage)

            expect(loadPendingVerification()).toBeNull()
            expect(storage.data.has(PENDING_KEY)).toBe(false)
        })
    }

    it('discards an invalid or expired password reset handoff', () => {
        const storage = memoryStorage({ [HANDOFF_KEY]: JSON.stringify({ email: 'ana@fintrack.test', expiresAt: new Date(Date.now() - 1).toISOString() }) })

        withSessionStorage(storage)

        expect(peekPasswordResetHandoff()).toBeNull()
        expect(storage.data.has(HANDOFF_KEY)).toBe(false)
    })
})

// F-AUTH-05: el storage es opcional; sus excepciones nunca interrumpen la autenticación.
describe('storage operations that throw', () => {
    const throwing = {
        getItem: () => {
            throw new DOMException('Bloqueado', 'SecurityError')
        },
        removeItem: () => {
            throw new DOMException('Bloqueado', 'SecurityError')
        },
        setItem: () => {
            throw new DOMException('Sin espacio', 'QuotaExceededError')
        },
    }

    it('reads nothing, writes nothing and never throws', () => {
        withSessionStorage(throwing)

        expect(loadPendingVerification()).toBeNull()
        expect(peekPasswordResetHandoff()).toBeNull()
        expect(() => savePendingVerification({ email: 'ana@fintrack.test', expiresAt: future(), source: 'register' })).not.toThrow()
        expect(() => clearPendingVerification()).not.toThrow()
    })
})
