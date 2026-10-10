import { z } from 'zod'
import { withTransaction, type TransactionClient } from '../../config/prisma.ts'
import { accountNameKey, lockUserFinance } from './finance.repository.ts'
import { FINANCE_LIMITS } from './finance.service.ts'
import { DEBT_STRATEGIES, ENTRY_CATEGORIES, LEFTOVER_DESTINATIONS } from './finance.types.ts'
import { roundHalfUpToCents } from './money.ts'

// Importación de un libro completo (scripts/import-workbook.ts). Todo el archivo se valida antes
// de escribir: tipos, rangos, meses, referencias a cuentas y deudas y duplicados. La escritura es
// una única transacción: si algo falla no queda nada a medias. Dentro de ella, con el bloqueo
// financiero del usuario, se vuelven a comprobar los meses existentes, las deudas ambiguas y las
// cuotas sobre el estado final: el plan es informativo y nada cambia entre plan y escritura sin
// que se detecte. Sin --replace nunca se borra un mes.
//
// Transformaciones (documentadas en docs/qa-backend-remediacion.md):
// - textos sin espacios al inicio y al final; un texto más largo que su columna es un error,
//   nunca se recorta en silencio;
// - montos redondeados a centavos con la regla de ROUND(valor; 2);
// - cuentas emparejadas por nombre sin distinguir mayúsculas (se reactivan si estaban archivadas);
// - deudas emparejadas por nombre sin distinguir mayúsculas: se actualizan conservando su id, de
//   modo que los meses que no se reemplazan siguen enlazados; las deudas que no están en el
//   archivo no se tocan;
// - el orden de filas, cuentas y deudas es el del archivo.

const MAX_AMOUNT = 999_999_999_999.99

const amount = z
    .number()
    .finite()
    .min(0, 'no puede ser negativo')
    .transform(roundHalfUpToCents)
    .pipe(z.number().max(MAX_AMOUNT, 'es demasiado alto'))

const rate = z.number().min(0, 'no puede ser negativa').max(1, 'debe estar entre 0 y 1')

const text = (max: number) => z.string().trim().min(1, 'no puede estar vacío').max(max, `supera ${max} caracteres`)

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max, `supera ${max} caracteres`)
        .nullable()
        .transform((value) => (value ? value : null))

const dueDay = z.number().int().min(1).max(31).nullable()

const entrySchema = z
    .object({
        account: text(60).nullable(),
        amount: amount.nullable(),
        category: z.enum(ENTRY_CATEGORIES),
        concept: text(120),
        debtKey: text(60).nullable(),
        dueDay,
        note: optionalText(200),
    })
    .strict()

const sheetSchema = z
    .object({
        benefitsOverride: amount.nullable(),
        disabilityIncome: amount.nullable(),
        entries: z.array(entrySchema).max(300, 'un mes admite hasta 300 filas'),
        leftoverDestination: z.enum(LEFTOVER_DESTINATIONS),
        otherDeductions: amount,
        previousLeftover: amount,
        salary: amount,
        transportAllowance: amount,
        yearMonth: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'debe ser AAAA-MM entre 2000 y 2099'),
    })
    .strict()

const debtSchema = z
    .object({
        datesNote: optionalText(120),
        dueDay,
        insuranceRate: rate,
        key: text(60),
        lender: optionalText(120),
        minimumPayment: amount,
        monthlyRate: rate,
        myMinimumOverride: amount.nullable(),
        name: text(80),
        notes: optionalText(300),
        partnerContribution: amount,
        paymentCap: amount.nullable(),
        sharedAmount: amount,
        sharedPercent: z.number().min(0).max(100).nullable(),
        sharedWith: optionalText(60),
        totalBalance: amount,
    })
    .strict()

function duplicates(values: string[]) {
    const seen = new Set<string>()

    return values.filter((value) => (seen.has(value) ? true : (seen.add(value), false)))
}

