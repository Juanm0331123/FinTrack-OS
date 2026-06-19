import type { BudgetBucket, Prisma } from '@prisma/client'

export const financeCategorySelect = {
    budgetBucket: true,
    color: true,
    icon: true,
    id: true,
    isActive: true,
    isSystem: true,
    kind: true,
    name: true,
} satisfies Prisma.CategorySelect

export const financeDebtSelect = {
    closedAt: true,
    createdAt: true,
    currencyCode: true,
    currentPrincipal: true,
    dueDay: true,
    id: true,
    interestRateAnnual: true,
    lenderName: true,
    minimumPaymentAmount: true,
    name: true,
    originalAmount: true,
    statementDay: true,
    status: true,
    termMonths: true,
    type: true,
    updatedAt: true,
} satisfies Prisma.DebtSelect

export const financeMonthlyProfileSelect = {
    carryoverSourceAmount: true,
    carryoverToAvailableAmount: true,
    carryoverToSavingsAmount: true,
    id: true,
    initializedAt: true,
    needsTargetPct: true,
    notes: true,
    openingBalance: true,
    savingsTargetPct: true,
    targetSavingsAmount: true,
    updatedAt: true,
    wantsTargetPct: true,
    yearMonth: true,
} satisfies Prisma.MonthlyFinancialProfileSelect

export const financeObligationTemplateSelect = {
    category: {
        select: financeCategorySelect,
    },
    createdAt: true,
    id: true,
    isActive: true,
    name: true,
    notes: true,
    obligationType: true,
    suggestedAmount: true,
    suggestedDueDay: true,
    updatedAt: true,
} satisfies Prisma.ObligationTemplateSelect

export const financeMonthlyObligationSelect = {
    category: {
        select: financeCategorySelect,
    },
    createdAt: true,
    expectedOn: true,
    id: true,
    name: true,
    notes: true,
    obligationType: true,
    paidAmount: true,
    paidOn: true,
    plannedAmount: true,
    status: true,
    templateId: true,
    transactionId: true,
    updatedAt: true,
    yearMonth: true,
} satisfies Prisma.MonthlyObligationSelect

export const financePaycheckEntrySelect = {
    effectiveMonth: true,
    id: true,
    netReceived: true,
    notes: true,
    paidOn: true,
    salaryBase: true,
    totalDeductions: true,
    transaction: {
        select: {
            amount: true,
            id: true,
            occurredOn: true,
            title: true,
            type: true,
        },
    },
    transportAllowance: true,
} satisfies Prisma.PaycheckEntrySelect

export const financeDebtPaymentEntrySelect = {
    debt: {
        select: {
            currentPrincipal: true,
            id: true,
            minimumPaymentAmount: true,
            name: true,
            status: true,
            termMonths: true,
        },
    },
    effectiveMonth: true,
    extraAmount: true,
    id: true,
    minimumAmount: true,
    notes: true,
    paidOn: true,
    totalAmount: true,
    transaction: {
        select: {
            amount: true,
            id: true,
            occurredOn: true,
            title: true,
            type: true,
        },
    },
} satisfies Prisma.DebtPaymentEntrySelect

export const financeSavingGoalSelect = {
    completedAt: true,
    createdAt: true,
    currentSavedAmount: true,
    id: true,
    name: true,
    priority: true,
    status: true,
    targetAmount: true,
    targetDate: true,
    updatedAt: true,
} satisfies Prisma.SavingGoalSelect

export const financeTransactionSelect = {
    amount: true,
    category: {
        select: {
            budgetBucket: true,
            id: true,
            name: true,
        },
    },
    categoryId: true,
    debtId: true,
    description: true,
    effectiveMonth: true,
    id: true,
    occurredOn: true,
    savingGoal: {
        select: {
            id: true,
            name: true,
        },
    },
    title: true,
    type: true,
} satisfies Prisma.TransactionSelect

export type FinanceCategory = Prisma.CategoryGetPayload<{
    select: typeof financeCategorySelect
}>

export type FinanceDebt = Prisma.DebtGetPayload<{
    select: typeof financeDebtSelect
}>

export type FinanceMonthlyProfile = Prisma.MonthlyFinancialProfileGetPayload<{
    select: typeof financeMonthlyProfileSelect
}>

export type FinanceObligationTemplate = Prisma.ObligationTemplateGetPayload<{
    select: typeof financeObligationTemplateSelect
}>

export type FinanceMonthlyObligation = Prisma.MonthlyObligationGetPayload<{
    select: typeof financeMonthlyObligationSelect
}>

export type FinancePaycheckEntry = Prisma.PaycheckEntryGetPayload<{
    select: typeof financePaycheckEntrySelect
}>

