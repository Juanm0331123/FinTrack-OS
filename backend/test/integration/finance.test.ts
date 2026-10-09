import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import { z } from 'zod'
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

async function owner(role: 'ADMIN' | 'USER' = 'USER'): Promise<Session> {
    const user = await createUser({ role })
    const client = api.client()

    createdUsers.push(user.id)

    return { client, token: await login(client, user), userId: user.id }
}

function as(session: Session) {
    return {
        delete: (path: string) => session.client.delete(`/api/finance${path}`, { token: session.token }),
        get: (path: string) => session.client.get(`/api/finance${path}`, { token: session.token }),
        patch: (path: string, body: unknown) => session.client.patch(`/api/finance${path}`, body, { token: session.token }),
        post: (path: string, body?: unknown) => session.client.post(`/api/finance${path}`, body, { token: session.token }),
    }
}

// Contrato que consume el frontend (frontend/src/modules/finance/domain/types.ts), escrito
// aparte del productor para detectar cambios incompatibles.
const consumerSpend = z.object({ amount: z.number(), id: z.string(), note: z.string().nullable(), spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict()
const consumerEntry = z
    .object({
        accountId: z.string().nullable(),
        amount: z.number().nullable(),
        category: z.enum(['SUBSCRIPTION', 'FIXED', 'POCKET', 'SAVINGS', 'DEBT', 'OTHER']),
        concept: z.string(),
        debtId: z.string().nullable(),
        dueDay: z.number().nullable(),
        id: z.string(),
        isPaid: z.boolean(),
        note: z.string().nullable(),
        sortOrder: z.number(),
        spends: z.array(consumerSpend),
    })
    .strict()
const consumerWorkbook = z
    .object({
        accounts: z.array(z.object({ archived: z.boolean(), id: z.string(), name: z.string(), sortOrder: z.number() }).strict()),
        debts: z.array(z.object({ id: z.string(), name: z.string(), totalBalance: z.number() }).passthrough()),
        settings: z.object({ benefitsRate: z.number(), cushionAmount: z.number(), debtStrategy: z.string(), redirectDebtOverpayments: z.boolean() }).strict(),
        sheets: z.array(
            z
                .object({
                    benefitsOverride: z.number().nullable(),
                    disabilityIncome: z.number().nullable(),
                    entries: z.array(consumerEntry),
                    id: z.string(),
                    leftoverDestination: z.enum(['AVAILABLE', 'SAVINGS']),
                    notes: z.string().nullable(),
                    otherDeductions: z.number(),
                    previousLeftover: z.number(),
                    salary: z.number(),
                    transportAllowance: z.number(),
                    yearMonth: z.string(),
                })
                .strict(),
        ),
    })
    .strict()

describe('workbook initialisation (DATA-14) and contract', () => {
    it('answers concurrent first reads coherently, without conflicts or duplicated defaults', async () => {
        const session = await owner()
        const responses = await Promise.all(Array.from({ length: 8 }, () => as(session).get('/workbook')))

        assert.deepEqual(responses.map((response) => response.status), Array(8).fill(200))
        assert.equal(await prisma.financeSettings.count({ where: { userId: session.userId } }), 1)
        assert.equal(await prisma.moneyAccount.count({ where: { userId: session.userId } }), 1)
    })

    it('returns exactly the shape the frontend consumes', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const entry = await as(session).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'Mercado', amount: 400000 })

        await as(session).post(`/entries/${entry.body.data.id}/spends`, { amount: 25000, spentOn: '2026-10-03' })

        const workbook = await as(session).get('/workbook')
        const parsed = consumerWorkbook.safeParse(workbook.body.data)

        assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues))
    })
})

