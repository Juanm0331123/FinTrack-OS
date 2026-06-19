export type BudgetBucket = 'NEEDS' | 'WANTS' | 'SAVINGS_DEBT'

export type DashboardCategory = {
    budgetBucket: BudgetBucket | null
    color: string | null
    icon: string | null
    id: string
    isActive: boolean
    isSystem: boolean
    kind: 'INCOME' | 'EXPENSE'
    name: string
}

export type CalendarEventItem = {
    amount: number
    date: string
    detail: string
    id: string
    kind:
        | 'carryover'
        | 'debt_payment'
        | 'obligation_paid'
        | 'obligation_planned'
        | 'paycheck'
        | 'saving_contribution'
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

export type DashboardMonthProfile = {
    carryoverSourceAmount: number
    carryoverToAvailableAmount: number
    carryoverToSavingsAmount: number
    id: string
    initializedAt: string | null
    needsTargetPct: number
    notes: string | null
    openingBalance: number
    savingsTargetPct: number
    targetSavingsAmount: number | null
    updatedAt: string
    wantsTargetPct: number
    yearMonth: string
}

export type DashboardObligationTemplate = {
    category: DashboardCategory
    createdAt: string
    id: string
    isActive: boolean
    name: string
    notes: string | null
    obligationType: 'FIXED' | 'VARIABLE'
    suggestedAmount: number | null
    suggestedDueDay: number | null
    updatedAt: string
}

export type MonthlyObligationViewModel = {
    amountPaid: number | null
    categoryId: string
    categoryName: string
    expectedOn: string | null
    id: string
    name: string
    obligationType: 'FIXED' | 'VARIABLE'
    paidOn: string | null
    plannedAmount: number
    status: 'DRAFT' | 'PAID' | 'SKIPPED'
    templateId: string | null
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
    status: 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'CANCELED'
    termMonths: number | null
    type: string
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

export type DashboardMonthWorkspace = {
    activity: {
        debtPayments: MonthDebtPaymentItem[]
        expenses: MonthExpenseItem[]
        incomes: MonthIncomeItem[]
        savingContributions: MonthSavingContributionItem[]
    }
    calendarDays: CalendarDaySummary[]
    categories: DashboardCategory[]
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
    monthStatus: DashboardMonthStatus
    obligationTemplates: DashboardObligationTemplate[]
    obligations: MonthlyObligationViewModel[]
    pendingSummary: DashboardPendingSummary
    profile: DashboardMonthProfile
    rule503020: DashboardRule503020
    savingGoals: SavingGoalSummary[]
    summary: DashboardMonthSummary
}

export type CreateCategoryInput = {
    budgetBucket?: BudgetBucket
    color?: string
    icon?: string
    kind?: 'INCOME' | 'EXPENSE'
    name: string
}

export type CreateExpenseInput = {
    amount: number
    categoryId: string
    effectiveMonth?: string
    notes?: string
    occurredOn: string
    title: string
}

export type CreateIncomeInput = {
    amount: number
    effectiveMonth?: string
    notes?: string
    occurredOn: string
    title: string
}

export type CreatePaycheckInput = {
    effectiveMonth?: string
    notes?: string
    paidOn: string
    salaryBase: number
    totalDeductions: number
    transportAllowance: number
}

export type CreateSavingGoalInput = {
    currencyCode?: string
    name: string
    priority?: number
    targetAmount: number
    targetDate?: string
}

export type CreateSavingContributionInput = {
    amount: number
    effectiveMonth?: string
    notes?: string
    occurredOn: string
    savingGoalId?: string
    title: string
}

export type CreateObligationTemplateInput = {
    categoryId: string
    isActive?: boolean
    name: string
    notes?: string
    obligationType: 'FIXED' | 'VARIABLE'
    suggestedAmount?: number
    suggestedDueDay?: number
}

export type CreateMonthlyObligationInput = {
    categoryId: string
    expectedOn?: string
    name: string
    notes?: string
    obligationType: 'FIXED' | 'VARIABLE'
    plannedAmount: number
    templateId?: string
}

export type UpdateMonthlyObligationInput = {
    categoryId?: string
    expectedOn?: string | null
    name?: string
    notes?: string | null
    paidAmount?: number
    paidOn?: string
    plannedAmount?: number
    status?: 'DRAFT' | 'PAID' | 'SKIPPED'
}

export type CreateDebtInput = {
    currentPrincipal?: number
    dueDay?: number
    interestRateAnnual?: number
    lenderName?: string
    minimumPaymentAmount: number
    name: string
    originalAmount: number
    statementDay?: number
    termMonths: number
    type:
        | 'AUTO_LOAN'
        | 'CREDIT_CARD'
        | 'LINE_OF_CREDIT'
        | 'MORTGAGE'
        | 'OTHER'
        | 'PERSONAL_LOAN'
        | 'STUDENT_LOAN'
}

export type CreateDebtPaymentInput = {
    effectiveMonth?: string
    extraAmount: number
    minimumAmount: number
    notes?: string
    paidOn: string
}

export type InitializeMonthInput = {
    carryoverToAvailableAmount: number
    carryoverToSavingsAmount: number
    debtAllocations: Array<{
        amount: number
        debtId: string
    }>
    notes?: string
}
