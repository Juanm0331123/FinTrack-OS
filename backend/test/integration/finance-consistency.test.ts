import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import {
    createUser,
    deleteUsers,
    login,
    prisma,
    startApi,
    stopDatabase,
    type TestApi,
    type TestClient,
} from '../support/harness.ts'

// Regresiones de la revisión independiente (RDATA-01 … RDATA-08): idempotencia, cuotas y
// decisiones tomadas sobre el estado actual, contra la API y PostgreSQL reales. Los volúmenes
// cercanos a las cuotas se siembran directamente en la base de prueba para no tardar minutos.
const { applyWorkbookImport, planWorkbookImport, WorkbookImportError } = await import('../../src/modules/finance/workbook-import.ts')
const { FINANCE_LIMITS } = await import('../../src/modules/finance/finance.service.ts')

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

type Session = { client: TestClient; token: string; userId: string }

async function owner(): Promise<Session> {
    const user = await createUser()
    const client = api.client()

    createdUsers.push(user.id)

    return { client, token: await login(client, user), userId: user.id }
}

function as(session: Session) {
    return {
        get: (path: string) => session.client.get(`/api/finance${path}`, { token: session.token }),
        patch: (path: string, body: unknown) => session.client.patch(`/api/finance${path}`, body, { token: session.token }),
        post: (path: string, body?: unknown) => session.client.post(`/api/finance${path}`, body, { token: session.token }),
    }
}

function months(count: number, startYear = 2030) {
    return Array.from({ length: count }, (_, index) => {
        const year = startYear + Math.floor(index / 12)
        const month = String((index % 12) + 1).padStart(2, '0')

        return `${year}-${month}`
    })
}

async function seedSheets(userId: string, yearMonths: string[]) {
    await prisma.monthSheet.createMany({ data: yearMonths.map((yearMonth) => ({ userId, yearMonth })) })
}

async function seedEntries(userId: string, yearMonth: string, count: number, category: 'OTHER' | 'POCKET' = 'OTHER') {
    const sheet = await prisma.monthSheet.upsert({
        create: { userId, yearMonth },
        select: { id: true },
        update: {},
        where: { userId_yearMonth: { userId, yearMonth } },
    })

    await prisma.monthEntry.createMany({
        data: Array.from({ length: count }, (_, index) => ({
            amount: 1000,
            category,
            concept: `Fila ${index + 1}`,
            sheetId: sheet.id,
            sortOrder: index,
            userId,
        })),
    })

    return sheet.id
}

function statuses(responses: Array<{ status: number }>) {
    return responses.map((response) => response.status).sort()
}

describe('operation ids only replay the same action (RDATA-01)', () => {
    it('rejects a copy that reuses the key of a sheet creation', async () => {
        const session = await owner()
        const key = randomUUID()

        assert.equal((await as(session).post('/sheets', { copyFrom: 'NONE', operationId: key, yearMonth: '2027-10' })).status, 201)

        const copy = await as(session).post('/sheets/2027-10/copy-previous', { operationId: key })

        assert.equal(copy.status, 409)
        assert.equal(copy.body.code, 'IDEMPOTENCY_CONFLICT')
    })

    it('rejects copying another month with a key already used for a copy', async () => {
        const session = await owner()
        const key = randomUUID()

        await seedEntries(session.userId, '2027-09', 2)
        await seedSheets(session.userId, ['2027-10', '2027-11'])

        const first = await as(session).post('/sheets/2027-10/copy-previous', { operationId: key })
        const reused = await as(session).post('/sheets/2027-11/copy-previous', { operationId: key })

        assert.equal(first.status, 200)
        assert.equal(first.body.data.entries.length, 2)
        assert.equal(reused.status, 409)
        assert.equal(reused.body.code, 'IDEMPOTENCY_CONFLICT')
        assert.equal(await prisma.monthEntry.count({ where: { sheet: { yearMonth: '2027-11' }, userId: session.userId } }), 0)
    })

    it('rejects a sheet creation retried with a different copy source and replays the identical one', async () => {
        const session = await owner()
        const key = randomUUID()

        await seedEntries(session.userId, '2027-11', 1)
        assert.equal((await as(session).post('/sheets', { copyFrom: 'NONE', operationId: key, yearMonth: '2027-12' })).status, 201)

        const changed = await as(session).post('/sheets', { copyFrom: 'PREVIOUS', operationId: key, yearMonth: '2027-12' })
        const identical = await as(session).post('/sheets', { copyFrom: 'NONE', operationId: key, yearMonth: '2027-12' })

        assert.equal(changed.status, 409)
        assert.equal(changed.body.code, 'IDEMPOTENCY_CONFLICT')
        assert.equal(identical.status, 200)
    })
})

