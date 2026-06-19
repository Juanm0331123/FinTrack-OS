import {
    BudgetBucket,
    CategoryKind,
    DebtType,
    MonthlyObligationStatus,
    ObligationType,
} from '@prisma/client'
import { z } from 'zod'

const yearMonthSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes invalido. Usa el formato YYYY-MM.')

const uuidSchema = z.string().uuid('ID invalido.')

const amountSchema = z.coerce
    .number()
    .finite('El valor debe ser numerico.')
    .min(0, 'El valor no puede ser negativo.')

const positiveAmountSchema = amountSchema.refine((value) => value > 0, {
    message: 'El valor debe ser mayor a cero.',
})

const optionalTextSchema = z
    .union([z.string().trim(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined))

const dateSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato YYYY-MM-DD.')

const currencyCodeSchema = z
    .string()
    .trim()
    .length(3, 'La moneda debe tener 3 caracteres.')
    .transform((value) => value.toUpperCase())

export const monthWorkspaceParamsSchema = z.object({
    params: z.object({
        yearMonth: yearMonthSchema,
    }),
})

export const initializeMonthSchema = z.object({
    params: z.object({
        yearMonth: yearMonthSchema,
    }),
    body: z
        .object({
            carryoverToAvailableAmount: amountSchema.default(0),
            carryoverToSavingsAmount: amountSchema.default(0),
            debtAllocations: z
                .array(
                    z.object({
                        amount: positiveAmountSchema,
                        debtId: uuidSchema,
                    }),
                )
                .default([]),
            notes: optionalTextSchema,
        })
        .strict(),
})

export const createCategorySchema = z.object({
    body: z
        .object({
            budgetBucket: z.nativeEnum(BudgetBucket).optional(),
            color: optionalTextSchema,
            icon: optionalTextSchema,
            kind: z.nativeEnum(CategoryKind).default(CategoryKind.EXPENSE),
            name: z
                .string()
                .trim()
                .min(2, 'La categoria debe tener al menos 2 caracteres.')
                .max(120, 'La categoria no puede superar 120 caracteres.'),
        })
        .strict(),
})

export const createExpenseSchema = z.object({
    body: z
        .object({
            amount: positiveAmountSchema,
            categoryId: uuidSchema,
            effectiveMonth: yearMonthSchema.optional(),
            notes: optionalTextSchema,
            occurredOn: dateSchema,
            title: z
                .string()
                .trim()
                .min(2, 'El gasto debe tener al menos 2 caracteres.')
                .max(180, 'El gasto no puede superar 180 caracteres.'),
        })
        .strict(),
})

export const createIncomeSchema = z.object({
    body: z
        .object({
            amount: positiveAmountSchema,
            effectiveMonth: yearMonthSchema.optional(),
            notes: optionalTextSchema,
            occurredOn: dateSchema,
            title: z
                .string()
                .trim()
                .min(2, 'El ingreso debe tener al menos 2 caracteres.')
                .max(180, 'El ingreso no puede superar 180 caracteres.'),
        })
        .strict(),
})

export const listCategoriesQuerySchema = z.object({
    query: z.object({
        kind: z.nativeEnum(CategoryKind).default(CategoryKind.EXPENSE),
    }),
})

export const createPaycheckSchema = z.object({
    body: z
        .object({
            effectiveMonth: yearMonthSchema.optional(),
            notes: optionalTextSchema,
            paidOn: dateSchema,
            salaryBase: positiveAmountSchema,
            totalDeductions: amountSchema.default(0),
            transportAllowance: amountSchema.default(0),
        })
        .strict(),
})

export const createSavingGoalSchema = z.object({
    body: z
        .object({
            currencyCode: currencyCodeSchema.optional(),
            name: z
                .string()
                .trim()
                .min(2, 'La meta debe tener al menos 2 caracteres.')
                .max(150, 'La meta no puede superar 150 caracteres.'),
            priority: z.coerce.number().int().min(1).max(10).optional(),
            targetAmount: positiveAmountSchema,
            targetDate: dateSchema.optional(),
        })
        .strict(),
})

export const createSavingContributionSchema = z.object({
    body: z
        .object({
            amount: positiveAmountSchema,
            effectiveMonth: yearMonthSchema.optional(),
            notes: optionalTextSchema,
            occurredOn: dateSchema,
            savingGoalId: uuidSchema.optional(),
            title: z
                .string()
                .trim()
                .min(2, 'El ahorro debe tener al menos 2 caracteres.')
                .max(180, 'El ahorro no puede superar 180 caracteres.'),
        })
        .strict(),
})

export const createObligationTemplateSchema = z.object({
    body: z
        .object({
            categoryId: uuidSchema,
            isActive: z.boolean().default(true),
            name: z
                .string()
                .trim()
                .min(2, 'La obligacion debe tener al menos 2 caracteres.')
                .max(150, 'La obligacion no puede superar 150 caracteres.'),
            notes: optionalTextSchema,
            obligationType: z.nativeEnum(ObligationType),
            suggestedAmount: positiveAmountSchema.optional(),
            suggestedDueDay: z.coerce.number().int().min(1).max(31).optional(),
        })
        .strict(),
})

export const createMonthlyObligationSchema = z.object({
    params: z.object({
        yearMonth: yearMonthSchema,
    }),
    body: z
        .object({
            categoryId: uuidSchema,
            expectedOn: dateSchema.optional(),
            name: z
                .string()
                .trim()
                .min(2, 'La obligacion debe tener al menos 2 caracteres.')
                .max(150, 'La obligacion no puede superar 150 caracteres.'),
            notes: optionalTextSchema,
            obligationType: z.nativeEnum(ObligationType),
            plannedAmount: positiveAmountSchema,
            templateId: uuidSchema.optional(),
        })
        .strict(),
})

export const copyPreviousMonthObligationsSchema = z.object({
    params: z.object({
        yearMonth: yearMonthSchema,
    }),
})

export const updateMonthlyObligationSchema = z.object({
    params: z.object({
        id: uuidSchema,
        yearMonth: yearMonthSchema,
    }),
    body: z
        .object({
            categoryId: uuidSchema.optional(),
            expectedOn: dateSchema.optional().nullable(),
            name: z
                .string()
                .trim()
                .min(2, 'La obligacion debe tener al menos 2 caracteres.')
                .max(150, 'La obligacion no puede superar 150 caracteres.')
                .optional(),
            notes: optionalTextSchema.nullable(),
            paidAmount: positiveAmountSchema.optional(),
            paidOn: dateSchema.optional(),
            plannedAmount: positiveAmountSchema.optional(),
            status: z.nativeEnum(MonthlyObligationStatus).optional(),
        })
        .strict()
        .refine((value) => Object.keys(value).length > 0, {
            message: 'Debes enviar al menos un cambio.',
            path: [],
        }),
})

export const createDebtSchema = z.object({
    body: z
        .object({
            currencyCode: currencyCodeSchema.optional(),
            currentPrincipal: positiveAmountSchema.optional(),
            dueDay: z.coerce.number().int().min(1).max(31).optional(),
            interestRateAnnual: amountSchema.optional(),
            lenderName: optionalTextSchema,
            minimumPaymentAmount: positiveAmountSchema,
            name: z
                .string()
                .trim()
                .min(2, 'La deuda debe tener al menos 2 caracteres.')
                .max(150, 'La deuda no puede superar 150 caracteres.'),
            originalAmount: positiveAmountSchema,
            statementDay: z.coerce.number().int().min(1).max(31).optional(),
            termMonths: z.coerce
                .number()
                .int('El plazo debe ser un numero entero.')
                .min(1, 'El plazo debe ser al menos de 1 mes.'),
            type: z.nativeEnum(DebtType),
        })
        .strict(),
})

export const createDebtPaymentSchema = z.object({
    params: z.object({
        id: uuidSchema,
    }),
    body: z
        .object({
            effectiveMonth: yearMonthSchema.optional(),
            extraAmount: amountSchema.default(0),
            minimumAmount: amountSchema.default(0),
            notes: optionalTextSchema,
            paidOn: dateSchema,
        })
        .strict()
        .refine(
            (value) => value.minimumAmount + value.extraAmount > 0,
            'Debes registrar al menos un monto en el pago.',
        ),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body']
export type CreateDebtInput = z.infer<typeof createDebtSchema>['body']
export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>['body']
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body']
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>['body']
export type CreateMonthlyObligationInput = z.infer<typeof createMonthlyObligationSchema>['body']
export type CreateObligationTemplateInput = z.infer<typeof createObligationTemplateSchema>['body']
export type CreatePaycheckInput = z.infer<typeof createPaycheckSchema>['body']
export type CreateSavingContributionInput = z.infer<typeof createSavingContributionSchema>['body']
export type CreateSavingGoalInput = z.infer<typeof createSavingGoalSchema>['body']
export type InitializeMonthInput = z.infer<typeof initializeMonthSchema>['body']
export type ListCategoriesQueryInput = z.infer<typeof listCategoriesQuerySchema>['query']
export type UpdateMonthlyObligationInput = z.infer<typeof updateMonthlyObligationSchema>['body']