export const workbookFileSchema = z
    .object({
        accounts: z.array(text(60)).max(50),
        debts: z.array(debtSchema).max(100),
        settings: z
            .object({
                benefitsRate: rate,
                cushionAmount: amount,
                debtStrategy: z.enum(DEBT_STRATEGIES).optional(),
                redirectDebtOverpayments: z.boolean(),
            })
            .strict(),
        sheets: z.array(sheetSchema).min(1, 'el archivo no tiene meses').max(240),
    })
    .strict()
    .superRefine((workbook, context) => {
        const accountKeys = new Set(workbook.accounts.map(accountNameKey))
        const debtKeys = new Set(workbook.debts.map((debt) => debt.key))

        for (const name of duplicates(workbook.accounts.map(accountNameKey))) {
            context.addIssue({ code: 'custom', message: `cuenta repetida: ${name}`, path: ['accounts'] })
        }

        for (const key of duplicates(workbook.debts.map((debt) => debt.key))) {
            context.addIssue({ code: 'custom', message: `clave de deuda repetida: ${key}`, path: ['debts'] })
        }

        for (const name of duplicates(workbook.debts.map((debt) => debt.name.toLowerCase()))) {
            context.addIssue({ code: 'custom', message: `nombre de deuda repetido: ${name}`, path: ['debts'] })
        }

        for (const yearMonth of duplicates(workbook.sheets.map((sheet) => sheet.yearMonth))) {
            context.addIssue({ code: 'custom', message: `mes repetido: ${yearMonth}`, path: ['sheets'] })
        }

        workbook.sheets.forEach((sheet, sheetIndex) => {
            sheet.entries.forEach((entry, entryIndex) => {
                const path = ['sheets', sheetIndex, 'entries', entryIndex]

                if (entry.account && !accountKeys.has(accountNameKey(entry.account))) {
                    context.addIssue({ code: 'custom', message: `cuenta desconocida: ${entry.account}`, path: [...path, 'account'] })
                }

                if (entry.debtKey && !debtKeys.has(entry.debtKey)) {
                    context.addIssue({ code: 'custom', message: `deuda desconocida: ${entry.debtKey}`, path: [...path, 'debtKey'] })
                }
            })
        })
    })

export type WorkbookFile = z.infer<typeof workbookFileSchema>

export class WorkbookImportError extends Error {
    readonly problems: string[]

    constructor(problems: string[]) {
        super(`El archivo no se puede importar:\n- ${problems.join('\n- ')}`)
        this.problems = problems
    }
}

export function parseWorkbookFile(raw: unknown): WorkbookFile {
    const result = workbookFileSchema.safeParse(raw)

    if (!result.success) {
        throw new WorkbookImportError(
            result.error.issues.map((issue) => `${issue.path.join('.') || 'archivo'}: ${issue.message}`),
        )
    }

    return result.data
}

export type ImportPlan = {
    accountsToCreate: number
    debtsToCreate: number
    debtsToUpdate: number
    entries: number
    sheetsToCreate: string[]
    sheetsToReplace: string[]
}

// Compara el archivo con el estado actual de la cuenta. Se usa en el plan y, otra vez, dentro de
// la transacción de escritura.
async function inspectWorkbookImport(
    client: TransactionClient,
    userId: string,
    workbook: WorkbookFile,
    options: { replace: boolean },
): Promise<ImportPlan> {
    const yearMonths = workbook.sheets.map((sheet) => sheet.yearMonth)
    const [existingSheets, existingDebts, existingAccounts, totalSheets] = await Promise.all([
        client.monthSheet.findMany({ select: { yearMonth: true }, where: { userId, yearMonth: { in: yearMonths } } }),
        client.debt.findMany({ select: { name: true }, where: { userId } }),
        client.moneyAccount.findMany({ select: { nameKey: true }, where: { userId } }),
        client.monthSheet.count({ where: { userId } }),
    ])
    const problems: string[] = []
    const replaced = existingSheets.map((sheet) => sheet.yearMonth).sort()

    if (replaced.length > 0 && !options.replace) {
        problems.push(`ya existen hojas para ${replaced.join(', ')}; usa --replace para reemplazarlas`)
    }

    const existingDebtNames = existingDebts.map((debt) => debt.name.toLowerCase())

    for (const debt of workbook.debts) {
        if (existingDebtNames.filter((name) => name === debt.name.toLowerCase()).length > 1) {
            problems.push(`hay varias deudas llamadas "${debt.name}" en la cuenta; no se puede decidir cuál actualizar`)
        }
    }

    const existingAccountKeys = new Set(existingAccounts.map((account) => account.nameKey))
    const debtsToUpdate = workbook.debts.filter((debt) => existingDebtNames.includes(debt.name.toLowerCase())).length
    const plan = {
        accountsToCreate: workbook.accounts.filter((name) => !existingAccountKeys.has(accountNameKey(name))).length,
        debtsToCreate: workbook.debts.length - debtsToUpdate,
        debtsToUpdate,
        entries: workbook.sheets.reduce((total, sheet) => total + sheet.entries.length, 0),
        sheetsToCreate: yearMonths.filter((yearMonth) => !replaced.includes(yearMonth)).sort(),
        sheetsToReplace: replaced,
    }

    // Cuotas sobre el estado final de la cuenta, no solo sobre el tamaño del archivo.
    if (totalSheets + plan.sheetsToCreate.length > FINANCE_LIMITS.sheets) {
        problems.push(`la cuenta quedaría con ${totalSheets + plan.sheetsToCreate.length} meses; el máximo es ${FINANCE_LIMITS.sheets}`)
    }

    if (existingAccounts.length + plan.accountsToCreate > FINANCE_LIMITS.accounts) {
        problems.push(`la cuenta quedaría con ${existingAccounts.length + plan.accountsToCreate} cuentas; el máximo es ${FINANCE_LIMITS.accounts}`)
    }

    if (existingDebts.length + plan.debtsToCreate > FINANCE_LIMITS.debts) {
        problems.push(`la cuenta quedaría con ${existingDebts.length + plan.debtsToCreate} deudas; el máximo es ${FINANCE_LIMITS.debts}`)
    }

    if (problems.length > 0) {
        throw new WorkbookImportError(problems)
    }

    return plan
}