describe('a failed copy does not consume its operation id (RDATA-02)', () => {
    it('runs the retry once the previous month exists', async () => {
        const session = await owner()
        const key = randomUUID()

        await seedSheets(session.userId, ['2031-01'])

        const failed = await as(session).post('/sheets/2031-01/copy-previous', { operationId: key })

        assert.equal(failed.status, 404)
        assert.equal(await prisma.financeOperation.count({ where: { key, userId: session.userId } }), 0)

        await seedEntries(session.userId, '2030-12', 1)

        const retried = await as(session).post('/sheets/2031-01/copy-previous', { operationId: key })

        assert.equal(retried.status, 200)
        assert.equal(retried.body.data.entries.length, 1)
    })
})

describe('quotas hold on every write path, including copies, imports and concurrency (RDATA-03)', () => {
    it('does not let repeated copies push a month past the row limit', async () => {
        const session = await owner()

        await seedEntries(session.userId, '2027-01', FINANCE_LIMITS.entriesPerSheet)
        await seedSheets(session.userId, ['2027-02'])

        const first = await as(session).post('/sheets/2027-02/copy-previous', { operationId: randomUUID() })
        const second = await as(session).post('/sheets/2027-02/copy-previous', { operationId: randomUUID() })

        assert.equal(first.status, 200)
        assert.equal(second.status, 409)
        assert.equal(second.body.code, 'LIMIT_REACHED')
        assert.equal(await prisma.monthEntry.count({ where: { sheet: { yearMonth: '2027-02' }, userId: session.userId } }), FINANCE_LIMITS.entriesPerSheet)
    })

    it('keeps the row limit under concurrent creations', async () => {
        const session = await owner()

        await seedEntries(session.userId, '2027-03', FINANCE_LIMITS.entriesPerSheet - 1)

        const responses = await Promise.all(
            [1, 2, 3, 4].map((index) => as(session).post('/sheets/2027-03/entries', { concept: `Paralela ${index}` })),
        )

        assert.deepEqual(statuses(responses), [201, 409, 409, 409])
        assert.equal(await prisma.monthEntry.count({ where: { userId: session.userId } }), FINANCE_LIMITS.entriesPerSheet)
    })

    it('keeps the month limit under concurrent creations', async () => {
        const session = await owner()

        await seedSheets(session.userId, months(FINANCE_LIMITS.sheets - 2))

        const responses = await Promise.all(
            ['2099-01', '2099-02', '2099-03', '2099-04'].map((yearMonth) => as(session).post('/sheets', { yearMonth })),
        )

        assert.deepEqual(statuses(responses), [201, 201, 409, 409])
        assert.equal(await prisma.monthSheet.count({ where: { userId: session.userId } }), FINANCE_LIMITS.sheets)
    })

    it('keeps the account, debt and spend limits under concurrent creations', async () => {
        const session = await owner()

        // La primera lectura crea la cuenta por defecto; con ella quedan dos cupos libres.
        await as(session).get('/workbook')
        await prisma.moneyAccount.createMany({
            data: Array.from({ length: FINANCE_LIMITS.accounts - 3 }, (_, index) => ({
                name: `Cuenta ${index}`,
                nameKey: `cuenta ${index}`,
                sortOrder: index + 1,
                userId: session.userId,
            })),
        })
        await prisma.debt.createMany({
            data: Array.from({ length: FINANCE_LIMITS.debts - 1 }, (_, index) => ({ name: `Deuda ${index}`, sortOrder: index, userId: session.userId })),
        })

        const pocketSheet = await seedEntries(session.userId, '2027-04', 1, 'POCKET')
        const pocket = await prisma.monthEntry.findFirstOrThrow({ select: { id: true }, where: { sheetId: pocketSheet } })

        await prisma.pocketSpend.createMany({
            data: Array.from({ length: FINANCE_LIMITS.spendsPerEntry - 1 }, () => ({
                amount: 10,
                entryId: pocket.id,
                spentOn: new Date('2027-04-10T00:00:00.000Z'),
                userId: session.userId,
            })),
        })

        const [accounts, debts, spends] = await Promise.all([
            Promise.all([1, 2, 3, 4].map((index) => as(session).post('/accounts', { name: `Nueva ${index}` }))),
            Promise.all([1, 2, 3].map((index) => as(session).post('/debts', { name: `Nueva deuda ${index}` }))),
            Promise.all([1, 2, 3].map(() => as(session).post(`/entries/${pocket.id}/spends`, { amount: 10, spentOn: '2027-04-11' }))),
        ])

        assert.deepEqual(statuses(accounts), [201, 201, 409, 409])
        assert.deepEqual(statuses(debts), [201, 409, 409])
        assert.deepEqual(statuses(spends), [201, 409, 409])
        assert.equal(await prisma.moneyAccount.count({ where: { userId: session.userId } }), FINANCE_LIMITS.accounts)
        assert.equal(await prisma.debt.count({ where: { userId: session.userId } }), FINANCE_LIMITS.debts)
        assert.equal(await prisma.pocketSpend.count({ where: { entryId: pocket.id } }), FINANCE_LIMITS.spendsPerEntry)
    })

    it('rejects an import whose final state would exceed the month limit', async () => {
        const session = await owner()

        await seedSheets(session.userId, months(FINANCE_LIMITS.sheets))

        const workbook = importFile('2098-01')

        await assert.rejects(planWorkbookImport(prisma, session.userId, workbook, { replace: false }), WorkbookImportError)
        await assert.rejects(applyWorkbookImport(session.userId, workbook, { replace: false }), WorkbookImportError)
        assert.equal(await prisma.monthSheet.count({ where: { userId: session.userId } }), FINANCE_LIMITS.sheets)
    })
})

