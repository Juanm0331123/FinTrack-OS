import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, it } from 'node:test'
import { MemoryStore, type Options } from 'express-rate-limit'
import { getRequestContext, runWithRequestContext } from './request-context.ts'

// El módulo importa la configuración: valores de relleno que nunca se usan para conectar (el
// almacén primario de estas pruebas es simulado).
process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_test'
process.env.JWT_ACCESS_SECRET ??= 'unit-access-secret-unit-access-secret-0001'
process.env.JWT_REFRESH_SECRET ??= 'unit-refresh-secret-unit-refresh-secret-0002'

const { ResilientRateLimitStore } = await import('./rate-limit-store.ts')

// Almacén compartido simulado: un MemoryStore que se puede "caer" y recuperar.
function flakyPrimary() {
    const memory = new MemoryStore()
    let down = false
    const guard = () => {
        if (down) {
            throw new Error('PostgreSQL no responde')
        }
    }

    return {
        hits: async (key: string) => (await memory.get(key))?.totalHits ?? 0,
        setDown: (value: boolean) => {
            down = value
        },
        store: {
            decrement: async (key: string) => {
                guard()
                await memory.decrement(key)
            },
            get: async (key: string) => {
                guard()
                return memory.get(key)
            },
            increment: async (key: string) => {
                guard()
                return memory.increment(key)
            },
            init: (options: Options) => memory.init(options),
            prefix: 'qa:',
            resetKey: async (key: string) => {
                guard()
                await memory.resetKey(key)
            },
            shutdown: () => memory.shutdown(),
        },
    }
}

function setup() {
    const primary = flakyPrimary()
    const store = new ResilientRateLimitStore(primary.store)

    store.init({ windowMs: 60_000 } as Options)

    const fallbackHits = async (key: string) => {
        primary.setDown(true)

        try {
            return (await store.get(key))?.totalHits ?? 0
        } finally {
            primary.setDown(false)
        }
    }

    return { fallbackHits, primary, store }
}

// Como en Express, cada petición conserva el mismo objeto de contexto durante toda su vida.
const contexts = new Map<string, { requestId: string }>()

function inRequest<T>(requestId: string, work: () => Promise<T>) {
    const context = contexts.get(requestId) ?? { requestId: `${requestId}-${contexts.size}` }

    contexts.set(requestId, context)

    return runWithRequestContext(context, work)
}

describe('ResilientRateLimitStore keeps the provenance of each increment (ROPS-03)', () => {
    it('undoes an increment in the store that received it after the primary recovers', async () => {
        const { fallbackHits, primary, store } = setup()

        for (let index = 0; index < 7; index += 1) {
            await inRequest(`ok-${index}`, () => store.increment('ip'))
        }

        primary.setDown(true)
        await inRequest('caida', () => store.increment('ip'))
        primary.setDown(false)
        await inRequest('caida', () => store.decrement('ip'))

        assert.equal(await primary.hits('ip'), 7)
        assert.equal(await fallbackHits('ip'), 0)
        store.shutdown()
    })

    it('matches interleaved requests during a failure and a recovery to their own store', async () => {
        const { fallbackHits, primary, store } = setup()

        contexts.clear()
        primary.setDown(true)
        await inRequest('a', () => store.increment('ip'))
        primary.setDown(false)
        await inRequest('b', () => store.increment('ip'))
        await inRequest('c', () => store.increment('ip'))

        // Terminan en otro orden: cada una deshace su propio incremento.
        await inRequest('b', () => store.decrement('ip'))

        assert.equal(await primary.hits('ip'), 1, 'b leaves the primary; c is still counted')
        assert.equal(await fallbackHits('ip'), 1, 'a is still counted in the fallback')

        await inRequest('a', () => store.decrement('ip'))

        assert.equal(await primary.hits('ip'), 1, 'only c remains counted in the primary')
        assert.equal(await fallbackHits('ip'), 0)
        store.shutdown()
    })

    it('does not move a decrement to the fallback when the primary fails while undoing its own increment', async () => {
        const { fallbackHits, primary, store } = setup()

        await inRequest('a', () => store.increment('ip'))
        primary.setDown(true)
        await inRequest('b', () => store.increment('ip'))
        await inRequest('a', () => store.decrement('ip'))
        primary.setDown(false)

        assert.equal(await fallbackHits('ip'), 1, 'b is still counted where it was incremented')
        store.shutdown()
    })

    it('prefers the fallback for a decrement without request context when it holds an outstanding increment', async () => {
        const { fallbackHits, primary, store } = setup()

        await store.increment('ip')
        primary.setDown(true)
        await store.increment('ip')
        primary.setDown(false)
        await store.decrement('ip')

        assert.equal(await primary.hits('ip'), 1)
        assert.equal(await fallbackHits('ip'), 0)
        store.shutdown()
    })
})

describe('request context at response time', () => {
    it('is still available in the finish event, where express-rate-limit undoes increments', async () => {
        let seen: string | undefined
        const server = createServer((_req, res) => {
            runWithRequestContext({ requestId: 'ctx-1' }, () => {
                res.on('finish', () => {
                    seen = getRequestContext()?.requestId
                })
                setTimeout(() => res.end('ok'), 5)
            })
        })

        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

        try {
            await (await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)).text()
            await new Promise((resolve) => setTimeout(resolve, 20))
            assert.equal(seen, 'ctx-1')
        } finally {
            server.close()
        }
    })
})

describe('fallback receipts do not accumulate after an outage (R2OPS-01)', () => {
    function clockedSetup() {
        let now = 1_000_000
        const primary = flakyPrimary()
        const store = new ResilientRateLimitStore(primary.store, { now: () => now })

        store.init({ windowMs: 60_000 } as Options)

        return { advance: (ms: number) => (now += ms), primary, store }
    }

    it('keeps no global receipt for requests that never undo their increment', async () => {
        const { advance, primary, store } = clockedSetup()

        primary.setDown(true)

        for (let index = 0; index < 1000; index += 1) {
            await runWithRequestContext({ requestId: `fallida-${index}` }, () => store.increment(`ip-${index}`))
        }

        advance(100 * 60_000)
        primary.setDown(false)

        for (let index = 0; index < 1000; index += 1) {
            await store.increment(`otra-${index}`)
        }

        assert.equal(store.fallbackReceiptCount(), 0)
        store.shutdown()
    })

    it('drops expired receipts without context once their window passes, whatever keys arrive later', async () => {
        const { advance, primary, store } = clockedSetup()

        primary.setDown(true)

        for (let index = 0; index < 1000; index += 1) {
            await store.increment(`sin-contexto-${index}`)
        }

        assert.equal(store.fallbackReceiptCount(), 1000)

        advance(100 * 60_000)
        primary.setDown(false)
        await store.increment('cualquier-otra')

        assert.equal(store.fallbackReceiptCount(), 0)
        store.shutdown()
    })

    it('clears receipts on shutdown', async () => {
        const { primary, store } = clockedSetup()

        primary.setDown(true)
        await store.increment('ip')
        store.shutdown()

        assert.equal(store.fallbackReceiptCount(), 0)
    })
})
