import { z } from 'zod'
import {
    DEBT_STATUSES,
    DEBT_STRATEGIES,
    ENTRY_CATEGORIES,
    LEFTOVER_DESTINATIONS,
} from './finance.types.ts'
import { roundHalfUpToCents } from './money.ts'

const MAX_AMOUNT = 999_999_999_999.99
const MAX_SORT_ORDER = 1_000_000

// Hojas entre 2000 y 2099: evita crear miles de meses absurdos que inflen el libro.
const yearMonthSchema = z
    .string()
    .trim()
    .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'Mes inválido. Usa el formato AAAA-MM entre 2000 y 2099.')

const idSchema = z.uuid('Identificador inválido.')

// Redondeo a centavos como ROUND(valor; 2) de Excel; el máximo se comprueba ya redondeado para
// que nada exceda numeric(14, 2).
const amountSchema = z
    .number({ error: 'El valor debe ser un número.' })
    .min(0, 'El valor no puede ser negativo.')
    .max(MAX_AMOUNT + 0.01, 'El valor es demasiado alto.')
    .transform(roundHalfUpToCents)
    .pipe(z.number().max(MAX_AMOUNT, 'El valor es demasiado alto.'))

const nullableAmountSchema = amountSchema.nullable()

const rateSchema = z
    .number({ error: 'La tasa debe ser un número.' })
    .min(0, 'La tasa no puede ser negativa.')
    .max(1, 'La tasa debe estar entre 0 y 1.')

const percentSchema = z
    .number({ error: 'El porcentaje debe ser un número.' })
    .min(0, 'El porcentaje no puede ser negativo.')
    .max(100, 'El porcentaje no puede superar 100.')

const dueDaySchema = z
    .number({ error: 'El día debe ser un número.' })
    .int('El día debe ser un número entero.')
    .min(1, 'El día debe estar entre 1 y 31.')
    .max(31, 'El día debe estar entre 1 y 31.')

const sortOrderSchema = z
    .number({ error: 'El orden debe ser un número.' })
    .int('El orden debe ser un número entero.')
    .min(0, 'El orden no puede ser negativo.')
    .max(MAX_SORT_ORDER, 'El orden es demasiado alto.')

function requiredText(max: number, label: string) {
    return z
        .string({ error: `${label} es obligatorio.` })
        .trim()
        .min(1, `${label} es obligatorio.`)
        .max(max, `${label} no puede superar ${max} caracteres.`)
}

function nullableText(max: number, label: string) {
    return z
        .string()
        .trim()
        .max(max, `${label} no puede superar ${max} caracteres.`)
        .nullable()
        .transform((value) => (value ? value : null))
}

function hasChanges(value: Record<string, unknown>) {
    return Object.keys(value).length > 0
}

const changesMessage = { message: 'Envía al menos un cambio.' }

const yearMonthParams = z.object({ yearMonth: yearMonthSchema })
const idParams = z.object({ id: idSchema })

export const yearMonthParamsSchema = z.object({ params: yearMonthParams })

export const workbookQuerySchema = z.object({
    query: z
        .object({ from: yearMonthSchema.optional(), to: yearMonthSchema.optional() })
        .strip()
        .refine((value) => !value.from || !value.to || value.from <= value.to, {
            message: 'El mes inicial debe ser anterior o igual al final.',
            path: ['from'],
        }),
})

// operationId identifica una acción del usuario: el mismo id es un reintento (no repite la
// copia) y un id nuevo es una acción intencional distinta.
export const copyPreviousSheetSchema = z.object({
    params: yearMonthParams,
    body: z.object({ operationId: z.uuid('Identificador inválido.').optional() }).strict().optional(),
})

export const idParamsSchema = z.object({ params: idParams })

