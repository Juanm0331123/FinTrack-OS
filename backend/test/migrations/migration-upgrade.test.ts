import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'
import pg from 'pg'
import { allowedTestHosts, assertSafeTestDatabaseUrl } from '../support/test-database.ts'

// Migraciones contra bases temporales propias en el servidor de prueba. Nunca toca la base
// indicada en .env. Cada base creada aquí se elimina al final, aunque la prueba falle.

const backendRoot = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/')
const serverUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, allowedTestHosts())
const PRISMA_CLI = join(backendRoot, 'node_modules/prisma/build/index.js')
const BASELINE_MIGRATIONS = ['0_init', '20261007000000_debt_strategy', '20261007010000_pocket_spends']
const createdDatabases: string[] = []
const temporaryDirectories: string[] = []

function databaseUrl(name: string) {
    const url = new URL(serverUrl)

    url.pathname = `/${name}`

    return url.toString()
}

async function adminQuery(sql: string) {
    const client = new pg.Client({ connectionString: serverUrl.toString() })

    await client.connect()

    try {
        await client.query(sql)
    } finally {
        await client.end()
    }
}

async function createDatabase() {
    const name = `fintrack_test_mig_${randomBytes(4).toString('hex')}`

    await adminQuery(`CREATE DATABASE "${name}"`)
    createdDatabases.push(name)

    return databaseUrl(name)
}

function prismaCli(args: string[], url: string, configPath?: string) {
    return spawnSync(process.execPath, [PRISMA_CLI, ...args, ...(configPath ? ['--config', configPath] : [])], {
        cwd: backendRoot,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, DOTENV_CONFIG_PATH: 'test/support/.env.none' },
    })
}

// Config de Prisma que solo conoce las migraciones del esquema anterior.
function baselineConfig() {
    const directory = join(backendRoot, '.tmp', `migrations-${randomBytes(4).toString('hex')}`).replace(/\\/g, '/')
    const migrations = `${directory}/migrations`

    temporaryDirectories.push(directory)
    mkdirSync(migrations, { recursive: true })
    cpSync(join(backendRoot, 'prisma/migrations/migration_lock.toml'), `${migrations}/migration_lock.toml`)

    for (const migration of BASELINE_MIGRATIONS) {
        cpSync(join(backendRoot, 'prisma/migrations', migration), `${migrations}/${migration}`, { recursive: true })
    }

    writeFileSync(
        `${directory}/prisma.config.ts`,
        `import { defineConfig } from 'prisma/config'\nexport default defineConfig({ schema: '${backendRoot}prisma/schema.prisma', migrations: { path: '${migrations}' }, datasource: { url: process.env.DIRECT_URL! } })\n`,
    )

    return `${directory}/prisma.config.ts`
}

async function query<T extends pg.QueryResultRow>(url: string, sql: string) {
    const client = new pg.Client({ connectionString: url })

    await client.connect()

    try {
        return (await client.query<T>(sql)).rows
    } finally {
        await client.end()
    }
}

after(async () => {
    for (const name of createdDatabases) {
        await adminQuery(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    }

    for (const directory of temporaryDirectories) {
        rmSync(directory, { force: true, recursive: true })
    }
})

describe('migrations', () => {
    it('build a fresh database that matches the Prisma schema exactly', async () => {
        const url = await createDatabase()
        const deploy = prismaCli(['migrate', 'deploy'], url)

        assert.equal(deploy.status, 0, deploy.stderr)

        const diff = prismaCli(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], url)

        assert.equal(diff.status, 0, `schema drift:\n${diff.stdout}`)
    })

    it('upgrade the previous schema with representative data, keeping every row and association', async () => {
        const url = await createDatabase()

        assert.equal(prismaCli(['migrate', 'deploy'], url, baselineConfig()).status, 0)
        await query(url, readFileSync(join(backendRoot, 'test/migrations/baseline-seed.sql'), 'utf8'))

        const upgrade = prismaCli(['migrate', 'deploy'], url)

        assert.equal(upgrade.status, 0, upgrade.stderr)

        const accounts = await query<{ id: string; name: string; name_key: string }>(
            url,
            `SELECT id, name, name_key FROM money_accounts WHERE user_id = '00000000-0000-4000-8000-000000000001' ORDER BY created_at`,
        )

        assert.deepEqual(
            accounts.map((account) => account.name),
            ['Banco', 'banco (3)', 'BANCO (4)', 'banco (2)'],
            'duplicates are renamed, never deleted, avoiding names already taken',
        )

        const entries = await query<{ account_id: string; debt_id: string | null }>(url, 'SELECT account_id, debt_id FROM month_entries ORDER BY id')

        assert.deepEqual(entries, [
            { account_id: '00000000-0000-4000-8000-000000000202', debt_id: null },
            { account_id: '00000000-0000-4000-8000-000000000201', debt_id: '00000000-0000-4000-8000-000000000301' },
        ])

        const sessions = await query<{ device_name: string | null; id: string; revoked: boolean }>(
            url,
            'SELECT id, device_name, revoked_at IS NOT NULL AS revoked FROM auth_sessions ORDER BY id',
        )

        assert.deepEqual(sessions, [
            { device_name: 'web', id: '00000000-0000-4000-8000-000000000101', revoked: false },
            { device_name: null, id: '00000000-0000-4000-8000-000000000102', revoked: true },
        ])
        assert.equal((await query(url, 'SELECT 1 FROM pocket_spends')).length, 1)
        assert.equal(prismaCli(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], url).status, 0)
    })

    it('stop without changing anything when existing rows have inconsistent ownership', async () => {
        const url = await createDatabase()

        assert.equal(prismaCli(['migrate', 'deploy'], url, baselineConfig()).status, 0)
        await query(url, readFileSync(join(backendRoot, 'test/migrations/baseline-seed.sql'), 'utf8'))
        await query(
            url,
            `INSERT INTO month_entries (id, sheet_id, user_id, concept, updated_at)
             VALUES ('00000000-0000-4000-8000-000000000599', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000002', 'Ajena', NOW())`,
        )

        const upgrade = prismaCli(['migrate', 'deploy'], url)

        assert.notEqual(upgrade.status, 0)
        assert.match(`${upgrade.stdout}${upgrade.stderr}`, /Ownership inconsistente/)

        const tables = await query<{ table_name: string }>(
            url,
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_sessions'`,
        )
        const accountNames = await query<{ name: string }>(url, 'SELECT name FROM money_accounts ORDER BY created_at')

        assert.equal(tables.length, 0, 'no partial schema change')
        assert.ok(accountNames.some((row) => row.name === 'banco'), 'no data was rewritten')
    })

    it('ship every migration folder in this suite’s baseline plus the remediations', () => {
        const folders = readdirSync(join(backendRoot, 'prisma/migrations')).filter((name) => !name.endsWith('.toml'))

        assert.deepEqual(folders, [...BASELINE_MIGRATIONS, '20261009000000_qa_remediation', '20261010000000_credential_binding', '20261010010000_operation_fingerprint'])
    })
})