describe('idempotent creation (DATA-03)', () => {
    it('returns the same row for an equivalent retry and refuses to reuse an id in another month', async () => {
        const session = await owner()
        const id = randomUUID()
        const body = { amount: 120000, category: 'FIXED', concept: 'Internet', id }

        await as(session).post('/sheets', { yearMonth: '2026-10' })
        await as(session).post('/sheets', { yearMonth: '2026-11' })

        const created = await as(session).post('/sheets/2026-10/entries', body)
        const retried = await as(session).post('/sheets/2026-10/entries', body)
        const otherMonth = await as(session).post('/sheets/2026-11/entries', { ...body, concept: 'Otro' })
        const otherContent = await as(session).post('/sheets/2026-10/entries', { ...body, amount: 1 })

        assert.equal(created.status, 201)
        assert.equal(retried.status, 200)
        assert.equal(retried.headers.get('idempotent-replayed'), 'true')
        assert.deepEqual(retried.body.data, created.body.data)
        assert.equal(otherMonth.status, 409)
        assert.equal(otherMonth.body.code, 'IDEMPOTENCY_CONFLICT')
        assert.equal(otherContent.status, 409)
        assert.equal(await prisma.monthEntry.count({ where: { id } }), 1)
    })

    it('never returns another user’s row when its id is reused', async () => {
        const alice = await owner()
        const bob = await owner()
        const id = randomUUID()

        await as(alice).post('/sheets', { yearMonth: '2026-10' })
        await as(bob).post('/sheets', { yearMonth: '2026-10' })
        await as(alice).post('/sheets/2026-10/entries', { concept: 'Privado de Alice', id, amount: 777 })

        const reuse = await as(bob).post('/sheets/2026-10/entries', { concept: 'Privado de Alice', id, amount: 777 })

        assert.equal(reuse.status, 409)
        assert.doesNotMatch(reuse.text, /Privado de Alice|777/)
    })

    it('refuses to reuse a spend id in another pocket', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const pocketA = await as(session).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'A' })
        const pocketB = await as(session).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'B' })
        const spend = { amount: 1000, id: randomUUID(), spentOn: '2026-10-02' }

        assert.equal((await as(session).post(`/entries/${pocketA.body.data.id}/spends`, spend)).status, 201)
        assert.equal((await as(session).post(`/entries/${pocketA.body.data.id}/spends`, spend)).status, 200)
        assert.equal((await as(session).post(`/entries/${pocketB.body.data.id}/spends`, spend)).body.code, 'IDEMPOTENCY_CONFLICT')
    })

    it('resolves two simultaneous creations with the same id as one row', async () => {
        const session = await owner()
        const body = { amount: 50, concept: 'Concurrente', id: randomUUID() }

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const results = await Promise.all([1, 2, 3].map(() => as(session).post('/sheets/2026-10/entries', body)))

        assert.deepEqual(results.map((result) => result.status).sort(), [200, 200, 201])
        assert.equal(await prisma.monthEntry.count({ where: { id: body.id } }), 1)
    })
})

describe('money precision (DATA-04)', () => {
    it('stores and returns half cents rounded like Excel ROUND(x; 2), end to end', async () => {
        const session = await owner()
        const cases: Array<[number, number]> = [
            [1.005, 1.01],
            [2.675, 2.68],
            [0.125, 0.13],
            [1.0049999, 1],
            [999999999999.99, 999999999999.99],
        ]

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        for (const [input, expected] of cases) {
            const created = await as(session).post('/sheets/2026-10/entries', { amount: input, concept: `Monto ${input}` })
            const stored = await prisma.$queryRaw<Array<{ amount: string }>>`SELECT amount::text AS amount FROM month_entries WHERE id = ${created.body.data.id}::uuid`

            assert.equal(created.body.data.amount, expected, `response for ${input}`)
            assert.equal(Number(stored[0].amount), expected, `database value for ${input}`)
        }

        const workbook = await as(session).get('/workbook')
        const amounts = workbook.body.data.sheets[0].entries.map((entry: { amount: number }) => entry.amount)

        assert.deepEqual(amounts, cases.map(([, expected]) => expected))
    })

    it('rejects values that round past numeric(14, 2) or are negative', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        for (const amount of [999999999999.995, 1e15, -0.01]) {
            assert.equal((await as(session).post('/sheets/2026-10/entries', { amount, concept: 'Límite' })).status, 422)
        }
    })
})

describe('spend dates (DATA-05)', () => {
    it('accepts dates inside the sheet month and rejects other months on create and edit', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-02' })

        const pocket = await as(session).post('/sheets/2026-02/entries', { category: 'POCKET', concept: 'Bolsillo' })
        const path = `/entries/${pocket.body.data.id}/spends`

        assert.equal((await as(session).post(path, { amount: 10, spentOn: '2026-02-01' })).status, 201)
        assert.equal((await as(session).post(path, { amount: 10, spentOn: '2026-02-28' })).status, 201)

        for (const spentOn of ['2026-01-31', '2026-03-01', '2027-02-10']) {
            const response = await as(session).post(path, { amount: 10, spentOn })

            assert.equal(response.status, 422, spentOn)
            assert.match(response.body.errors[0].message, /2026-02/)
        }

        assert.equal((await as(session).post(path, { amount: 10, spentOn: '2026-02-30' })).status, 422, 'impossible date')

        const spend = await as(session).post(path, { amount: 10, spentOn: '2026-02-15' })

        assert.equal((await as(session).patch(`/spends/${spend.body.data.id}`, { spentOn: '2026-03-01' })).status, 422)
        assert.equal((await as(session).patch(`/spends/${spend.body.data.id}`, { spentOn: '2026-02-20' })).status, 200)
    })
})

