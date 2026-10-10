import pg from 'pg'

// Retención de datos de autenticación y control (programado desde GitHub Actions):
// - sesiones vencidas o revocadas hace más de AUTH_RETENTION_DAYS (sus refresh tokens caen en
//   cascada), refresh tokens y códigos vencidos hace más de ese plazo;
// - se conserva el último marcador de verificación del sello vigente de cada usuario pendiente:
//   su requisito de contraseña permite reenviar un código utilizable incluso tras la retención.
//   No extiende la validez del código; al activar la cuenta o cambiar el sello deja de conservarse;
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
    authTokens: `DELETE FROM auth_tokens
        WHERE expires_at < $1 AND id NOT IN (
            SELECT DISTINCT ON (token.user_id) token.id
            FROM auth_tokens AS token
            JOIN users AS owner ON owner.id = token.user_id
            WHERE owner.status = 'PENDING_VERIFICATION'
                AND token.type = 'EMAIL_VERIFICATION'
                AND token.token_salt IS NOT NULL
                AND token.security_stamp = owner.security_stamp
            ORDER BY token.user_id, token.created_at DESC, token.id DESC
        )`,
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
