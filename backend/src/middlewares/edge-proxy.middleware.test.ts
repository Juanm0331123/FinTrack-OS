import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import express, { type NextFunction, type Request, type Response } from 'express'

const EDGE_SECRET = 'edge-test-secret-01234567890123456789'

// Solo se importa el perímetro HTTP: sin Prisma, .env local ni conexiones de base de datos.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/fintrack_test'
process.env.JWT_ACCESS_SECRET = 'a'.repeat(48)
process.env.JWT_REFRESH_SECRET = 'r'.repeat(48)
process.env.NODE_ENV = 'test'
process.env.TRUST_PROXY = 'false'
process.env.VERCEL = '1'
process.env.EDGE_PROXY_SECRET = EDGE_SECRET

const { clientIpMiddleware, requireEdgeProxy } = await import('./edge-proxy.middleware.ts')

describe('authenticated client IP across the two Vercel projects', () => {
    const app = express()
    app.set('trust proxy', false)
    app.use(clientIpMiddleware)
    app.get('/api/health/live', (_req, res) => res.sendStatus(200))
    app.use('/api', requireEdgeProxy)
    app.get('/api/identity', (req, res) => res.json({ clientIp: req.clientIp, socketIp: req.ip }))
    app.use((error: { code: string; statusCode: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(error.statusCode).json({ code: error.code })
    })
    const server = app.listen()
    let baseUrl: string

    before(async () => {
        if (!server.listening) {
            await once(server, 'listening')
        }
        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    })
    after(async () => {
        server.closeAllConnections()
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    })

    it('never replaces the visitor with the second-hop IP or a forged X-Forwarded-For', async () => {
        for (const clientIp of ['203.0.113.7', '2001:db8::7']) {
            const response = await fetch(`${baseUrl}/api/identity`, {
                headers: {
                    'x-fintrack-edge-auth': EDGE_SECRET,
                    'x-fintrack-client-ip': clientIp,
                    'x-forwarded-for': '198.51.100.1, 198.51.100.2',
                    'x-real-ip': '198.51.100.3',
                },
            })
            assert.equal(response.status, 200)
            const body = await response.json() as { clientIp: string; socketIp: string }
            assert.equal(body.clientIp, clientIp)
            assert.notEqual(body.socketIp, clientIp, 'Express req.ip deliberately remains the untrusted socket identity')
        }
    })

    it('refuses direct business traffic even with forged dedicated and platform headers', async () => {
        for (const secret of ['', `${EDGE_SECRET}x`]) {
            const response = await fetch(`${baseUrl}/api/identity`, {
                headers: {
                    'x-fintrack-edge-auth': secret,
                    'x-fintrack-client-ip': '203.0.113.7',
                    'x-forwarded-for': '203.0.113.7',
                    'x-vercel-forwarded-for': '203.0.113.7',
                },
            })
            assert.equal(response.status, 403)
            assert.deepEqual(await response.json(), { code: 'EDGE_PROXY_REQUIRED' })
        }
        assert.equal((await fetch(`${baseUrl}/api/health/live`)).status, 200)
    })

    it('fails closed when an authenticated proxy does not provide exactly one valid IP', async () => {
        for (const invalid of ['', 'invalid', '203.0.113.7, 203.0.113.8', '203.0.113.7:443', '[2001:db8::7]', 'fe80::1%eth0']) {
            const headers = new Headers({ 'x-fintrack-edge-auth': EDGE_SECRET, 'x-forwarded-for': '203.0.113.90' })
            if (invalid) {
                headers.set('x-fintrack-client-ip', invalid)
            }
            const response = await fetch(`${baseUrl}/api/identity`, { headers })
            assert.equal(response.status, 503, `accepted invalid IP ${invalid}`)
            assert.deepEqual(await response.json(), { code: 'EDGE_CLIENT_IP_MISSING' })
        }
    })
})