describe('pocket conversion (DATA-06)', () => {
    it('refuses to turn a pocket with spends into another category and allows it once empty', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const pocket = await as(session).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'Mercado', amount: 300 })
        const spend = await as(session).post(`/entries/${pocket.body.data.id}/spends`, { amount: 100, spentOn: '2026-10-05' })
        const blocked = await as(session).patch(`/entries/${pocket.body.data.id}`, { category: 'FIXED' })

        assert.equal(blocked.status, 409)
        assert.equal(blocked.body.code, 'POCKET_HAS_SPENDS')
        assert.equal(await prisma.pocketSpend.count({ where: { entryId: pocket.body.data.id } }), 1, 'no spend was deleted')

        await as(session).delete(`/spends/${spend.body.data.id}`)

        const allowed = await as(session).patch(`/entries/${pocket.body.data.id}`, { category: 'FIXED' })

        assert.equal(allowed.status, 200)
        assert.equal(allowed.body.data.category, 'FIXED')
    })
})

describe('accounts (DATA-07, DATA-08)', () => {
    it('keeps account names unique ignoring case, even under concurrent creation', async () => {
        const session = await owner()
        const results = await Promise.all(['Banco', 'banco', 'BANCO'].map((name) => as(session).post('/accounts', { name })))

        assert.deepEqual(results.map((result) => result.status).sort(), [201, 409, 409])
        assert.equal(await prisma.moneyAccount.count({ where: { nameKey: 'banco', userId: session.userId } }), 1)
    })

    it('rejects renaming an account to an existing name with different case', async () => {
        const session = await owner()

        await as(session).post('/accounts', { name: 'Ahorro' })

        const other = await as(session).post('/accounts', { name: 'Diario' })
        const rename = await as(session).patch(`/accounts/${other.body.data.id}`, { name: 'AHORRO' })

        assert.equal(rename.status, 409)
        assert.equal(rename.body.code, 'ACCOUNT_NAME_TAKEN')
    })

    it('archives instead of deleting when an entry is inserted while the delete runs', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const account = await as(session).post('/accounts', { name: 'En uso' })
        const locker = new pg.Client({ connectionString: process.env.DATABASE_URL })
        const sheet = await prisma.monthSheet.findFirstOrThrow({ where: { userId: session.userId } })

        // Una transacción concurrente inserta una fila con la cuenta y aún no confirma.
        await locker.connect()
        await locker.query('BEGIN')
        await locker.query(
            `INSERT INTO month_entries (id, sheet_id, user_id, account_id, concept, updated_at) VALUES ($1, $2, $3, $4, 'Concurrente', NOW())`,
            [randomUUID(), sheet.id, session.userId, account.body.data.id],
        )

        const deletion = as(session).delete(`/accounts/${account.body.data.id}`)

        await new Promise((resolve) => setTimeout(resolve, 150))
        await locker.query('COMMIT')
        await locker.end()

        const result = await deletion

        assert.equal(result.status, 200)
        assert.equal(result.body.data.result, 'archived')
        assert.equal(await prisma.monthEntry.count({ where: { accountId: account.body.data.id } }), 1, 'the entry keeps its account')
    })

    it('deletes an unused account', async () => {
        const session = await owner()
        const account = await as(session).post('/accounts', { name: 'Sin uso' })
        const result = await as(session).delete(`/accounts/${account.body.data.id}`)

        assert.equal(result.body.data.result, 'deleted')
    })
})

