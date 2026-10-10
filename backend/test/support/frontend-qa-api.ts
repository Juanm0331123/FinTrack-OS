// API real (Express + Prisma) sobre el PostgreSQL de prueba para el QA integrado del frontend.
// El frontend compilado en producción la consume a través de su proxy /api/*; el arnés de navegador
// (frontend/qa/browser) solo habla HTTP con esta API y con el servidor de control. Correo y OAuth
// usan proveedores falsos y una bandeja en memoria: no sale ningún mensaje real.
//
//   docker compose -p fintrack-frontend-qa -f test/compose.yaml up -d
//   TEST_DATABASE_URL=postgresql://fintrack_test:fintrack_test_only@127.0.0.1:55433/fintrack_test \
//   EDGE_PROXY_SECRET=<32+ caracteres> pnpm qa:frontend-api
//
// Variables: QA_API_PORT (4410), QA_CONTROL_PORT (4411), QA_FRONTEND_ORIGIN (http://127.0.0.1:3300),
// QA_ACCESS_TTL (15m; permite probar la expiración del access token).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Server } from 'node:http'

const apiPort = Number(process.env.QA_API_PORT ?? 4410)
const controlPort = Number(process.env.QA_CONTROL_PORT ?? 4411)
const frontendOrigin = process.env.QA_FRONTEND_ORIGIN ?? 'http://127.0.0.1:3300'

if (!process.env.EDGE_PROXY_SECRET || process.env.EDGE_PROXY_SECRET.length < 32) {
    throw new Error('Define EDGE_PROXY_SECRET (32+ caracteres), el mismo que usa el frontend en su proxy.')
}

process.env.ALLOWED_ORIGINS = frontendOrigin
process.env.FRONTEND_APP_URL = frontendOrigin
process.env.JWT_ACCESS_TTL = process.env.QA_ACCESS_TTL ?? '15m'
// Los recorridos repiten logins y refresh desde el loopback: límites holgados pero activos.
process.env.AUTH_RATE_LIMIT_MAX ??= '500'
process.env.AUTH_ACCOUNT_RATE_LIMIT_MAX ??= '200'

const { globalSetup } = await import('./global-setup.ts')

await globalSetup()

const harness = await import('./harness.ts')
const { installFakeProviders } = await import('./fake-providers.ts')
const { app } = await import('../../src/app.ts')
const providers = installFakeProviders()
const created = new Set<string>()

const api: Server = await new Promise((resolve) => {
    const listening = app.listen(apiPort, '127.0.0.1', () => resolve(listening))
})

function send(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage) {
    const chunks: Buffer[] = []

    for await (const chunk of req) {
        chunks.push(chunk as Buffer)
    }

    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

async function loginResponse(email: string, password: string) {
    const login = await fetch(`http://127.0.0.1:${apiPort}/api/auth/login`, {
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json', Origin: frontendOrigin, 'x-fintrack-edge-auth': process.env.EDGE_PROXY_SECRET! },
        method: 'POST',
    })

    return { body: (await login.json()) as { data?: { accessToken?: string } & Record<string, unknown> }, status: login.status }
}

// Llama a la API pública con una sesión propia (login real) para preparar o comprobar datos.
async function asUser(email: string, password: string) {
    const client = new harness.TestClient(`http://127.0.0.1:${apiPort}`)
    const login = await loginResponse(email, password)
    const token = login.body.data?.accessToken as string | undefined

    if (!token) {
        throw new Error(`login de fixture falló: ${login.status}`)
    }

    return (method: string, path: string, body?: unknown) =>
        client.request(method, `/api/finance${path}`, {
            body,
            headers: { Origin: frontendOrigin, 'x-fintrack-edge-auth': process.env.EDGE_PROXY_SECRET! },
            token,
            withOrigin: false,
        })
}

const routes: Record<string, (body: any, url: URL) => Promise<unknown>> = {
    'GET /status': async () => ({ apiOrigin: `http://127.0.0.1:${apiPort}`, ready: true }),
    'GET /code': async (_body, url) => ({ code: harness.lastCodeSentTo(url.searchParams.get('email')!) }),
    // Usuario verificado sintético.
    'POST /users': async (body) => {
        const user = await harness.createUser({ email: harness.testEmail(body.label ?? 'qa') })

        created.add(user.email)

        return user
    },
    // Lectura por la API pública (GET /workbook) con un login propio.
    'POST /workbook': async (body) => (await (await asUser(body.email, body.password))('GET', '/workbook')).body.data,
    // Ejecuta una lista de llamadas a la API financiera pública como ese usuario.
    'POST /finance': async (body) => {
        const call = await asUser(body.email, body.password)
        const results = []

        for (const step of body.steps as Array<{ body?: unknown; method: string; path: string }>) {
            const response = await call(step.method, step.path, step.body)

            results.push({ body: response.body, status: response.status })
        }

        return results
    },
    // Respuesta de login real (la misma que recibe una pestaña al entrar): sirve para simular que
    // otra pestaña del navegador inició sesión con esa cuenta.
    'POST /session': async (body) => {
        const login = await loginResponse(body.email, body.password)

        if (login.status !== 200) {
            throw new Error(`login falló: ${login.status}`)
        }

        return login.body.data
    },
    'POST /reset-limits': async () => {
        await harness.prisma.$executeRawUnsafe('DELETE FROM "rate_limit_buckets"')

        return { reset: true }
    },
    'POST /cleanup': async () => {
        await harness.deleteUsersByEmail(...created)
        created.clear()

        return { cleaned: true }
    },
}

const control = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${controlPort}`)
    const route = routes[`${req.method} ${url.pathname}`]

    if (!route) {
        send(res, 404, { error: 'not found' })
        return
    }

    try {
        send(res, 200, await route(await readJson(req), url))
    } catch (error) {
        send(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
})

control.listen(controlPort, '127.0.0.1', () => {
    console.log(`QA API http://127.0.0.1:${apiPort} · control http://127.0.0.1:${controlPort} · origen ${frontendOrigin}`)
})

let closing = false

async function close() {
    if (closing) {
        return
    }

    closing = true
    providers.restore()
    control.closeAllConnections()
    api.closeAllConnections()
    await new Promise((resolve) => control.close(resolve))
    await new Promise((resolve) => api.close(resolve))
    await harness.deleteUsersByEmail(...created)
    await harness.stopDatabase()
    process.exit(0)
}

process.on('SIGINT', close)
process.on('SIGTERM', close)
