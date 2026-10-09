import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assertSafeTestDatabaseUrl } from '../support/test-database.ts'

describe('assertSafeTestDatabaseUrl', () => {
    it('accepts a local database named for tests', () => {
        assert.equal(assertSafeTestDatabaseUrl('postgresql://u:p@127.0.0.1:55433/fintrack_test').hostname, '127.0.0.1')
    })

    it('refuses the Neon production host even with a test-looking name', () => {
        assert.throws(
            () => assertSafeTestDatabaseUrl('postgresql://u:p@ep-x-pooler.us-east-1.aws.neon.tech/fintrack_test'),
            /no es local/,
        )
    })

    it('refuses a local database whose name does not say test', () => {
        assert.throws(() => assertSafeTestDatabaseUrl('postgresql://u:p@localhost:5432/neondb'), /no parece de prueba/)
    })

    it('accepts an explicitly allowed CI host', () => {
        assert.equal(assertSafeTestDatabaseUrl('postgresql://u:p@postgres:5432/fintrack_test', ['postgres']).hostname, 'postgres')
    })

    it('refuses a missing or non-postgres URL', () => {
        assert.throws(() => assertSafeTestDatabaseUrl(undefined), /TEST_DATABASE_URL/)
        assert.throws(() => assertSafeTestDatabaseUrl('mysql://u:p@localhost/fintrack_test'), /postgresql/)
    })
})