describe('category changes decide on the current state of the row (RDATA-04)', () => {
    it('refuses to leave a pocket that gained spends after the request read the row', async () => {
        const session = await owner()
        const sheetId = await seedEntries(session.userId, '2027-05', 1)
        const row = await prisma.monthEntry.findFirstOrThrow({ select: { id: true }, where: { sheetId } })

        await prisma.monthEntry.update({ data: { category: 'FIXED' }, where: { id: row.id } })

        const holder = new pg.Client({ connectionString: process.env.DATABASE_URL })

        await holder.connect()

        try {
            await holder.query('BEGIN')
            await holder.query('SELECT "id" FROM "month_entries" WHERE "id" = $1 FOR UPDATE', [row.id])

            const patch = as(session).patch(`/entries/${row.id}`, { category: 'OTHER' })

            // La petición queda esperando el bloqueo de la fila (con la lectura FIXED ya hecha).
            await waitForLockWaiter(holder)
            await holder.query(`UPDATE "month_entries" SET "category" = 'POCKET' WHERE "id" = $1`, [row.id])
            await holder.query(
                `INSERT INTO "pocket_spends" ("id", "entry_id", "user_id", "amount", "spent_on", "updated_at") VALUES (gen_random_uuid(), $1, $2, 5000, '2027-05-02', now())`,
                [row.id, session.userId],
            )
            await holder.query('COMMIT')

            const response = await patch

            assert.equal(response.status, 409)
            assert.equal(response.body.code, 'POCKET_HAS_SPENDS')
            assert.equal((await prisma.monthEntry.findUniqueOrThrow({ where: { id: row.id } })).category, 'POCKET')
        } finally {
            await holder.end()
        }
    })
})

async function waitForLockWaiter(client: pg.Client) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const { rows } = await client.query<{ waiting: number }>(
            `SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`,
        )

        if (rows[0].waiting > 0) {
            return
        }

        await new Promise((resolve) => setTimeout(resolve, 50))
    }

    throw new Error('the request never waited for the row lock')
}

