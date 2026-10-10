import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { allowedTestHosts, assertSafeTestDatabaseUrl } from './test-database.ts'

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))

// Antes de la suite: confirma que el destino es una base de prueba, aplica las migraciones con
// `prisma migrate deploy` (las mismas que producción) y limpia restos de ejecuciones anteriores.
export async function globalSetup() {
    const url = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, allowedTestHosts()).toString()
    const migrate = spawnSync(process.execPath, [join(backendRoot, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
        cwd: backendRoot,
        encoding: 'utf8',
        env: {
            ...process.env,
            DATABASE_URL: url,
            DIRECT_URL: url,
            DOTENV_CONFIG_PATH: 'test/support/.env.none',
        },
    })

    if (migrate.status !== 0) {
        throw new Error(`prisma migrate deploy falló en la base de prueba:\n${migrate.stdout}\n${migrate.stderr}`)
    }

    const client = new pg.Client({ connectionString: url })

    await client.connect()
    await client.query(`DELETE FROM "users" WHERE "email" LIKE '%@fintrack.test'`)
    await client.query('DELETE FROM "rate_limit_buckets"')
    await client.end()
}
