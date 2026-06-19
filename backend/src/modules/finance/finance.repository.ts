import {
    AccountStatus,
    AccountType,
    CategoryKind,
    DebtStatus,
    SavingGoalStatus,
    type Prisma,
    TransactionStatus,
    TransactionType,
} from '@prisma/client'
import { prisma } from '../../config/prisma.ts'
import type {
    FinanceCategory,
    FinanceDebt,
    FinanceDebtPaymentEntry,
    FinanceMonthlyObligation,
    FinanceMonthlyProfile,
    FinanceObligationTemplate,
    FinancePaycheckEntry,
    FinanceSavingGoal,
    FinanceTransaction,
} from './finance.types.ts'
import {
    financeCategorySelect,
    financeDebtPaymentEntrySelect,
    financeDebtSelect,
    financeMonthlyObligationSelect,
    financeMonthlyProfileSelect,
    financeObligationTemplateSelect,
    financePaycheckEntrySelect,
    financeSavingGoalSelect,
    financeTransactionSelect,
} from './finance.types.ts'
import { getMonthBounds, parseYearMonth } from './finance.utils.ts'

type DbClient = Prisma.TransactionClient | typeof prisma

function getDbClient(transaction?: Prisma.TransactionClient): DbClient {
    return transaction ?? prisma
}

function buildSuggestedDate(yearMonth: string, day?: number | null) {
    if (!day) {
        return undefined
    }

    const { end } = getMonthBounds(yearMonth)
    const { month, year } = parseYearMonth(yearMonth)
    const safeDay = Math.min(day, end.getUTCDate())

    return new Date(Date.UTC(year, month - 1, safeDay))
}

export class FinanceRepository {
    async withTransaction<T>(
        handler: (transaction: Prisma.TransactionClient) => Promise<T>,
    ) {
        return prisma.$transaction((transaction) => handler(transaction))
    }

    findDefaultFinancialAccount(userId: string, transaction?: Prisma.TransactionClient) {
        const db = getDbClient(transaction)

        return db.financialAccount.findFirst({
            where: {
                status: AccountStatus.ACTIVE,
                userId,
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            select: {
                currencyCode: true,
                id: true,
                isDefault: true,
                name: true,
            },
        })
    }

    async ensureDefaultFinancialAccount(
        input: { currencyCode: string; userId: string },
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)
        const existingAccount = await this.findDefaultFinancialAccount(
            input.userId,
            transaction,
        )

        if (existingAccount) {
            if (!existingAccount.isDefault) {
                await db.financialAccount.update({
                    where: {
                        id: existingAccount.id,
                    },
                    data: {
                        isDefault: true,
                    },
                })
            }

            return existingAccount
        }

        return db.financialAccount.create({
            data: {
                currencyCode: input.currencyCode,
                isDefault: true,
                name: 'Disponible',
                type: AccountType.CASH,
                userId: input.userId,
            },
            select: {
                currencyCode: true,
                id: true,
                isDefault: true,
                name: true,
            },
        })
    }

    ensureMonthProfile(
        input: { openingBalance?: number; userId: string; yearMonth: string },
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyFinancialProfile.upsert({
            where: {
                userId_yearMonth: {
                    userId: input.userId,
                    yearMonth: input.yearMonth,
                },
            },
            update: {},
            create: {
                openingBalance: input.openingBalance ?? 0,
                userId: input.userId,
                yearMonth: input.yearMonth,
            },
            select: financeMonthlyProfileSelect,
        })
    }

    updateMonthProfile(
        input: {
            data: Prisma.MonthlyFinancialProfileUpdateInput
            userId: string
            yearMonth: string
        },
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyFinancialProfile.update({
            where: {
                userId_yearMonth: {
                    userId: input.userId,
                    yearMonth: input.yearMonth,
                },
            },
            data: input.data,
            select: financeMonthlyProfileSelect,
        })
    }

    findMonthProfile(
        userId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyFinancialProfile.findUnique({
            where: {
                userId_yearMonth: {
                    userId,
                    yearMonth,
                },
            },
            select: financeMonthlyProfileSelect,
        })
    }

