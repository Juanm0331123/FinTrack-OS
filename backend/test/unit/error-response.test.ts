import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const probe = new URL('../support/error-response-probe.ts', import.meta.url)

describe('HTTP internal error privacy', () => {
    for (const environment of ['development', 'production']) {
        it(`does not expose Prisma schema, SQL, source paths or credentials in ${environment}`, async () => {
            const { stdout } = await execute(process.execPath, [fileURLToPath(probe)], {
                env: { NODE_ENV: environment },
                timeout: 15_000,
            })
            const result = JSON.parse(stdout)

            for (const response of result.responses.slice(0, 2)) {
                assert.equal(response.status, 500)
                assert.deepEqual(response.body, {
                    success: false,
                    code: 'INTERNAL_ERROR',
                    message: 'Algo falló en el servidor. Intenta de nuevo.',
                })
                assert.equal(response.requestId, 'qa-schema-error-request')
            }

            const diagnostic = result.diagnostics.find((entry: Record<string, unknown>) => entry.errorCode === 'P2022')

            assert.equal(diagnostic?.requestId, 'qa-schema-error-request')
            assert.equal(diagnostic?.errorName, 'PrismaClientKnownRequestError')
            assert.equal(diagnostic?.errorCode, 'P2022')
            assert.equal(typeof diagnostic?.stack, 'string')
            assert.equal(result.diagnostics.some((entry: Record<string, unknown>) => entry.errorName === 'Error'), true)

            const [validation, email, busy] = result.responses.slice(2)

            assert.equal(validation.status, 422)
            assert.deepEqual(validation.body, {
                success: false,
                code: 'VALIDATION_ERROR',
                errors: [{ field: 'email', message: 'El correo no es válido.' }],
                message: 'Revisa los datos enviados.',
            })
            assert.equal(email.status, 503)
            assert.equal(email.retryAfter, '5')
            assert.deepEqual(email.body, {
                success: false,
                code: 'EMAIL_DELIVERY_FAILED',
                message: 'No pudimos enviar el correo en este momento. Intenta de nuevo en unos minutos.',
            })
            assert.equal(busy.status, 503)
            assert.equal(busy.retryAfter, '2')
            assert.deepEqual(busy.body, {
                success: false,
                code: 'DB_BUSY',
                message: 'Otra operación está usando estos datos. Intenta de nuevo en unos segundos.',
            })
        })
    }
})
