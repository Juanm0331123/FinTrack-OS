import pg from 'pg'

// Retención de datos de autenticación y control (programado desde GitHub Actions):
// - sesiones vencidas o revocadas hace más de AUTH_RETENTION_DAYS (sus refresh tokens caen en
//   cascada), refresh tokens y códigos vencidos hace más de ese plazo;
// - operaciones de idempotencia con más de 7 días y contadores de rate limit vencidos hace 1 h.
// Solo necesita DATABASE_URL (o DIRECT_URL); no carga la configuración de la API.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
const retentionDays = Number(process.env.AUTH_RETENTION_DAYS ?? 30)

if (!connectionString) {
    console.error('Define DATABASE_URL o DIRECT_URL.')
    process.exit(1)
}

if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    console.error('AUTH_RETENTION_DAYS debe ser un entero positivo.')
    process.exit(1)
}

const STATEMENTS: Record<string, string> = {
    sessions: `DELETE FROM auth_sessions
        WHERE absolute_expires_at < $1 OR idle_expires_at < $1 OR revoked_at < $1`,
    refreshTokens: 'DELETE FROM refresh_tokens WHERE expires_at < $1',
    authTokens: 'DELETE FROM auth_tokens WHERE expires_at < $1',
    financeOperations: `DELETE FROM finance_operations WHERE created_at < (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'`,
    rateLimitBuckets: `DELETE FROM rate_limit_buckets WHERE reset_at < (now() AT TIME ZONE 'UTC') - INTERVAL '1 hour'`,
}

async function main() {
    const client = new pg.Client({ application_name: 'fintrack-cleanup', connectionString })
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const removed: Record<string, number> = {}

    await client.connect()

    try {
        await client.query('BEGIN')

        for (const [name, sql] of Object.entries(STATEMENTS)) {
            const result = await client.query(sql, sql.includes('$1') ? [cutoff] : [])

            removed[name] = result.rowCount ?? 0
        }

        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        await client.end()
    }

    console.log(JSON.stringify({ removed, retentionDays }))
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
})
