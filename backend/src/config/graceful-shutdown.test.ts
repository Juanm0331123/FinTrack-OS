import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, it } from 'node:test'
import { createGracefulShutdown } from './graceful-shutdown.ts'

async function serverWithSlowRoute(delayMs: number) {
    const server: Server = createServer((_req, res) => {
        setTimeout(() => res.end('terminado'), delayMs)
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

    return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}

function recorder() {
    const events: string[] = []
    let resolveExit: (code: number) => void = () => undefined
    const exited = new Promise<number>((resolve) => {
        resolveExit = resolve
    })

    return {
        events,
        exit: (code: number) => {
            events.push(`exit:${code}`)
            resolveExit(code)
        },
        exited,
    }
}

describe('createGracefulShutdown', () => {
    it('lets an in-flight request finish, then closes resources and exits 0, once', async () => {
        const { server, url } = await serverWithSlowRoute(100)
        const record = recorder()
        const shutdown = createGracefulShutdown({
            closeResources: async () => {
                record.events.push('resources-closed')
            },
            exit: record.exit,
            server,
            timeoutMs: 2000,
        })
        const inFlight = fetch(url).then((response) => response.text())

        await new Promise((resolve) => setTimeout(resolve, 20))

        const first = shutdown('SIGTERM')
        const second = shutdown('SIGTERM')

        assert.equal(first, second, 'repeated signals reuse the same shutdown')
        assert.equal(await inFlight, 'terminado')
        assert.equal(await record.exited, 0)
        assert.deepEqual(record.events, ['resources-closed', 'exit:0'])
    })

    it('forces lingering connections closed before the deadline and still exits within it', async () => {
        const { server, url } = await serverWithSlowRoute(5000)
        const record = recorder()
        const shutdown = createGracefulShutdown({
            closeResources: async () => {
                record.events.push('resources-closed')
            },
            exit: record.exit,
            forceCloseMarginMs: 150,
            server,
            timeoutMs: 400,
        })
        const inFlight = fetch(url).catch(() => 'cortada')

        await new Promise((resolve) => setTimeout(resolve, 20))

        const startedAt = Date.now()

        void shutdown('SIGTERM')

        assert.equal(await record.exited, 0)
        assert.ok(Date.now() - startedAt < 400, 'exits before the hard deadline')
        assert.equal(await inFlight, 'cortada')
    })

    it('exits 1 when closing resources fails', async () => {
        const { server } = await serverWithSlowRoute(0)
        const record = recorder()
        const shutdown = createGracefulShutdown({
            closeResources: async () => {
                throw new Error('pool no cerró')
            },
            exit: record.exit,
            server,
            timeoutMs: 1000,
        })

        void shutdown('SIGTERM')

        assert.equal(await record.exited, 1)
    })

    it('exits 1 at the hard deadline when closing resources hangs', async () => {
        const { server } = await serverWithSlowRoute(0)
        const record = recorder()
        const shutdown = createGracefulShutdown({
            closeResources: () => new Promise(() => undefined),
            exit: record.exit,
            server,
            timeoutMs: 300,
        })
        const startedAt = Date.now()

        void shutdown('SIGTERM')

        assert.equal(await record.exited, 1)
        assert.ok(Date.now() - startedAt >= 290)
    })
})