describe('copying the previous month (DATA-09)', () => {
    async function preparePrevious(session: Session) {
        await as(session).post('/sheets', { yearMonth: '2026-09' })
        await as(session).patch('/sheets/2026-09', { salary: 3000000 })
        await as(session).post('/sheets/2026-09/entries', { amount: 100, concept: 'Arriendo' })
        await as(session).post('/sheets/2026-09/entries', { amount: 50, concept: 'Internet' })
        await as(session).post('/sheets', { yearMonth: '2026-10' })
    }

    it('does not overwrite a salary confirmed while the copy waited', async () => {
        const session = await owner()

        await preparePrevious(session)

        const locker = new pg.Client({ connectionString: process.env.DATABASE_URL })

        await locker.connect()
        await locker.query('BEGIN')
        await locker.query(`UPDATE month_sheets SET salary = 5000000 WHERE user_id = $1 AND year_month = '2026-10'`, [session.userId])

        const copy = as(session).post('/sheets/2026-10/copy-previous', {})

        await new Promise((resolve) => setTimeout(resolve, 150))
        await locker.query('COMMIT')
        await locker.end()

        const result = await copy

        assert.equal(result.status, 200)
        assert.equal(result.body.data.salary, 5000000, 'the confirmed salary survives')
        assert.equal(result.body.data.entries.length, 2)
    })

    it('treats a retried copy with the same operation id as one copy, and a new id as a new copy', async () => {
        const session = await owner()

        await preparePrevious(session)

        const operationId = randomUUID()
        const [first, retry] = await Promise.all([
            as(session).post('/sheets/2026-10/copy-previous', { operationId }),
            as(session).post('/sheets/2026-10/copy-previous', { operationId }),
        ])

        assert.equal(first.status, 200)
        assert.equal(retry.status, 200)
        assert.equal(await prisma.monthEntry.count({ where: { sheet: { yearMonth: '2026-10' }, userId: session.userId } }), 2)

        const intentional = await as(session).post('/sheets/2026-10/copy-previous', { operationId: randomUUID() })
        const orders = intentional.body.data.entries.map((entry: { sortOrder: number }) => entry.sortOrder)

        assert.equal(intentional.body.data.entries.length, 4)
        assert.equal(new Set(orders).size, 4, 'concurrent copies never share sort positions')
    })

    it('returns the created sheet when sheet creation is retried with the same operation id', async () => {
        const session = await owner()
        const operationId = randomUUID()
        const first = await as(session).post('/sheets', { copyFrom: 'NONE', operationId, yearMonth: '2026-12' })
        const retry = await as(session).post('/sheets', { copyFrom: 'NONE', operationId, yearMonth: '2026-12' })
        const fresh = await as(session).post('/sheets', { copyFrom: 'NONE', yearMonth: '2026-12' })

        assert.equal(first.status, 201)
        assert.equal(retry.status, 200)
        assert.equal(retry.body.data.id, first.body.data.id)
        assert.equal(fresh.status, 409)
    })
})

describe('ownership between users (two users and an admin)', () => {
    it('never reads, edits, deletes or copies another user’s financial data, and leaves it unchanged', async () => {
        const alice = await owner()
        const bob = await owner()
        const admin = await owner('ADMIN')

        await as(alice).post('/sheets', { yearMonth: '2026-10' })

        const entry = await as(alice).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'De Alice', amount: 10 })
        const spend = await as(alice).post(`/entries/${entry.body.data.id}/spends`, { amount: 1, spentOn: '2026-10-01' })
        const account = await as(alice).post('/accounts', { name: 'Cuenta Alice' })
        const debt = await as(alice).post('/debts', { name: 'Deuda Alice', totalBalance: 1000 })
        const before = await as(alice).get('/workbook')

        for (const intruder of [bob, admin]) {
            const attempts = [
                await as(intruder).patch(`/entries/${entry.body.data.id}`, { concept: 'hackeado' }),
                await as(intruder).delete(`/entries/${entry.body.data.id}`),
                await as(intruder).post(`/entries/${entry.body.data.id}/spends`, { amount: 1, spentOn: '2026-10-02' }),
                await as(intruder).patch(`/spends/${spend.body.data.id}`, { amount: 5 }),
                await as(intruder).delete(`/spends/${spend.body.data.id}`),
                await as(intruder).patch(`/accounts/${account.body.data.id}`, { name: 'x' }),
                await as(intruder).delete(`/accounts/${account.body.data.id}`),
                await as(intruder).patch(`/debts/${debt.body.data.id}`, { name: 'x' }),
                await as(intruder).delete(`/debts/${debt.body.data.id}`),
            ]

            assert.deepEqual(attempts.map((attempt) => attempt.status), Array(attempts.length).fill(404))

            await as(intruder).post('/sheets', { yearMonth: '2026-10' })

            const reference = await as(intruder).post('/sheets/2026-10/entries', {
                accountId: account.body.data.id,
                concept: 'Ref ajena',
                debtId: debt.body.data.id,
            })

            assert.equal(reference.status, 422)
            assert.doesNotMatch(JSON.stringify((await as(intruder).get('/workbook')).body), /De Alice|Cuenta Alice|Deuda Alice/)
        }

        assert.deepEqual((await as(alice).get('/workbook')).body, before.body)
    })

    it('lets only admins list users and blocks role escalation by regular users', async () => {
        const user = await owner()
        const admin = await owner('ADMIN')

        assert.equal((await user.client.get('/api/users', { token: user.token })).status, 403)
        assert.equal((await admin.client.get('/api/users', { token: admin.token })).status, 200)
        assert.equal((await user.client.get(`/api/users/${admin.userId}`, { token: user.token })).status, 403)
        assert.equal((await user.client.patch(`/api/users/${user.userId}`, { role: 'ADMIN' }, { token: user.token })).status, 403)
        assert.equal((await user.client.patch(`/api/users/${user.userId}`, { firstName: 'Nuevo' }, { token: user.token })).status, 200)
    })
})

