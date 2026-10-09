import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'
import { createUser, deleteUsers, prisma, stopDatabase } from '../support/harness.ts'

const { applyWorkbookImport, parseWorkbookFile, planWorkbookImport, WorkbookImportError } = await import(
    '../../src/modules/finance/workbook-import.ts'
)

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
const createdUsers: string[] = []

after(async () => {
    await deleteUsers(...createdUsers)
    await stopDatabase()
})

function sheet(yearMonth: string, entries: unknown[]) {
    return {
        benefitsOverride: null,
        disabilityIncome: null,
        entries,
        leftoverDestination: 'AVAILABLE',
        otherDeductions: 0,
        previousLeftover: 0,
        salary: 3000000,
        transportAllowance: 0,
        yearMonth,
    }
}

function debt(key: string, name: string, totalBalance = 1000000) {
    return {
        datesNote: null,
        dueDay: 5,
        insuranceRate: 0,
        key,
        lender: null,
        minimumPayment: 100000,
        monthlyRate: 0.02,
        myMinimumOverride: null,
        name,
        notes: null,
        partnerContribution: 0,
        paymentCap: null,
        sharedAmount: 0,
        sharedPercent: null,
        sharedWith: null,
        totalBalance,
    }
}

function entry(concept: string, overrides: Record<string, unknown> = {}) {
    return { account: 'Banco', amount: 120000, category: 'DEBT', concept, debtKey: 'tv', dueDay: 5, note: null, ...overrides }
}

function workbook(sheets: unknown[], debts = [debt('tv', 'Televisor')]) {
    return {
        accounts: ['Banco'],
        debts,
        settings: { benefitsRate: 0.08, cushionAmount: 500000, redirectDebtOverpayments: false },
        sheets,
    }
}

async function newUser() {
    const user = await createUser()

    createdUsers.push(user.id)

    return user
}

describe('import --replace keeps retained months linked (DATA-10)', () => {
    it('replacing only October keeps September linked to the same debt id', async () => {
        const user = await newUser()

        await applyWorkbookImport(user.id, parseWorkbookFile(workbook([sheet('2026-09', [entry('Cuota TV sept')]), sheet('2026-10', [entry('Cuota TV oct')])])), { replace: false })

        const debtBefore = await prisma.debt.findFirstOrThrow({ where: { userId: user.id } })
        const october = parseWorkbook([sheet('2026-10', [entry('Cuota TV oct (corregida)', { amount: 130000 })])], [debt('tv', 'televisor', 900000)])
        const plan = await planWorkbookImport(prisma, user.id, october, { replace: true })

        assert.deepEqual(plan.sheetsToReplace, ['2026-10'])
        assert.equal(plan.debtsToUpdate, 1)

        await applyWorkbookImport(user.id, october, { replace: true })

        const september = await prisma.monthEntry.findFirstOrThrow({ where: { sheet: { yearMonth: '2026-09' }, userId: user.id } })
        const debtAfter = await prisma.debt.findFirstOrThrow({ where: { userId: user.id } })

        assert.equal(debtAfter.id, debtBefore.id, 'the debt keeps its identity')
        assert.equal(Number(debtAfter.totalBalance), 900000, 'its fields are updated')
        assert.equal(september.debtId, debtBefore.id, 'the retained month stays linked')
        assert.equal(await prisma.debt.count({ where: { userId: user.id } }), 1)
    })

    it('refuses to overwrite existing months without --replace', async () => {
        const user = await newUser()
        const file = parseWorkbook([sheet('2026-09', [])])

        await applyWorkbookImport(user.id, file, { replace: false })
        await assert.rejects(planWorkbookImport(prisma, user.id, file, { replace: false }), /--replace/)
    })
})

function parseWorkbook(sheets: unknown[], debts?: unknown[]) {
    return parseWorkbookFile(workbook(sheets, debts as ReturnType<typeof debt>[] | undefined))
}

