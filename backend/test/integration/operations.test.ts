import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import {
    createUser,
    deleteUsers,
    login,
    pool,
    prisma,
    randomTestIp,
    startApi,
    stopDatabase,
    TestClient,
    testEmail,
    TEST_ORIGIN,
    type TestApi,
} from '../support/harness.ts'
import { startServerProcess } from '../support/server-process.ts'

const { metrics } = await import('../../src/config/metrics.ts')

let api: TestApi
const createdUsers: string[] = []

before(async () => {
    api = await startApi()
})

after(async () => {
    await deleteUsers(...createdUsers)
    await api.close()
    await stopDatabase()
})

async function newUser() {
    const user = await createUser()

    createdUsers.push(user.id)

    return user
}

async function failLogins(client: TestClient, email: string, times: number) {
    const statuses: number[] = []

    for (let attempt = 0; attempt < times; attempt += 1) {
        statuses.push((await client.post('/api/auth/login', { email, password: 'Contraseña-mala-1' })).status)
    }

    return statuses
}

describe('separate auth budgets (AUTH-08, OPS-04)', () => {
    it('does not let login failures from an IP block refresh or another user’s login behind the same NAT', async () => {
        const victim = await newUser()
        const neighbour = await newUser()
        const nat = randomTestIp()
        const neighbourClient = api.client(nat)

        await login(neighbourClient, neighbour)

        // 10 fallos contra una misma cuenta agotan el presupuesto de esa cuenta, no el de la IP.
        const statuses = await failLogins(api.client(nat), victim.email, 11)

        assert.equal(statuses.at(-1), 429)
        assert.equal((await neighbourClient.post('/api/auth/refresh')).status, 200, 'refresh has its own budget')
        assert.equal(
            (await api.client(nat).post('/api/auth/login', { email: neighbour.email, password: neighbour.password })).status,
            200,
            'another account behind the same IP can still sign in',
        )
    })

    it('limits a targeted account even when the attacker rotates IPs', async () => {
        const victim = await newUser()
        const statuses: number[] = []

        for (let attempt = 0; attempt < 11; attempt += 1) {
            statuses.push((await failLogins(api.client(), victim.email, 1))[0])
        }

        assert.equal(statuses.slice(0, 10).every((status) => status === 401), true)
        assert.equal(statuses[10], 429)
    })

    it('does not count successful logins against the IP budget', async () => {
        const user = await newUser()
        const client = api.client()

        for (let attempt = 0; attempt < 35; attempt += 1) {
            const response = await client.post('/api/auth/login', { email: user.email, password: user.password })

            assert.equal(response.status, 200)
        }
    })
})

describe('protection before expensive work (OPS-03)', () => {
    it('rejects a client that keeps sending invalid bearers before verifying them or touching the database', async () => {
        const client = api.client()
        let lastStatus = 0

        for (let attempt = 0; attempt < 61 && lastStatus !== 429; attempt += 1) {
            lastStatus = (await client.get('/api/finance/workbook', { token: 'not-a-jwt' })).status
        }

        assert.equal(lastStatus, 429)

        const acquiresBefore = metrics.snapshot().dbAcquires

        for (let attempt = 0; attempt < 5; attempt += 1) {
            assert.equal((await client.get('/api/finance/workbook', { token: 'not-a-jwt' })).status, 429)
        }

        assert.equal(metrics.snapshot().dbAcquires, acquiresBefore, 'rejected requests did not query the database')
    })

    it('applies the perimeter limit to unauthenticated finance requests too', async () => {
        const server = await startServerProcess({ API_RATE_LIMIT_MAX: '5' })

        try {
            const client = new TestClient(server.baseUrl)
            const statuses = []

            for (let attempt = 0; attempt < 6; attempt += 1) {
                statuses.push((await client.get('/api/finance/workbook')).status)
            }

            assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429])
            assert.equal((await client.get('/api/health/live')).status, 200, 'health is never rate limited')
        } finally {
            await server.stop()
        }
    })
})