describe('ownership enforced by the database (DATA-12)', () => {
    it('rejects rows that point to another user’s sheet, account, debt or entry, even bypassing the API', async () => {
        const alice = await owner()
        const bob = await owner()

        await as(alice).post('/sheets', { yearMonth: '2026-10' })
        await as(bob).post('/sheets', { yearMonth: '2026-10' })

        const aliceSheet = await prisma.monthSheet.findFirstOrThrow({ where: { userId: alice.userId } })
        const bobSheet = await prisma.monthSheet.findFirstOrThrow({ where: { userId: bob.userId } })
        const aliceAccount = await as(alice).post('/accounts', { name: 'Solo Alice' })
        const aliceDebt = await as(alice).post('/debts', { name: 'Solo Alice' })
        const aliceEntry = await as(alice).post('/sheets/2026-10/entries', { category: 'POCKET', concept: 'Alice' })
        const attempts = [
            prisma.monthEntry.create({ data: { concept: 'x', sheetId: aliceSheet.id, userId: bob.userId } }),
            prisma.monthEntry.create({ data: { accountId: aliceAccount.body.data.id, concept: 'x', sheetId: bobSheet.id, userId: bob.userId } }),
            prisma.monthEntry.create({ data: { concept: 'x', debtId: aliceDebt.body.data.id, sheetId: bobSheet.id, userId: bob.userId } }),
            prisma.pocketSpend.create({ data: { amount: 1, entryId: aliceEntry.body.data.id, spentOn: new Date('2026-10-01'), userId: bob.userId } }),
        ]

        for (const attempt of attempts) {
            await assert.rejects(attempt, (error: { code?: string }) => error.code === 'P2003')
        }
    })

    it('still unlinks entries when their debt is deleted (SET NULL), keeping the row', async () => {
        const session = await owner()

        await as(session).post('/sheets', { yearMonth: '2026-10' })

        const debt = await as(session).post('/debts', { name: 'Temporal' })
        const entry = await as(session).post('/sheets/2026-10/entries', { category: 'DEBT', concept: 'Cuota', debtId: debt.body.data.id })

        assert.equal((await as(session).delete(`/debts/${debt.body.data.id}`)).status, 200)
        assert.equal((await prisma.monthEntry.findUniqueOrThrow({ where: { id: entry.body.data.id } })).debtId, null)
    })
})

describe('payload and quotas (DATA-02)', () => {
    it('serves a representative multi-year workbook within a measured budget and supports period reads', async () => {
        const session = await owner()
        const yearMonths = Array.from({ length: 36 }, (_, index) => `${2024 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`)

        for (const yearMonth of yearMonths) {
            const sheet = await prisma.monthSheet.create({ data: { userId: session.userId, yearMonth }, select: { id: true } })

            await prisma.monthEntry.createMany({
                data: Array.from({ length: 30 }, (_, index) => ({
                    amount: 10000 + index,
                    category: index % 5 === 0 ? 'POCKET' : 'FIXED',
                    concept: `Concepto ${index}`,
                    sheetId: sheet.id,
                    sortOrder: index,
                    userId: session.userId,
                })),
            })
        }

        const startedAt = performance.now()
        const full = await as(session).get('/workbook')
        const elapsedMs = performance.now() - startedAt
        const period = await as(session).get('/workbook?from=2026-01&to=2026-12')

        assert.equal(full.status, 200)
        assert.equal(full.body.data.sheets.length, 36)
        assert.equal(period.body.data.sheets.length, 12)
        assert.ok(full.text.length < 500_000, `payload ${full.text.length} bytes for 1080 rows`)
        assert.ok(elapsedMs < 2000, `workbook took ${Math.round(elapsedMs)} ms locally`)
        assert.doesNotMatch(full.text, /userId|createdAt|updatedAt|nameKey/, 'internal fields are not serialised')
        assert.equal((await as(session).get('/workbook?from=2026-12&to=2026-01')).status, 422)
    })

    it('rejects months outside 2000–2099', async () => {
        const session = await owner()

        for (const yearMonth of ['1999-12', '2100-01', '9999-12']) {
            assert.equal((await as(session).post('/sheets', { yearMonth })).status, 422)
        }
    })
})