describe('import validation (DATA-11)', () => {
    const invalid: Array<[string, unknown, RegExp]> = [
        ['a negative amount', workbook([sheet('2026-09', [entry('x', { amount: -10 })])]), /negativo/],
        ['an impossible month', workbook([sheet('2026-99', [])]), /AAAA-MM/],
        ['an unknown account', workbook([sheet('2026-09', [entry('x', { account: 'Fantasma' })])]), /cuenta desconocida/],
        ['an unknown debt key', workbook([sheet('2026-09', [entry('x', { debtKey: 'moto' })])]), /deuda desconocida/],
        ['an over-long concept', workbook([sheet('2026-09', [entry('x'.repeat(121))])]), /120/],
        ['a repeated month', workbook([sheet('2026-09', []), sheet('2026-09', [])]), /mes repetido/],
        ['an unknown field', { ...workbook([sheet('2026-09', [])]), extra: true }, /extra/],
    ]

    for (const [label, file, expected] of invalid) {
        it(`rejects ${label} before touching the database`, () => {
            assert.throws(() => parseWorkbookFile(file), (error: unknown) => error instanceof WorkbookImportError && expected.test(error.message))
        })
    }

    it('rolls back everything when a write fails midway', async () => {
        const user = await newUser()
        const file = parseWorkbook([sheet('2026-09', [entry('Fila')]), sheet('2026-10', [entry('Fila')])])

        await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION qa_fail_october() RETURNS trigger AS $$
            BEGIN IF NEW.year_month = '2026-10' THEN RAISE EXCEPTION 'fallo simulado'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`)
        await prisma.$executeRawUnsafe('CREATE TRIGGER qa_fail_october BEFORE INSERT ON month_sheets FOR EACH ROW EXECUTE FUNCTION qa_fail_october()')

        try {
            await assert.rejects(applyWorkbookImport(user.id, file, { replace: false }))
        } finally {
            await prisma.$executeRawUnsafe('DROP TRIGGER qa_fail_october ON month_sheets')
            await prisma.$executeRawUnsafe('DROP FUNCTION qa_fail_october()')
        }

        assert.equal(await prisma.monthSheet.count({ where: { userId: user.id } }), 0)
        assert.equal(await prisma.debt.count({ where: { userId: user.id } }), 0)
        assert.equal(await prisma.moneyAccount.count({ where: { userId: user.id } }), 0)
    })
})

describe('import CLI', () => {
    it('only simulates by default and writes with --apply', async () => {
        const user = await newUser()
        const directory = mkdtempSync(join(tmpdir(), 'fintrack-import-'))
        const filePath = join(directory, 'libro.json')

        writeFileSync(filePath, JSON.stringify(workbook([sheet('2026-09', [entry('Cuota')])])))

        try {
            const run = (...flags: string[]) =>
                spawnSync(process.execPath, ['scripts/import-workbook.ts', filePath, user.email, ...flags], {
                    cwd: backendRoot,
                    encoding: 'utf8',
                    env: process.env,
                })
            const dryRun = run()

            assert.equal(dryRun.status, 0, dryRun.stderr)
            assert.match(dryRun.stdout, /Simulación/)
            assert.equal(await prisma.monthSheet.count({ where: { userId: user.id } }), 0)

            const applied = run('--apply')

            assert.equal(applied.status, 0, applied.stderr)
            assert.equal(await prisma.monthSheet.count({ where: { userId: user.id } }), 1)
        } finally {
            rmSync(directory, { force: true, recursive: true })
        }
    })
})

describe('auth data retention script (AUTH-07)', () => {
    it('removes long-expired sessions and tokens and keeps current ones', async () => {
        const user = await newUser()
        const old = new Date('2020-01-01T00:00:00.000Z')
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const [expired, current] = [randomUUID(), randomUUID()]

        await prisma.authSession.createMany({
            data: [
                { absoluteExpiresAt: old, id: expired, idleExpiresAt: old, userId: user.id },
                { absoluteExpiresAt: future, id: current, idleExpiresAt: future, userId: user.id },
            ],
        })
        await prisma.authToken.create({ data: { expiresAt: old, tokenHash: `old-${user.id}`, type: 'EMAIL_VERIFICATION', userId: user.id } })

        const run = spawnSync(process.execPath, ['scripts/cleanup-auth.ts'], { cwd: backendRoot, encoding: 'utf8', env: process.env })

        assert.equal(run.status, 0, run.stderr)
        assert.deepEqual(
            (await prisma.authSession.findMany({ select: { id: true }, where: { userId: user.id } })).map((session) => session.id),
            [current],
        )
        assert.equal(await prisma.authToken.count({ where: { userId: user.id } }), 0)
    })
})