function importFile(...yearMonths: string[]) {
    return {
        accounts: ['Banco'],
        debts: [],
        settings: { benefitsRate: 0.08, cushionAmount: 0, redirectDebtOverpayments: false },
        sheets: yearMonths.map((yearMonth) => ({
            benefitsOverride: null,
            disabilityIncome: null,
            entries: [{ account: 'Banco', amount: 1000, category: 'OTHER' as const, concept: 'Importada', debtKey: null, dueDay: null, note: null }],
            leftoverDestination: 'AVAILABLE' as const,
            otherDeductions: 0,
            previousLeftover: 0,
            salary: 0,
            transportAllowance: 0,
            yearMonth,
        })),
    }
}

describe('an import without --replace never deletes a month (RDATA-05)', () => {
    it('fails instead of replacing a month created between the plan and the write', async () => {
        const session = await owner()
        const workbook = importFile('2027-06')
        const plan = await planWorkbookImport(prisma, session.userId, workbook, { replace: false })

        assert.deepEqual(plan.sheetsToReplace, [])

        // El usuario crea el mismo mes mientras el operador revisa el plan.
        await seedEntries(session.userId, '2027-06', 1)

        await assert.rejects(applyWorkbookImport(session.userId, workbook, { replace: false }), WorkbookImportError)

        const rows = await prisma.monthEntry.findMany({ select: { concept: true }, where: { userId: session.userId } })

        assert.deepEqual(rows, [{ concept: 'Fila 1' }])
    })

    it('replaces the month only when --replace was given', async () => {
        const session = await owner()

        await seedEntries(session.userId, '2027-07', 1)
        await applyWorkbookImport(session.userId, importFile('2027-07'), { replace: true })

        const rows = await prisma.monthEntry.findMany({ select: { concept: true }, where: { userId: session.userId } })

        assert.deepEqual(rows, [{ concept: 'Importada' }])
    })
})

describe('the last allowed month can still be retried (RDATA-06)', () => {
    it('replays the creation of month 240 with the same operation id', async () => {
        const session = await owner()
        const key = randomUUID()

        await seedSheets(session.userId, months(FINANCE_LIMITS.sheets - 1))

        const created = await as(session).post('/sheets', { operationId: key, yearMonth: '2099-12' })
        const retried = await as(session).post('/sheets', { operationId: key, yearMonth: '2099-12' })

        assert.equal(created.status, 201)
        assert.equal(retried.status, 200)
        assert.equal(retried.body.data.id, created.body.data.id)
    })
})

describe('rates are normalized to the stored precision (RDATA-07)', () => {
    it('replays an identical debt whose rates have more decimals than the column', async () => {
        const session = await owner()
        const body = { id: randomUUID(), insuranceRate: 0.0012345678, monthlyRate: 0.1234567, name: 'Tarjeta', sharedPercent: 50.555 }
        const created = await as(session).post('/debts', body)
        const retried = await as(session).post('/debts', body)

        assert.equal(created.status, 201)
        assert.equal(retried.status, 200)
        assert.equal(created.body.data.monthlyRate, 0.123457)
        assert.equal(created.body.data.insuranceRate, 0.001235)
        assert.equal(created.body.data.sharedPercent, 50.56)
    })

    it('stores the benefits rate with four decimals', async () => {
        const session = await owner()
        const updated = await as(session).patch('/settings', { benefitsRate: 0.123456 })

        assert.equal(updated.status, 200)
        assert.equal(updated.body.data.benefitsRate, 0.1235)
    })
})

describe('concurrent retries of an account creation replay it (RDATA-08)', () => {
    it('answers one 201 and replays the rest for the same id and name', async () => {
        const session = await owner()
        const body = { id: randomUUID(), name: 'Ahorros paralelos' }
        const responses = await Promise.all([1, 2, 3].map(() => as(session).post('/accounts', body)))

        assert.deepEqual(statuses(responses), [200, 200, 201])
        assert.ok(responses.every((response) => response.body.data.id === body.id))
    })
})