export const updateSettingsSchema = z.object({
    body: z
        .object({
            benefitsRate: rateSchema.optional(),
            cushionAmount: amountSchema.optional(),
            debtStrategy: z.enum(DEBT_STRATEGIES, { error: 'La estrategia de deudas no es válida.' }).optional(),
            redirectDebtOverpayments: z.boolean().optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

const accountNameSchema = requiredText(60, 'El nombre de la cuenta')

export const createAccountSchema = z.object({
    body: z
        .object({
            id: idSchema.optional(),
            name: accountNameSchema,
        })
        .strict(),
})

export const updateAccountSchema = z.object({
    params: idParams,
    body: z
        .object({
            archived: z.boolean().optional(),
            name: accountNameSchema.optional(),
            sortOrder: sortOrderSchema.optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

export const createSheetSchema = z.object({
    body: z
        .object({
            copyFrom: z.enum(['PREVIOUS', 'NONE']).default('NONE'),
            operationId: idSchema.optional(),
            yearMonth: yearMonthSchema,
        })
        .strict(),
})

export const updateSheetSchema = z.object({
    params: yearMonthParams,
    body: z
        .object({
            benefitsOverride: nullableAmountSchema.optional(),
            disabilityIncome: nullableAmountSchema.optional(),
            leftoverDestination: z.enum(LEFTOVER_DESTINATIONS).optional(),
            notes: nullableText(500, 'La nota').optional(),
            otherDeductions: amountSchema.optional(),
            previousLeftover: amountSchema.optional(),
            salary: amountSchema.optional(),
            transportAllowance: amountSchema.optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

const entryConceptSchema = requiredText(120, 'El concepto')

const entryFieldsSchema = z.object({
    accountId: idSchema.nullable().optional(),
    amount: nullableAmountSchema.optional(),
    category: z.enum(ENTRY_CATEGORIES).optional(),
    debtId: idSchema.nullable().optional(),
    dueDay: dueDaySchema.nullable().optional(),
    isPaid: z.boolean().optional(),
    note: nullableText(200, 'La nota').optional(),
    sortOrder: sortOrderSchema.optional(),
})

export const createEntrySchema = z.object({
    params: yearMonthParams,
    body: entryFieldsSchema
        .extend({
            concept: entryConceptSchema,
            id: idSchema.optional(),
        })
        .strict(),
})

export const updateEntrySchema = z.object({
    params: idParams,
    body: entryFieldsSchema
        .extend({
            concept: entryConceptSchema.optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

const spendAmountSchema = amountSchema.refine((value) => value > 0, 'El gasto debe ser mayor a cero.')

function isCalendarDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`)

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const spentOnSchema = z
    .string({ error: 'La fecha es obligatoria.' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
    .refine(isCalendarDate, 'La fecha no es válida.')

export const createSpendSchema = z.object({
    params: idParams,
    body: z
        .object({
            amount: spendAmountSchema,
            id: idSchema.optional(),
            note: nullableText(120, 'La nota').optional(),
            spentOn: spentOnSchema,
        })
        .strict(),
})

export const updateSpendSchema = z.object({
    params: idParams,
    body: z
        .object({
            amount: spendAmountSchema.optional(),
            note: nullableText(120, 'La nota').optional(),
            spentOn: spentOnSchema.optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

const debtFieldsSchema = z.object({
    datesNote: nullableText(120, 'Las fechas').optional(),
    dueDay: dueDaySchema.nullable().optional(),
    insuranceRate: rateSchema.optional(),
    lender: nullableText(120, 'La entidad').optional(),
    minimumPayment: amountSchema.optional(),
    monthlyRate: rateSchema.optional(),
    myMinimumOverride: nullableAmountSchema.optional(),
    notes: nullableText(300, 'La nota').optional(),
    partnerContribution: amountSchema.optional(),
    paymentCap: nullableAmountSchema.optional(),
    sharedAmount: amountSchema.optional(),
    sharedPercent: percentSchema.nullable().optional(),
    sharedWith: nullableText(60, 'El nombre').optional(),
    sortOrder: sortOrderSchema.optional(),
    status: z.enum(DEBT_STATUSES).optional(),
    totalBalance: amountSchema.optional(),
})

const debtNameSchema = requiredText(80, 'El nombre de la deuda')

export const createDebtSchema = z.object({
    body: debtFieldsSchema
        .extend({
            id: idSchema.optional(),
            name: debtNameSchema,
        })
        .strict(),
})

export const updateDebtSchema = z.object({
    params: idParams,
    body: debtFieldsSchema
        .extend({
            name: debtNameSchema.optional(),
        })
        .strict()
        .refine(hasChanges, changesMessage),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body']
export type CreateAccountInput = z.infer<typeof createAccountSchema>['body']
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>['body']
export type CreateSheetInput = z.infer<typeof createSheetSchema>['body']
export type CopyPreviousSheetInput = NonNullable<z.infer<typeof copyPreviousSheetSchema>['body']>
export type WorkbookQuery = z.infer<typeof workbookQuerySchema>['query']
export type UpdateSheetInput = z.infer<typeof updateSheetSchema>['body']
export type CreateEntryInput = z.infer<typeof createEntrySchema>['body']
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>['body']
export type CreateSpendInput = z.infer<typeof createSpendSchema>['body']
export type UpdateSpendInput = z.infer<typeof updateSpendSchema>['body']
export type CreateDebtInput = z.infer<typeof createDebtSchema>['body']
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>['body']
