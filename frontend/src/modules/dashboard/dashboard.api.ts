'use client'

import { publicEnv } from '@/shared/config/env'
import { refreshSession } from '../auth/auth.api'
import { saveAuthSession } from '../auth/auth.storage'
import type {
    CalendarDaySummary,
    CalendarEventItem,
    CreateCategoryInput,
    CreateDebtInput,
    CreateDebtPaymentInput,
    CreateExpenseInput,
    CreateIncomeInput,
    CreateMonthlyObligationInput,
    CreateObligationTemplateInput,
    CreatePaycheckInput,
    CreateSavingContributionInput,
    CreateSavingGoalInput,
    DashboardCategory,
    DashboardMonthWorkspace,
    DashboardObligationTemplate,
    MonthDebtPaymentItem,
    MonthExpenseItem,
    MonthIncomeItem,
    MonthSavingContributionItem,
    MonthlyObligationViewModel,
    InitializeMonthInput,
    PendingMonthItem,
    SavingGoalSummary,
    UpdateMonthlyObligationInput,
} from './dashboard.types'

type DashboardSuccessPayload<T> = {
    data: T
    success: true
}

type DashboardErrorPayload = {
    code?: string
    details?: Record<string, unknown>
    errors?: Array<{ field: string; message: string }>
    message: string
    success: false
}

type NumberLike = number | string

type RawDashboardCategory = DashboardCategory

type RawCalendarEventItem = Omit<CalendarEventItem, 'amount'> & {
    amount: NumberLike
}

type RawCalendarDaySummary = Omit<
    CalendarDaySummary,
    'expenseTotal' | 'incomeTotal' | 'items'
> & {
    expenseTotal: NumberLike
    incomeTotal: NumberLike
    items: RawCalendarEventItem[]
}

type RawDashboardObligationTemplate = Omit<
    DashboardObligationTemplate,
    'suggestedAmount'
> & {
    suggestedAmount: NumberLike | null
}

type RawMonthlyObligationViewModel = Omit<
    MonthlyObligationViewModel,
    'amountPaid' | 'plannedAmount'
> & {
    amountPaid: NumberLike | null
    plannedAmount: NumberLike
}

type RawPendingMonthItem = Omit<PendingMonthItem, 'amount'> & {
    amount: NumberLike
}

type RawSavingGoalSummary = Omit<
    SavingGoalSummary,
    'currentSavedAmount' | 'priority' | 'targetAmount'
> & {
    currentSavedAmount: NumberLike
    priority: number | null
    targetAmount: NumberLike
}

type RawMonthIncomeItem = Omit<
    MonthIncomeItem,
    'amount' | 'totalDeductions' | 'transportAllowance'
> & {
    amount: NumberLike
    totalDeductions: NumberLike | null
    transportAllowance: NumberLike | null
}

type RawMonthExpenseItem = Omit<MonthExpenseItem, 'amount'> & {
    amount: NumberLike
}

type RawMonthDebtPaymentItem = Omit<
    MonthDebtPaymentItem,
    'extraAmount' | 'minimumAmount' | 'totalAmount'
> & {
    extraAmount: NumberLike
    minimumAmount: NumberLike
    totalAmount: NumberLike
}

type RawMonthSavingContributionItem = Omit<
    MonthSavingContributionItem,
    'amount'
> & {
    amount: NumberLike
}

type RawDashboardMonthWorkspace = Omit<
    DashboardMonthWorkspace,
    | 'activity'
    | 'calendarDays'
    | 'obligationTemplates'
    | 'obligations'
    | 'pendingSummary'
    | 'profile'
    | 'rule503020'
    | 'savingGoals'
    | 'summary'