describe('shared counters across replicas (OPS-05)', () => {
    it('counts attempts against one account across two server processes', async () => {
        const victim = await newUser()
        const replica = await startServerProcess()

        try {
            const statuses: number[] = []

            for (let attempt = 0; attempt < 11; attempt += 1) {
                const client = attempt % 2 === 0 ? api.client() : new TestClient(replica.baseUrl)

                statuses.push((await failLogins(client, victim.email, 1))[0])
            }

            assert.equal(statuses.filter((status) => status === 401).length, 10, 'ten attempts in total, not ten per replica')
            assert.equal(statuses[10], 429)
        } finally {
            await replica.stop()
        }
    })

    it('keeps serving and still limits when the shared store is unavailable', async () => {
        const user = await newUser()
        const victim = await newUser()

        await prisma.$executeRawUnsafe('ALTER TABLE "rate_limit_buckets" RENAME TO "rate_limit_buckets_offline"')

        try {
            assert.equal(
                (await api.client().post('/api/auth/login', { email: user.email, password: user.password })).status,
                200,
                'legitimate traffic is not blocked by the store failure',
            )

            const statuses = await failLogins(api.client(), victim.email, 11)

            assert.equal(statuses.at(-1), 429, 'the per-replica fallback keeps protecting the account')
        } finally {
            await prisma.$executeRawUnsafe('ALTER TABLE "rate_limit_buckets_offline" RENAME TO "rate_limit_buckets"')
        }
    })
})

describe('origin protection and client IP (OPS-06)', () => {
    const edgeSecret = 'edge-secret-for-tests-only-0123456789abcdef'

    it('refuses business traffic that bypasses the edge proxy, but serves health checks', async () => {
        const server = await startServerProcess({ EDGE_PROXY_SECRET: edgeSecret })

        try {
            const direct = await fetch(`${server.baseUrl}/api/auth/me`)
            const viaEdge = await fetch(`${server.baseUrl}/api/auth/me`, { headers: { 'x-fintrack-edge-auth': edgeSecret } })
            const wrongSecret = await fetch(`${server.baseUrl}/api/auth/me`, { headers: { 'x-fintrack-edge-auth': `${edgeSecret}x` } })

            assert.equal(direct.status, 403)
            assert.equal(((await direct.json()) as { code: string }).code, 'EDGE_PROXY_REQUIRED')
            assert.equal(wrongSecret.status, 403)
            assert.equal(viaEdge.status, 401, 'reaches the API, which then requires a session')
            assert.equal((await fetch(`${server.baseUrl}/api/health/live`)).status, 200)
        } finally {
            await server.stop()
        }
    })

    it('keys limits on the client IP forwarded by the edge, ignoring spoofed X-Forwarded-For', async () => {
        const server = await startServerProcess({ API_RATE_LIMIT_MAX: '3', EDGE_PROXY_SECRET: edgeSecret, TRUST_PROXY: '1' })

        try {
            const statuses = []

            for (let attempt = 0; attempt < 4; attempt += 1) {
                const response = await fetch(`${server.baseUrl}/api/auth/me`, {
                    headers: {
                        'X-Forwarded-For': `198.51.100.${attempt}`,
                        'x-fintrack-client-ip': '203.0.113.77',
                        'x-fintrack-edge-auth': edgeSecret,
                    },
                })

                statuses.push(response.status)
            }

            assert.deepEqual(statuses, [401, 401, 401, 429])
        } finally {
            await server.stop()
        }
    })

    it('with one trusted hop, a spoofed X-Forwarded-For prefix does not change the client identity', async () => {
        const server = await startServerProcess({ API_RATE_LIMIT_MAX: '3', TRUST_PROXY: '1' })

        try {
            const statuses = []

            for (let attempt = 0; attempt < 4; attempt += 1) {
                // Simula Cloud Run: el cliente pone un valor falso y el balanceador añade la IP real al final.
                const response = await fetch(`${server.baseUrl}/api/auth/me`, {
                    headers: { 'X-Forwarded-For': `198.51.100.${attempt}, 203.0.113.88` },
                })

                statuses.push(response.status)
            }

            assert.deepEqual(statuses, [401, 401, 401, 429])
        } finally {
            await server.stop()
        }
    })
})

describe('logs without secrets (OPS-01)', () => {
    it('never writes passwords, codes, OAuth state, tokens or cookies to stdout or stderr', async () => {
        const server = await startServerProcess()
        const markers = {
            bearer: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJjYWRvciJ9.firma-marcador-123',
            code: 'codigo-oauth-marcador-777',
            cookie: 'cookie-marcadora-888',
            password: 'contrasena-marcadora-999',
            state: 'estado-oauth-marcador-555',
        }

        try {
            const client = new TestClient(server.baseUrl)

            await client.request('POST', '/api/auth/login', { rawBody: `{"email":"x@fintrack.test","password":"${markers.password}"` })
            await client.post('/api/auth/login', { email: testEmail(), password: markers.password })
            await client.get(`/api/auth/oauth/google/callback?code=${markers.code}&state=${markers.state}`)
            await client.get('/api/auth/me', { headers: { Authorization: `Bearer ${markers.bearer}` } })
            await client.post('/api/auth/refresh', undefined, { headers: { Cookie: `refresh_token=${markers.cookie}` } })
        } finally {
            await server.stop()
        }

        const output = server.output()

        assert.match(output, /"message":"http_request"/, 'access logs are written')

        for (const [name, marker] of Object.entries(markers)) {
            assert.equal(output.includes(marker), false, `${name} leaked into the logs`)
        }
    })
})