export type FinanceDebtPaymentEntry = Prisma.DebtPaymentEntryGetPayload<{
    select: typeof financeDebtPaymentEntrySelect
}>

export type FinanceSavingGoal = Prisma.SavingGoalGetPayload<{
    select: typeof financeSavingGoalSelect
}>

export type FinanceTransaction = Prisma.TransactionGetPayload<{
    select: typeof financeTransactionSelect
}>

export type CalendarEventKind =
    | 'carryover'
    | 'debt_payment'
    | 'obligation_paid'
    | 'obligation_planned'
    | 'paycheck'
    | 'saving_contribution'

export type CalendarEventItem = {
    amount: number
    date: string
    detail: string
    id: string
    kind: CalendarEventKind
    relatedEntityId?: string
    title: string
}

export type CalendarDaySummary = {
    date: string
    expenseTotal: number
    incomeTotal: number
    items: CalendarEventItem[]
}

export type DashboardMonthSummary = {
    availableBalance: number
    carryoverSourceAmount: number
    debtPaymentTotal: number
    expenseTotal: number
    incomeTotal: number
    openingBalance: number
    savingContributionTotal: number
}

export type DashboardRuleBucket = {
    actualAmount: number
    remainingAmount: number
    status: 'ahead' | 'behind' | 'on_track' | 'over'
    targetAmount: number
    targetPct: number
}

export type DashboardRule503020 = {
    needs: DashboardRuleBucket
    savingsDebt: DashboardRuleBucket
    unassignedExpenseAmount: number
    wants: DashboardRuleBucket
}

export type PendingMonthItem = {
    amount: number
    dueOn: string
    id: string
    isOverdue: boolean
    kind: 'debt' | 'obligation'
    title: string
}

export type DashboardPendingSummary = {
    pendingDebtAmount: number
    pendingObligationsAmount: number
    pendingObligationsCount: number
    upcomingDueItems: PendingMonthItem[]
}

export type DashboardMonthStatus = {
    cues: string[]
    description: string
    title: string
    tone: 'neutral' | 'positive' | 'warning'
}

export type DebtMonthSnapshot = {
    currencyCode: string
    currentPrincipal: number
    dueDay: number | null
    id: string
    lenderName: string | null
    minimumPaymentAmount: number | null
    name: string
    progressPct: number
    status: string
    termMonths: number | null
    type: string
}

export type MonthlyObligationViewModel = {
    amountPaid: number | null
    categoryId: string
    categoryName: string
    expectedOn: string | null
    id: string
    name: string
    obligationType: string
    paidOn: string | null
    plannedAmount: number
    status: string
    templateId: string | null
}

export type SavingGoalSummary = {
    currentSavedAmount: number
    id: string
    name: string
    priority: number | null
    status: string
    targetAmount: number
    targetDate: string | null
}

export type MonthIncomeItem = {
    amount: number
    id: string
    kind: 'EXTRA_INCOME' | 'PAYCHECK'
    notes: string | null
    occurredOn: string
    title: string
    totalDeductions: number | null
    transportAllowance: number | null
}

export type MonthExpenseItem = {
    amount: number
    budgetBucket: BudgetBucket | null
    categoryName: string | null
    id: string
    notes: string | null
    occurredOn: string
    title: string
}

export type MonthDebtPaymentItem = {
    debtId: string
    debtName: string
    extraAmount: number
    id: string
    minimumAmount: number
    notes: string | null
    paidOn: string
    totalAmount: number
}

export type MonthSavingContributionItem = {
    amount: number
    id: string
    notes: string | null
    occurredOn: string
    savingGoalId: string | null
    savingGoalName: string | null
    title: string
}

export type MonthWorkspaceResponse = {
    activity: {
        debtPayments: MonthDebtPaymentItem[]
        expenses: MonthExpenseItem[]
        incomes: MonthIncomeItem[]
        savingContributions: MonthSavingContributionItem[]
    }
    calendarDays: CalendarDaySummary[]
    categories: FinanceCategory[]
    debts: DebtMonthSnapshot[]
    initialization: {
        carryoverSourceAmount: number
        required: boolean
    }
    month: {
        currentDate: string
        nextYearMonth: string
        previousYearMonth: string
        yearMonth: string
    }
    obligationTemplates: FinanceObligationTemplate[]
    obligations: MonthlyObligationViewModel[]
    pendingSummary: DashboardPendingSummary
    profile: FinanceMonthlyProfile
    rule503020: DashboardRule503020
    savingGoals: SavingGoalSummary[]
    summary: DashboardMonthSummary
    monthStatus: DashboardMonthStatus
}