> & {
    activity: {
        debtPayments: RawMonthDebtPaymentItem[]
        expenses: RawMonthExpenseItem[]
        incomes: RawMonthIncomeItem[]
        savingContributions: RawMonthSavingContributionItem[]
    }
    calendarDays: RawCalendarDaySummary[]
    categories: RawDashboardCategory[]
    obligationTemplates: RawDashboardObligationTemplate[]
    obligations: RawMonthlyObligationViewModel[]
    pendingSummary: {
        pendingDebtAmount: NumberLike
        pendingObligationsAmount: NumberLike
        pendingObligationsCount: number
        upcomingDueItems: RawPendingMonthItem[]
    }
    profile: {
        carryoverSourceAmount: NumberLike
        carryoverToAvailableAmount: NumberLike
        carryoverToSavingsAmount: NumberLike
        id: string
        initializedAt: string | null
        needsTargetPct: NumberLike
        notes: string | null
        openingBalance: NumberLike
        savingsTargetPct: NumberLike
        targetSavingsAmount: NumberLike | null
        updatedAt: string
        wantsTargetPct: NumberLike
        yearMonth: string
    }
    rule503020: {
        needs: {
            actualAmount: NumberLike
            remainingAmount: NumberLike
            status: 'ahead' | 'behind' | 'on_track' | 'over'
            targetAmount: NumberLike
            targetPct: NumberLike
        }
        savingsDebt: {
            actualAmount: NumberLike
            remainingAmount: NumberLike
            status: 'ahead' | 'behind' | 'on_track' | 'over'
            targetAmount: NumberLike
            targetPct: NumberLike
        }
        unassignedExpenseAmount: NumberLike
        wants: {
            actualAmount: NumberLike
            remainingAmount: NumberLike
            status: 'ahead' | 'behind' | 'on_track' | 'over'
            targetAmount: NumberLike
            targetPct: NumberLike
        }
    }
    savingGoals: RawSavingGoalSummary[]
    summary: {
        availableBalance: NumberLike
        carryoverSourceAmount: NumberLike
        debtPaymentTotal: NumberLike
        expenseTotal: NumberLike
        incomeTotal: NumberLike
        openingBalance: NumberLike
        savingContributionTotal: NumberLike
    }
}

type RequestOptions = {
    accessToken: string
    body?: Record<string, unknown>
    method?: 'GET' | 'PATCH' | 'POST'
    retryOnUnauthorized?: boolean
}

export class DashboardApiError extends Error {
    readonly code?: string
    readonly details?: Record<string, unknown>
    readonly errors?: Array<{ field: string; message: string }>
    readonly status: number

    constructor(status: number, payload: DashboardErrorPayload) {
        super(payload.message)
        this.code = payload.code
        this.details = payload.details
        this.errors = payload.errors
        this.name = 'DashboardApiError'
        this.status = status
    }
}

function toNumber(value: unknown) {
    if (typeof value === 'number') {
        return value
    }

    return Number(value ?? 0)
}