describe('parser errors (OPS-02)', () => {
    it('maps malformed JSON, oversized bodies and bad charsets to 400/413/415 with Spanish messages', async () => {
        const client = api.client()
        const malformed = await client.request('POST', '/api/auth/login', { rawBody: '{"email":' })
        const tooLarge = await client.request('POST', '/api/auth/login', { rawBody: JSON.stringify({ email: 'a'.repeat(1_100_000) }) })
        const charset = await client.request('POST', '/api/auth/login', {
            contentType: 'application/json; charset=bogus',
            rawBody: '{}',
        })

        assert.equal(malformed.status, 400)
        assert.equal(malformed.body.code, 'MALFORMED_JSON')
        assert.equal(tooLarge.status, 413)
        assert.equal(tooLarge.body.code, 'PAYLOAD_TOO_LARGE')
        assert.equal(charset.status, 415)
        assert.equal(charset.body.code, 'UNSUPPORTED_MEDIA_TYPE')

        for (const response of [malformed, tooLarge, charset]) {
            assert.doesNotMatch(response.body.message, /Unexpected|JSON at position|SyntaxError/)
        }
    })
})

describe('public errors (OPS-16)', () => {
    it('answers a foreign origin, unknown routes and unknown fields in Spanish with stable codes', async () => {
        const client = api.client()
        const cors = await client.get('/api/health/live', { headers: { Origin: 'https://evil.example' } })
        const missing = await client.get('/api/no-existe')
        const unknownField = await client.post('/api/auth/login', { email: testEmail(), password: 'x', extra: true })

        assert.equal(cors.status, 403)
        assert.equal(cors.body.code, 'ORIGIN_NOT_ALLOWED')
        assert.equal(missing.status, 404)
        assert.equal(missing.body.code, 'NOT_FOUND')
        assert.equal(unknownField.status, 422)
        assert.match(unknownField.body.errors.map((issue: { message: string }) => issue.message).join(' '), /Campo no permitido: extra/)
    })

    it('does not reveal constraint or column names on unique conflicts', async () => {
        const user = await newUser()
        const client = api.client()
        const token = await login(client, user)

        await client.post('/api/finance/accounts', { name: 'Ahorros' }, { token })

        const duplicate = await client.post('/api/finance/accounts', { name: 'ahorros' }, { token })

        assert.equal(duplicate.status, 409)
        assert.doesNotMatch(duplicate.text, /constraint|name_key|user_id|Unique/i)
    })
})

describe('health checks (OPS-07)', () => {
    it('reports ready only when the database answers', async () => {
        const client = api.client()

        assert.equal((await client.get('/api/health/live')).status, 200)
        assert.equal((await client.get('/api/health/ready')).status, 200)
    })

    it('stays live but not ready when PostgreSQL is unreachable, without exposing details', async () => {
        const unreachable = 'postgresql://fintrack_test:x@127.0.0.1:1/fintrack_test'
        const server = await startServerProcess({ DATABASE_URL: unreachable, DIRECT_URL: unreachable })

        try {
            const startedAt = Date.now()
            const ready = await fetch(`${server.baseUrl}/api/health/ready`)
            const body = (await ready.json()) as { code: string }

            assert.equal((await fetch(`${server.baseUrl}/api/health/live`)).status, 200)
            assert.equal(ready.status, 503)
            assert.equal(body.code, 'NOT_READY')
            assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|ECONNREFUSED|postgres/i)
            assert.ok(Date.now() - startedAt < 4000, 'the check is bounded')
        } finally {
            await server.stop()
        }
    })
})

