import { once } from 'node:events'
import { Prisma } from '@prisma/client'
import express from 'express'
import { setLogLevel, setLogSink } from '../../src/config/logger.ts'
import { errorMiddleware } from '../../src/middlewares/error.middleware.ts'
import { requestContextMiddleware } from '../../src/middlewares/request-context.middleware.ts'
import { RequestValidationError, ServiceUnavailableError } from '../../src/utils/app-error.ts'

// Exercise the HTTP error boundary without importing the app, opening Prisma or loading .env.
const diagnostics: Record<string, unknown>[] = []
const restoreSink = setLogSink((line) => diagnostics.push(JSON.parse(line)))

setLogLevel('info')

const app = express()
const missingColumn = new Prisma.PrismaClientKnownRequestError(
    'Invalid `prisma.user.findFirst()` invocation:\nThe column `users.password_hash_version` does not exist.\nSELECT password_hash FROM users; password=internal-credential-sentinel',
    {
        clientVersion: '7.10.0',
        code: 'P2022',
        meta: { column: 'users.password_hash_version' },
    },
)

missingColumn.stack += '\n    at login (C:\\private\\backend\\src\\modules\\auth\\auth.repository.ts:10:3)'
app.use(requestContextMiddleware)
app.post('/api/auth/login', () => {
    throw missingColumn
})
app.get('/unknown', () => {
    throw new Error('Unexpected failure at C:\\private\\server.ts: password=internal-credential-sentinel')
})
app.get('/validation', () => {
    throw new RequestValidationError('Revisa los datos enviados.', [{ field: 'email', message: 'El correo no es válido.' }])
})
app.get('/email-unavailable', () => {
    throw new ServiceUnavailableError(
        'No pudimos enviar el correo en este momento. Intenta de nuevo en unos minutos.',
        'EMAIL_DELIVERY_FAILED',
        undefined,
        5,
    )
})
app.get('/database-busy', () => {
    throw new Prisma.PrismaClientKnownRequestError('Raw query failed: SQL detail must remain private.', {
        clientVersion: '7.10.0',
        code: 'P2010',
        meta: { driverAdapterError: { cause: { originalCode: '55P03' } } },
    })
})
app.use(errorMiddleware)

const server = app.listen(0, '127.0.0.1')

try {
    await once(server, 'listening')
    const address = server.address()

    if (!address || typeof address === 'string') {
        throw new Error('Expected a local HTTP listener')
    }

    const responses: Record<string, unknown>[] = []

    for (const path of ['/api/auth/login', '/unknown', '/validation', '/email-unavailable', '/database-busy']) {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
            headers: { 'X-Request-Id': 'qa-schema-error-request' },
            method: path === '/api/auth/login' ? 'POST' : 'GET',
        })

        responses.push({
            body: await response.json(),
            path,
            requestId: response.headers.get('x-request-id'),
            retryAfter: response.headers.get('retry-after'),
            status: response.status,
        })
    }

    process.stdout.write(JSON.stringify({ diagnostics, responses }))
} finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    restoreSink()
}