    listCategories(
        userId: string,
        kind: CategoryKind = CategoryKind.EXPENSE,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceCategory[]> {
        const db = getDbClient(transaction)

        return db.category.findMany({
            where: {
                isActive: true,
                kind,
                OR: [{ userId }, { isSystem: true }],
            },
            select: financeCategorySelect,
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        })
    }

    findCategoryById(
        userId: string,
        categoryId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.category.findFirst({
            where: {
                id: categoryId,
                isActive: true,
                kind: CategoryKind.EXPENSE,
                OR: [{ userId }, { isSystem: true }],
            },
            select: financeCategorySelect,
        })
    }

    findCategoryByName(
        userId: string,
        name: string,
        kind: CategoryKind = CategoryKind.EXPENSE,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.category.findFirst({
            where: {
                kind,
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
                OR: [{ userId }, { isSystem: true }],
            },
            select: financeCategorySelect,
        })
    }

    createCategory(
        input: {
            budgetBucket?: Prisma.CategoryUncheckedCreateInput['budgetBucket']
            color?: string
            icon?: string
            kind: CategoryKind
            name: string
            userId: string
        },
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.category.create({
            data: {
                budgetBucket: input.budgetBucket,
                color: input.color,
                icon: input.icon,
                kind: input.kind,
                name: input.name,
                userId: input.userId,
            },
            select: financeCategorySelect,
        })
    }

    listSavingGoals(
        userId: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceSavingGoal[]> {
        const db = getDbClient(transaction)

        return db.savingGoal.findMany({
            where: {
                status: {
                    in: [SavingGoalStatus.ACTIVE, SavingGoalStatus.PAUSED],
                },
                userId,
            },
            select: financeSavingGoalSelect,
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        })
    }

    createSavingGoal(
        input: Prisma.SavingGoalUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.savingGoal.create({
            data: input,
            select: financeSavingGoalSelect,
        })
    }

    findSavingGoalById(
        userId: string,
        savingGoalId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.savingGoal.findFirst({
            where: {
                id: savingGoalId,
                userId,
            },
            select: financeSavingGoalSelect,
        })
    }

    updateSavingGoal(
        savingGoalId: string,
        data: Prisma.SavingGoalUpdateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.savingGoal.update({
            where: {
                id: savingGoalId,
            },
            data,
            select: financeSavingGoalSelect,
        })
    }

    listDebts(userId: string, transaction?: Prisma.TransactionClient): Promise<FinanceDebt[]> {
        const db = getDbClient(transaction)

        return db.debt.findMany({
            where: {
                status: {
                    in: [DebtStatus.ACTIVE, DebtStatus.PAID],
                },
                userId,
            },
            select: financeDebtSelect,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        })
    }

    findDebtById(
        userId: string,
        debtId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.debt.findFirst({
            where: {
                id: debtId,
                userId,
            },
            select: financeDebtSelect,
        })
    }

    createDebt(
        input: Prisma.DebtUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.debt.create({
            data: input,
            select: financeDebtSelect,
        })
    }

    updateDebt(
        debtId: string,
        data: Prisma.DebtUpdateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.debt.update({
            where: {
                id: debtId,
            },
            data,
            select: financeDebtSelect,
        })
    }

    listObligationTemplates(
        userId: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceObligationTemplate[]> {
        const db = getDbClient(transaction)

        return db.obligationTemplate.findMany({
            where: {
                userId,
            },
            select: financeObligationTemplateSelect,
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        })
    }

    findObligationTemplateById(
        userId: string,
        templateId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.obligationTemplate.findFirst({
            where: {
                id: templateId,
                userId,
            },
            select: financeObligationTemplateSelect,
        })
    }

    createObligationTemplate(
        input: Prisma.ObligationTemplateUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.obligationTemplate.create({
            data: input,
            select: financeObligationTemplateSelect,
        })
    }

    async ensureMonthlyObligationsFromTemplates(
        input: { userId: string; yearMonth: string },
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)
        const templates = await db.obligationTemplate.findMany({
            where: {
                isActive: true,
                userId: input.userId,
            },
            select: {
                categoryId: true,
                id: true,
                name: true,
                notes: true,
                obligationType: true,
                suggestedAmount: true,
                suggestedDueDay: true,
            },
        })

        if (templates.length === 0) {
            return []
        }

        const existing = await db.monthlyObligation.findMany({
            where: {
                templateId: {
                    in: templates.map((template) => template.id),
                },
                yearMonth: input.yearMonth,
            },
            select: {
                templateId: true,
            },
        })
        const existingTemplateIds = new Set(
            existing
                .map((item) => item.templateId)
                .filter((templateId): templateId is string => Boolean(templateId)),
        )
        const missing = templates.filter(
            (template) => !existingTemplateIds.has(template.id),
        )

        if (missing.length === 0) {
            return []
        }

        await db.monthlyObligation.createMany({
            data: missing.map((template) => ({
                categoryId: template.categoryId,
                expectedOn: buildSuggestedDate(
                    input.yearMonth,
                    template.suggestedDueDay,
                ),
                name: template.name,
                notes: template.notes,
                obligationType: template.obligationType,
                plannedAmount: template.suggestedAmount ?? 0,
                templateId: template.id,
                userId: input.userId,
                yearMonth: input.yearMonth,
            })),
        })

        return missing
    }

    listMonthlyObligations(
        userId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceMonthlyObligation[]> {
        const db = getDbClient(transaction)

        return db.monthlyObligation.findMany({
            where: {
                userId,
                yearMonth,
            },
            select: financeMonthlyObligationSelect,
            orderBy: [{ expectedOn: 'asc' }, { createdAt: 'asc' }],
        })
    }

    findMonthlyObligationById(
        userId: string,
        obligationId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyObligation.findFirst({
            where: {
                id: obligationId,
                userId,
                yearMonth,
            },
            select: financeMonthlyObligationSelect,
        })
    }

    createMonthlyObligation(
        input: Prisma.MonthlyObligationUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyObligation.create({
            data: input,
            select: financeMonthlyObligationSelect,
        })
    }

    updateMonthlyObligation(
        obligationId: string,
        data: Prisma.MonthlyObligationUncheckedUpdateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyObligation.update({
            where: {
                id: obligationId,
            },
            data,
            select: financeMonthlyObligationSelect,
        })
    }

    createTransaction(
        input: Prisma.TransactionUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.transaction.create({
            data: input,
            select: financeTransactionSelect,
        })
    }

    listMonthTransactions(
        userId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceTransaction[]> {
        const db = getDbClient(transaction)

        return db.transaction.findMany({
            where: {
                status: TransactionStatus.CONFIRMED,
                userId,
                effectiveMonth: yearMonth,
            },
            select: financeTransactionSelect,
            orderBy: [{ occurredOn: 'asc' }, { createdAt: 'asc' }],
        })
    }

    createPaycheckEntry(
        input: Prisma.PaycheckEntryUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.paycheckEntry.create({
            data: input,
            select: financePaycheckEntrySelect,
        })
    }

    listPaycheckEntries(
        userId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinancePaycheckEntry[]> {
        const db = getDbClient(transaction)

        return db.paycheckEntry.findMany({
            where: {
                effectiveMonth: yearMonth,
                userId,
            },
            select: financePaycheckEntrySelect,
            orderBy: [{ paidOn: 'asc' }, { createdAt: 'asc' }],
        })
    }

    createDebtPaymentEntry(
        input: Prisma.DebtPaymentEntryUncheckedCreateInput,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.debtPaymentEntry.create({
            data: input,
            select: financeDebtPaymentEntrySelect,
        })
    }

    listDebtPaymentEntries(
        userId: string,
        yearMonth: string,
        transaction?: Prisma.TransactionClient,
    ): Promise<FinanceDebtPaymentEntry[]> {
        const db = getDbClient(transaction)

        return db.debtPaymentEntry.findMany({
            where: {
                effectiveMonth: yearMonth,
                userId,
            },
            select: financeDebtPaymentEntrySelect,
            orderBy: [{ paidOn: 'asc' }, { createdAt: 'asc' }],
        })
    }

    markMonthlyObligationTransaction(
        obligationId: string,
        transactionId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const db = getDbClient(transaction)

        return db.monthlyObligation.update({
            where: {
                id: obligationId,
            },
            data: {
                transactionId,
            },
            select: financeMonthlyObligationSelect,
        })
    }
}
