import { readFile } from 'node:fs/promises'
import type { EntryCategory, LeftoverDestination } from '@prisma/client'
import { disconnectPrisma, prisma } from '../src/config/prisma.ts'

type WorkbookEntry = {
    account: string | null
    amount: number | null
    category: EntryCategory
    concept: string
    debtKey: string | null
    dueDay: number | null
    note: string | null
}

type WorkbookSheet = {
    benefitsOverride: number | null
    disabilityIncome: number | null
    entries: WorkbookEntry[]
    leftoverDestination: LeftoverDestination
    otherDeductions: number
    previousLeftover: number
    salary: number
    transportAllowance: number
    yearMonth: string
}

type WorkbookDebt = {
    datesNote: string | null
    dueDay: number | null
    insuranceRate: number
    key: string
    lender: string | null
    minimumPayment: number
    monthlyRate: number
    myMinimumOverride: number | null
    name: string
    notes: string | null
    partnerContribution: number
    paymentCap: number | null
    sharedAmount: number
    sharedPercent: number | null
    sharedWith: string | null
    totalBalance: number
}

type WorkbookFile = {
    accounts: string[]
    debts: WorkbookDebt[]
    settings: {
        benefitsRate: number
        cushionAmount: number
        redirectDebtOverpayments: boolean
    }
    sheets: WorkbookSheet[]
}

const usage = 'Uso: pnpm db:import-workbook <archivo.json> <email> [--replace]'

async function main() {
    const [filePath, email] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
    const replace = process.argv.includes('--replace')

    if (!filePath || !email) {
        throw new Error(usage)
    }

    const workbook = JSON.parse(await readFile(filePath, 'utf8')) as WorkbookFile
    const user = await prisma.user.findFirst({
        select: { email: true, id: true },
        where: { email: { equals: email.trim(), mode: 'insensitive' }, deletedAt: null },
    })

    if (!user) {
        throw new Error(`No existe un usuario activo con el correo ${email}.`)
    }

    const yearMonths = workbook.sheets.map((sheet) => sheet.yearMonth)
    const existingSheets = await prisma.monthSheet.findMany({
        select: { yearMonth: true },
        where: { userId: user.id, yearMonth: { in: yearMonths } },
    })

    if (existingSheets.length > 0 && !replace) {
        throw new Error(
            `Ya existen hojas para ${existingSheets.map((sheet) => sheet.yearMonth).join(', ')}. Usa --replace para reemplazarlas.`,
        )
    }

    const summary = await prisma.$transaction(
        async (tx) => {
            if (replace) {
                await tx.monthSheet.deleteMany({
                    where: { userId: user.id, yearMonth: { in: yearMonths } },
                })
                await tx.debt.deleteMany({
                    where: { userId: user.id, name: { in: workbook.debts.map((debt) => debt.name) } },
                })
            }

            await tx.financeSettings.upsert({
                create: { ...workbook.settings, userId: user.id },
                update: workbook.settings,
                where: { userId: user.id },
            })

            const accountIds = new Map<string, string>()

            for (const [index, name] of workbook.accounts.entries()) {
                const account = await tx.moneyAccount.upsert({
                    create: { name, sortOrder: index, userId: user.id },
                    update: { archivedAt: null },
                    where: { userId_name: { name, userId: user.id } },
                })
                accountIds.set(name, account.id)
            }

            const debtIds = new Map<string, string>()

            for (const [index, debt] of workbook.debts.entries()) {
                const created = await tx.debt.create({
                    data: {
                        datesNote: debt.datesNote,
                        dueDay: debt.dueDay,
                        insuranceRate: debt.insuranceRate,
                        lender: debt.lender,
                        minimumPayment: debt.minimumPayment,
                        monthlyRate: debt.monthlyRate,
                        myMinimumOverride: debt.myMinimumOverride,
                        name: debt.name,
                        notes: debt.notes,
                        partnerContribution: debt.partnerContribution,
                        paymentCap: debt.paymentCap,
                        sharedAmount: debt.sharedAmount,
                        sharedPercent: debt.sharedPercent,
                        sharedWith: debt.sharedWith,
                        sortOrder: index,
                        totalBalance: debt.totalBalance,
                        userId: user.id,
                    },
                })
                debtIds.set(debt.key, created.id)
            }

            let entryCount = 0

            for (const sheet of workbook.sheets) {
                const created = await tx.monthSheet.create({
                    data: {
                        benefitsOverride: sheet.benefitsOverride,
                        disabilityIncome: sheet.disabilityIncome,
                        leftoverDestination: sheet.leftoverDestination,
                        otherDeductions: sheet.otherDeductions,
                        previousLeftover: sheet.previousLeftover,
                        salary: sheet.salary,
                        transportAllowance: sheet.transportAllowance,
                        userId: user.id,
                        yearMonth: sheet.yearMonth,
                    },
                })

                await tx.monthEntry.createMany({
                    data: sheet.entries.map((entry, index) => ({
                        accountId: entry.account ? (accountIds.get(entry.account) ?? null) : null,
                        amount: entry.amount,
                        category: entry.category,
                        concept: entry.concept.slice(0, 120),
                        debtId: entry.debtKey ? (debtIds.get(entry.debtKey) ?? null) : null,
                        dueDay: entry.dueDay,
                        note: entry.note?.slice(0, 200) ?? null,
                        sheetId: created.id,
                        sortOrder: index,
                        userId: user.id,
                    })),
                })
                entryCount += sheet.entries.length
            }

            return {
                accounts: accountIds.size,
                debts: debtIds.size,
                entries: entryCount,
                sheets: workbook.sheets.length,
            }
        },
        { timeout: 60_000 },
    )

    console.log(
        `Importado para ${user.email}: ${summary.sheets} meses, ${summary.entries} filas, ${summary.debts} deudas y ${summary.accounts} cuentas.`,
    )
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(() => disconnectPrisma())
