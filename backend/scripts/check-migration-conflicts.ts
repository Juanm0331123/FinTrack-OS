import pg from 'pg'

// Verificación previa de solo lectura para la migración 20261009000000_qa_remediation.
// Ejecutar contra la base destino ANTES de `prisma migrate deploy`:
//   node --env-file-if-exists=.env scripts/check-migration-conflicts.ts
// Reporta conteos (nunca datos personales) de:
// - filas cuyo dueño no coincide con el de su hoja, cuenta, deuda o fila padre (la migración se
//   detiene si existen: hay que corregirlas a mano);
// - nombres de cuenta repetidos sin distinguir mayúsculas (la migración los renombra con " (n)").
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
    console.error('Define DIRECT_URL o DATABASE_URL.')
    process.exit(1)
}

const client = new pg.Client({ application_name: 'fintrack-migration-check', connectionString })

const CHECKS: Record<string, string> = {
    duplicatedAccountNames: `SELECT COUNT(*)::int AS count FROM (
        SELECT 1 FROM money_accounts GROUP BY user_id, lower(normalize(btrim(name), NFC)) HAVING COUNT(*) > 1) duplicated`,
    entriesWithForeignAccount: `SELECT COUNT(*)::int AS count FROM month_entries e
        JOIN money_accounts a ON a.id = e.account_id WHERE a.user_id <> e.user_id`,
    entriesWithForeignDebt: `SELECT COUNT(*)::int AS count FROM month_entries e
        JOIN debts d ON d.id = e.debt_id WHERE d.user_id <> e.user_id`,
    entriesWithForeignSheet: `SELECT COUNT(*)::int AS count FROM month_entries e
        JOIN month_sheets s ON s.id = e.sheet_id WHERE s.user_id <> e.user_id`,
    spendsWithForeignEntry: `SELECT COUNT(*)::int AS count FROM pocket_spends p
        JOIN month_entries e ON e.id = p.entry_id WHERE e.user_id <> p.user_id`,
}

async function main() {
    await client.connect()
    await client.query('BEGIN TRANSACTION READ ONLY')

    const results: Record<string, number> = {}

    for (const [name, sql] of Object.entries(CHECKS)) {
        results[name] = (await client.query<{ count: number }>(sql)).rows[0].count
    }

    await client.query('ROLLBACK')

    const blocking =
        results.entriesWithForeignAccount +
        results.entriesWithForeignDebt +
        results.entriesWithForeignSheet +
        results.spendsWithForeignEntry

    console.log(JSON.stringify({ ...results, blocking }, null, 2))

    if (blocking > 0) {
        console.error('Hay filas con ownership inconsistente: la migración se detendrá hasta corregirlas.')
        process.exitCode = 2
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(() => client.end())