function normalizeWorkspaceResponse(
    rawWorkspace: RawDashboardMonthWorkspace,
): DashboardMonthWorkspace {
    return {
        ...rawWorkspace,
        activity: {
            debtPayments: rawWorkspace.activity.debtPayments.map((payment) => ({
                ...payment,
                extraAmount: toNumber(payment.extraAmount),
                minimumAmount: toNumber(payment.minimumAmount),
                totalAmount: toNumber(payment.totalAmount),
            })),
            expenses: rawWorkspace.activity.expenses.map((expense) => ({
                ...expense,
                amount: toNumber(expense.amount),
            })),
            incomes: rawWorkspace.activity.incomes.map((income) => ({
                ...income,
                amount: toNumber(income.amount),
                totalDeductions:
                    income.totalDeductions === null
                        ? null
                        : toNumber(income.totalDeductions),
                transportAllowance:
                    income.transportAllowance === null
                        ? null
                        : toNumber(income.transportAllowance),
            })),
            savingContributions: rawWorkspace.activity.savingContributions.map(
                (contribution) => ({
                    ...contribution,
                    amount: toNumber(contribution.amount),
                }),
            ),
        },
        calendarDays: rawWorkspace.calendarDays.map((day) => ({
            ...day,
            expenseTotal: toNumber(day.expenseTotal),
            incomeTotal: toNumber(day.incomeTotal),
            items: day.items.map((item) => ({
                ...item,
                amount: toNumber(item.amount),
            })),
        })),
        debts: rawWorkspace.debts.map((debt) => ({
            ...debt,
            currentPrincipal: toNumber(debt.currentPrincipal),
            minimumPaymentAmount:
                debt.minimumPaymentAmount === null
                    ? null
                    : toNumber(debt.minimumPaymentAmount),
            progressPct: toNumber(debt.progressPct),
        })),
        obligationTemplates: rawWorkspace.obligationTemplates.map((template) => ({
            ...template,
            suggestedAmount:
                template.suggestedAmount === null
                    ? null
                    : toNumber(template.suggestedAmount),
        })),
        obligations: rawWorkspace.obligations.map((obligation) => ({
            ...obligation,
            amountPaid:
                obligation.amountPaid === null
                    ? null
                    : toNumber(obligation.amountPaid),
            plannedAmount: toNumber(obligation.plannedAmount),
        })),
        pendingSummary: {
            ...rawWorkspace.pendingSummary,
            pendingDebtAmount: toNumber(rawWorkspace.pendingSummary.pendingDebtAmount),
            pendingObligationsAmount: toNumber(
                rawWorkspace.pendingSummary.pendingObligationsAmount,
            ),
            upcomingDueItems: rawWorkspace.pendingSummary.upcomingDueItems.map(
                (item) => ({
                    ...item,
                    amount: toNumber(item.amount),
                }),
            ),
        },
        profile: {
            ...rawWorkspace.profile,
            carryoverSourceAmount: toNumber(rawWorkspace.profile.carryoverSourceAmount),
            carryoverToAvailableAmount: toNumber(
                rawWorkspace.profile.carryoverToAvailableAmount,
            ),
            carryoverToSavingsAmount: toNumber(
                rawWorkspace.profile.carryoverToSavingsAmount,
            ),
            needsTargetPct: toNumber(rawWorkspace.profile.needsTargetPct),
            openingBalance: toNumber(rawWorkspace.profile.openingBalance),
            savingsTargetPct: toNumber(rawWorkspace.profile.savingsTargetPct),
            targetSavingsAmount:
                rawWorkspace.profile.targetSavingsAmount === null
                    ? null
                    : toNumber(rawWorkspace.profile.targetSavingsAmount),
            wantsTargetPct: toNumber(rawWorkspace.profile.wantsTargetPct),
        },
        rule503020: {
            needs: {
                ...rawWorkspace.rule503020.needs,
                actualAmount: toNumber(rawWorkspace.rule503020.needs.actualAmount),
                remainingAmount: toNumber(
                    rawWorkspace.rule503020.needs.remainingAmount,
                ),
                targetAmount: toNumber(rawWorkspace.rule503020.needs.targetAmount),
                targetPct: toNumber(rawWorkspace.rule503020.needs.targetPct),
            },
            savingsDebt: {
                ...rawWorkspace.rule503020.savingsDebt,
                actualAmount: toNumber(
                    rawWorkspace.rule503020.savingsDebt.actualAmount,
                ),
                remainingAmount: toNumber(
                    rawWorkspace.rule503020.savingsDebt.remainingAmount,
                ),
                targetAmount: toNumber(
                    rawWorkspace.rule503020.savingsDebt.targetAmount,
                ),
                targetPct: toNumber(rawWorkspace.rule503020.savingsDebt.targetPct),
            },
            unassignedExpenseAmount: toNumber(
                rawWorkspace.rule503020.unassignedExpenseAmount,
            ),
            wants: {
                ...rawWorkspace.rule503020.wants,
                actualAmount: toNumber(rawWorkspace.rule503020.wants.actualAmount),
                remainingAmount: toNumber(
                    rawWorkspace.rule503020.wants.remainingAmount,
                ),
                targetAmount: toNumber(rawWorkspace.rule503020.wants.targetAmount),
                targetPct: toNumber(rawWorkspace.rule503020.wants.targetPct),
            },
        },
        savingGoals: rawWorkspace.savingGoals.map((goal) => ({
            ...goal,
            currentSavedAmount: toNumber(goal.currentSavedAmount),
            targetAmount: toNumber(goal.targetAmount),
        })),
        summary: {
            ...rawWorkspace.summary,
            availableBalance: toNumber(rawWorkspace.summary.availableBalance),
            carryoverSourceAmount: toNumber(
                rawWorkspace.summary.carryoverSourceAmount,
            ),
            debtPaymentTotal: toNumber(rawWorkspace.summary.debtPaymentTotal),
            expenseTotal: toNumber(rawWorkspace.summary.expenseTotal),
            incomeTotal: toNumber(rawWorkspace.summary.incomeTotal),
            openingBalance: toNumber(rawWorkspace.summary.openingBalance),
            savingContributionTotal: toNumber(
                rawWorkspace.summary.savingContributionTotal,
            ),
        },
    }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
    const response = await fetch(`${publicEnv.backendUrl}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.accessToken}`,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const payload = (await response.json()) as
        | DashboardErrorPayload
        | DashboardSuccessPayload<T>

    if (response.status === 401 && options.retryOnUnauthorized !== false) {
        try {
            const refreshedSession = await refreshSession()
            saveAuthSession(refreshedSession)

            return request<T>(path, {
                ...options,
                accessToken: refreshedSession.accessToken,
                retryOnUnauthorized: false,
            })
        } catch {
            // Fall through to the original unauthorized response.
        }
    }

    if (!response.ok || !payload.success) {
        throw new DashboardApiError(
            response.status,
            payload as DashboardErrorPayload,
        )
    }

    return payload.data
}

export async function getMonthWorkspace(accessToken: string, yearMonth: string) {
    const workspace = await request<RawDashboardMonthWorkspace>(
        `/api/months/${yearMonth}/workspace`,
        {
            accessToken,
            method: 'GET',
        },
    )

    return normalizeWorkspaceResponse(workspace)
}

export async function initializeMonth(
    accessToken: string,
    yearMonth: string,
    input: InitializeMonthInput,
) {
    const workspace = await request<RawDashboardMonthWorkspace>(
        `/api/months/${yearMonth}/initialize`,
        {
            accessToken,
            body: input,
            method: 'POST',
        },
    )

    return normalizeWorkspaceResponse(workspace)
}

export function createCategory(accessToken: string, input: CreateCategoryInput) {
    return request('/api/categories', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createExpense(accessToken: string, input: CreateExpenseInput) {
    return request('/api/expenses', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createIncome(accessToken: string, input: CreateIncomeInput) {
    return request('/api/incomes', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createPaycheck(accessToken: string, input: CreatePaycheckInput) {
    return request('/api/paychecks', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createSavingGoal(
    accessToken: string,
    input: CreateSavingGoalInput,
) {
    return request('/api/saving-goals', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createSavingContribution(
    accessToken: string,
    input: CreateSavingContributionInput,
) {
    return request('/api/saving-contributions', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createObligationTemplate(
    accessToken: string,
    input: CreateObligationTemplateInput,
) {
    return request<{ id: string }>('/api/obligations/templates', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createMonthlyObligation(
    accessToken: string,
    yearMonth: string,
    input: CreateMonthlyObligationInput,
) {
    return request(`/api/months/${yearMonth}/obligations`, {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function copyPreviousMonthObligations(
    accessToken: string,
    yearMonth: string,
) {
    const workspace = request<RawDashboardMonthWorkspace>(
        `/api/months/${yearMonth}/obligations/copy-previous`,
        {
            accessToken,
            method: 'POST',
        },
    )

    return workspace.then(normalizeWorkspaceResponse)
}

export function updateMonthlyObligation(
    accessToken: string,
    yearMonth: string,
    obligationId: string,
    input: UpdateMonthlyObligationInput,
) {
    return request(`/api/months/${yearMonth}/obligations/${obligationId}`, {
        accessToken,
        body: input,
        method: 'PATCH',
    })
}

export function createDebt(accessToken: string, input: CreateDebtInput) {
    return request('/api/debts', {
        accessToken,
        body: input,
        method: 'POST',
    })
}

export function createDebtPayment(
    accessToken: string,
    debtId: string,
    input: CreateDebtPaymentInput,
) {
    return request(`/api/debts/${debtId}/payments`, {
        accessToken,
        body: input,
        method: 'POST',
    })
}