export function planWorkbookImport(
    client: TransactionClient,
    userId: string,
    workbook: WorkbookFile,
    options: { replace: boolean },
): Promise<ImportPlan> {
    return inspectWorkbookImport(client, userId, workbook, options)
}

export function applyWorkbookImport(userId: string, workbook: WorkbookFile, options: { replace: boolean }) {
    return withTransaction(async (transaction) => {
        await lockUserFinance(transaction, userId)

        const plan = await inspectWorkbookImport(transaction, userId, workbook, options)

        await transaction.financeSettings.upsert({
            create: { ...workbook.settings, userId },
            update: workbook.settings,
            where: { userId },
        })

        const accountIds = new Map<string, string>()

        for (const [index, name] of workbook.accounts.entries()) {
            const account = await transaction.moneyAccount.upsert({
                create: { name, nameKey: accountNameKey(name), sortOrder: index, userId },
                select: { id: true },
                update: { archivedAt: null },
                where: { userId_nameKey: { nameKey: accountNameKey(name), userId } },
            })

            accountIds.set(accountNameKey(name), account.id)
        }

        const debtIds = new Map<string, string>()

        for (const [index, { key, ...debt }] of workbook.debts.entries()) {
            const existing = await transaction.debt.findFirst({
                select: { id: true },
                where: { name: { equals: debt.name, mode: 'insensitive' }, userId },
            })
            const saved = existing
                ? await transaction.debt.update({ data: { ...debt, sortOrder: index }, select: { id: true }, where: { id: existing.id } })
                : await transaction.debt.create({ data: { ...debt, sortOrder: index, userId }, select: { id: true } })

            debtIds.set(key, saved.id)
        }

        // Solo con --replace, y solo los meses del archivo que existen (con sus filas y gastos); el
        // resto queda intacto. Sin --replace, un mes existente ya hizo fallar la comprobación.
        if (options.replace && plan.sheetsToReplace.length > 0) {
            await transaction.monthSheet.deleteMany({ where: { userId, yearMonth: { in: plan.sheetsToReplace } } })
        }

        for (const { entries, ...sheet } of workbook.sheets) {
            const created = await transaction.monthSheet.create({ data: { ...sheet, userId }, select: { id: true } })

            await transaction.monthEntry.createMany({
                data: entries.map((entry, index) => ({
                    accountId: entry.account ? accountIds.get(accountNameKey(entry.account))! : null,
                    amount: entry.amount,
                    category: entry.category,
                    concept: entry.concept,
                    debtId: entry.debtKey ? debtIds.get(entry.debtKey)! : null,
                    dueDay: entry.dueDay,
                    note: entry.note,
                    sheetId: created.id,
                    sortOrder: index,
                    userId,
                })),
            })
        }

        return {
            accounts: accountIds.size,
            debts: debtIds.size,
            entries: workbook.sheets.reduce((total, sheet) => total + sheet.entries.length, 0),
            sheets: workbook.sheets.length,
        }
    })
}