describe('database budgets (DATA-01, OPS-08)', () => {
    it('fails fast with 503 when the pool is saturated and recovers when connections return', async () => {
        const user = await newUser()
        const client = api.client()
        const token = await login(client, user)
        const held = []

        while (pool.totalCount < 5 || pool.idleCount > 0) {
            held.push(await pool.connect())
        }

        try {
            const startedAt = Date.now()
            const saturated = await client.get('/api/finance/workbook', { token })

            assert.equal(saturated.status, 503)
            assert.ok(['DB_UNAVAILABLE', 'DB_BUSY'].includes(saturated.body.code))
            assert.ok(Number(saturated.headers.get('retry-after')) > 0)
            assert.ok(Date.now() - startedAt < 5000, 'bounded by the acquisition budget')
        } finally {
            held.forEach((connection) => connection.release())
        }

        assert.equal((await client.get('/api/finance/workbook', { token })).status, 200)
    })

    it('bounds lock waits inside transactions (SET LOCAL lock_timeout) and recovers afterwards', async () => {
        const user = await newUser()
        const client = api.client()
        const token = await login(client, user)

        await client.post('/api/finance/sheets', { yearMonth: '2026-08' }, { token })
        await client.post('/api/finance/sheets', { yearMonth: '2026-09' }, { token })

        const locker = new pg.Client({ connectionString: process.env.DATABASE_URL })

        await locker.connect()
        await locker.query('BEGIN')
        await locker.query(`SELECT id FROM month_sheets WHERE user_id = $1 AND year_month = '2026-09' FOR UPDATE`, [user.id])

        try {
            const blocked = await client.post('/api/finance/sheets/2026-09/copy-previous', {}, { token })

            assert.equal(blocked.status, 503)
            assert.equal(blocked.body.code, 'DB_BUSY')
        } finally {
            await locker.query('ROLLBACK')
            await locker.end()
        }

        assert.equal((await client.post('/api/finance/sheets/2026-09/copy-previous', {}, { token })).status, 200)
    })
})

describe('request correlation (OPS-14)', () => {
    it('returns a request id, reusing a safe incoming one and replacing an unsafe one', async () => {
        const client = api.client()
        const generated = await client.get('/api/health/live')
        const reused = await client.get('/api/health/live', { headers: { 'X-Request-Id': 'trace-abc-123456' } })
        const unsafe = await client.get('/api/health/live', { headers: { 'X-Request-Id': 'id <script> con espacios' } })

        assert.match(generated.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/)
        assert.equal(reused.headers.get('x-request-id'), 'trace-abc-123456')
        assert.match(unsafe.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/)
    })

    it('aggregates latency by route pattern, not by concrete ids', async () => {
        const user = await newUser()
        const client = api.client()
        const token = await login(client, user)

        await client.patch(`/api/finance/entries/${crypto.randomUUID()}`, { concept: 'x' }, { token })

        const routes = Object.keys(metrics.snapshot().routes)

        assert.ok(routes.includes('PATCH /api/finance/entries/:id'))
        assert.equal(routes.some((route) => /[0-9a-f]{8}-[0-9a-f]{4}/.test(route)), false)
    })
})

describe('security headers', () => {
    it('sends helmet headers, no-store on API responses and no x-powered-by', async () => {
        const response = await api.client().get('/api/health/live')

        assert.equal(response.headers.get('x-powered-by'), null)
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
        assert.ok(response.headers.get('content-security-policy'))
        assert.equal(response.headers.get('cache-control'), 'no-store')
        assert.equal(response.headers.get('access-control-allow-origin'), TEST_ORIGIN)
    })
})

describe('graceful shutdown of a real process (OPS-09)', () => {
    const skip = process.platform === 'win32' ? 'Windows no entrega SIGTERM a procesos Node; se ejecuta en Linux/CI' : false

    it('drains an in-flight request on SIGTERM and exits 0 within the Cloud Run window', { skip }, async () => {
        const server = await startServerProcess({ DB_LOCK_TIMEOUT_MS: '1500' })
        const user = await newUser()
        const client = new TestClient(server.baseUrl)
        const token = (await client.post('/api/auth/login', { email: user.email, password: user.password })).body.data.accessToken

        await client.post('/api/finance/sheets', { yearMonth: '2026-08' }, { token })
        await client.post('/api/finance/sheets', { yearMonth: '2026-09' }, { token })

        const locker = new pg.Client({ connectionString: process.env.DATABASE_URL })

        await locker.connect()
        await locker.query('BEGIN')
        await locker.query(`SELECT id FROM month_sheets WHERE user_id = $1 AND year_month = '2026-09' FOR UPDATE`, [user.id])

        try {
            const inFlight = client.post('/api/finance/sheets/2026-09/copy-previous', {}, { token })

            await new Promise((resolve) => setTimeout(resolve, 200))

            const startedAt = Date.now()
            const exitCode = server.stop('SIGTERM')
            const response = await inFlight

            assert.equal(response.status, 503, 'the in-flight request still receives an answer')
            assert.equal(await exitCode, 0)
            assert.ok(Date.now() - startedAt < 9000)
            assert.match(server.output(), /shutdown_completed/)
        } finally {
            await locker.query('ROLLBACK')
            await locker.end()
        }
    })
})
