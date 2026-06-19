import {
    BudgetBucket,
    CategoryKind,
    DebtStatus,
    MonthlyObligationStatus,
    SavingGoalStatus,
    TransactionType,
} from '@prisma/client'
import {
    ConflictError,
    NotFoundError,
    RequestValidationError,
} from '../../utils/app-error.ts'
import type { PublicUser } from '../users/users.types.ts'
import { FinanceRepository } from './finance.repository.ts'
import type {
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
    InitializeMonthInput,
    ListCategoriesQueryInput,
    UpdateMonthlyObligationInput,
} from './finance.schemas.ts'
import type {
    CalendarDaySummary,
    CalendarEventItem,
    DashboardMonthStatus,
    DashboardMonthSummary,
    DashboardPendingSummary,
    DashboardRule503020,
    DebtMonthSnapshot,
    FinanceDebt,
    FinanceMonthlyObligation,
    FinanceMonthlyProfile,
    FinanceSavingGoal,
    FinanceTransaction,
    MonthDebtPaymentItem,
    MonthExpenseItem,
    MonthIncomeItem,
    MonthSavingContributionItem,
    MonthWorkspaceResponse,
    MonthlyObligationViewModel,
    PendingMonthItem,
    SavingGoalSummary,
} from './finance.types.ts'
import {
    decimalToNumber,
    getCurrentYearMonth,
    getMonthBounds,
    getNextYearMonth,
    getPreviousYearMonth,
    roundCurrency,
    toDateOnly,
    toIsoDate,
} from './finance.utils.ts'

export class FinanceService {
    private readonly financeRepository: FinanceRepository

    constructor(financeRepository = new FinanceRepository()) {
        this.financeRepository = financeRepository
    }

    async getMonthWorkspace(
        user: PublicUser,
        yearMonth = getCurrentYearMonth(),
    ): Promise<MonthWorkspaceResponse> {
        await this.financeRepository.ensureDefaultFinancialAccount({
            currencyCode: user.preferredCurrencyCode,
            userId: user.id,
        })

        const profile = await this.financeRepository.ensureMonthProfile({
            userId: user.id,
            yearMonth,
        })

        await this.financeRepository.ensureMonthlyObligationsFromTemplates({
            userId: user.id,
            yearMonth,
        })

        return this.buildMonthWorkspace(user, yearMonth, profile)
    }

    async initializeMonth(
        user: PublicUser,
        yearMonth: string,
        input: InitializeMonthInput,
    ) {
        await this.financeRepository.withTransaction(async (transaction) => {
            const profile = await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth,
                },
                transaction,
            )

            if (profile.initializedAt) {
                throw new ConflictError('Este mes ya fue inicializado.')
            }

            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode: user.preferredCurrencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const carryoverSourceAmount = await this.computeCarryoverSource(
                user.id,
                yearMonth,
            )
            const debtAllocationTotal = roundCurrency(
                input.debtAllocations.reduce(
                    (sum, allocation) => sum + allocation.amount,
                    0,
                ),
            )
            const totalAssigned = roundCurrency(
                input.carryoverToAvailableAmount +
                    input.carryoverToSavingsAmount +
                    debtAllocationTotal,
            )

            if (roundCurrency(totalAssigned) !== roundCurrency(carryoverSourceAmount)) {
                throw new RequestValidationError(
                    'Debes distribuir todo el saldo sobrante.',
                    [
                        {
                            field: 'carryover',
                            message:
                                'La suma de disponible, ahorro y deuda debe ser igual al saldo arrastrado.',
                        },
                    ],
                )
            }

            const monthStartDate = getMonthBounds(yearMonth).start

            await this.financeRepository.updateMonthProfile(
                {
                    userId: user.id,
                    yearMonth,
                    data: {
                        carryoverSourceAmount,
                        carryoverToAvailableAmount: input.carryoverToAvailableAmount,
                        carryoverToSavingsAmount: input.carryoverToSavingsAmount,
                        initializedAt: new Date(),
                        notes: input.notes,
                        openingBalance: input.carryoverToAvailableAmount,
                    },
                },
                transaction,
            )

            if (input.carryoverToSavingsAmount > 0) {
                await this.financeRepository.createTransaction(
                    {
                        accountId: defaultAccount.id,
                        amount: input.carryoverToSavingsAmount,
                        currencyCode: user.preferredCurrencyCode,
                        description: 'Asignacion de saldo arrastrado al ahorro.',
                        effectiveMonth: yearMonth,
                        occurredOn: monthStartDate,
                        title: 'Ahorro desde saldo arrastrado',
                        type: TransactionType.SAVING_CONTRIBUTION,
                        userId: user.id,
                    },
                    transaction,
                )
            }

            for (const allocation of input.debtAllocations) {
                const debt = await this.financeRepository.findDebtById(
                    user.id,
                    allocation.debtId,
                    transaction,
                )

                if (!debt) {
                    throw new NotFoundError('La deuda seleccionada no existe.')
                }

                const transactionRecord =
                    await this.financeRepository.createTransaction(
                        {
                            accountId: defaultAccount.id,
                            amount: allocation.amount,
                            currencyCode: debt.currencyCode,
                            debtId: debt.id,
                            description: 'Asignacion de saldo arrastrado a deuda.',
                            effectiveMonth: yearMonth,
                            occurredOn: monthStartDate,
                            title: `Abono desde saldo arrastrado - ${debt.name}`,
                            type: TransactionType.DEBT_PAYMENT,
                            userId: user.id,
                        },
                        transaction,
                    )

                await this.financeRepository.createDebtPaymentEntry(
                    {
                        debtId: debt.id,
                        effectiveMonth: yearMonth,
                        extraAmount: allocation.amount,
                        minimumAmount: 0,
                        paidOn: monthStartDate,
                        totalAmount: allocation.amount,
                        transactionId: transactionRecord.id,
                        userId: user.id,
                    },
                    transaction,
                )

                const nextPrincipal = roundCurrency(
                    Math.max(
                        0,
                        decimalToNumber(debt.currentPrincipal) - allocation.amount,
                    ),
                )

                await this.financeRepository.updateDebt(
                    debt.id,
                    {
                        closedAt: nextPrincipal === 0 ? new Date() : null,
                        currentPrincipal: nextPrincipal,
                        status:
                            nextPrincipal === 0 ? DebtStatus.PAID : DebtStatus.ACTIVE,
                    },
                    transaction,
                )
            }
        })

        const profile = await this.financeRepository.findMonthProfile(
            user.id,
            yearMonth,
        )

        return this.buildMonthWorkspace(user, yearMonth, profile)
    }

    async listCategories(user: PublicUser, query: ListCategoriesQueryInput) {
        return this.financeRepository.listCategories(user.id, query.kind)
    }

    async createCategory(user: PublicUser, input: CreateCategoryInput) {
        const existingCategory = await this.financeRepository.findCategoryByName(
            user.id,
            input.name,
            input.kind,
        )

        if (existingCategory && !existingCategory.isSystem) {
            throw new ConflictError('Ya existe una categoria con ese nombre.')
        }

        return this.financeRepository.createCategory({
            budgetBucket: input.budgetBucket,
            color: input.color,
            icon: input.icon,
            kind: input.kind,
            name: input.name,
            userId: user.id,
        })
    }

    async createExpense(user: PublicUser, input: CreateExpenseInput) {
        await this.ensureExpenseCategory(user.id, input.categoryId)

        return this.financeRepository.withTransaction(async (transaction) => {
            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode: user.preferredCurrencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const effectiveMonth = input.effectiveMonth ?? input.occurredOn.slice(0, 7)

            await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth: effectiveMonth,
                },
                transaction,
            )

            return this.financeRepository.createTransaction(
                {
                    accountId: defaultAccount.id,
                    amount: input.amount,
                    categoryId: input.categoryId,
                    currencyCode: user.preferredCurrencyCode,
                    description: input.notes,
                    effectiveMonth,
                    occurredOn: toDateOnly(input.occurredOn),
                    title: input.title,
                    type: TransactionType.EXPENSE,
                    userId: user.id,
                },
                transaction,
            )
        })
    }

    async createIncome(user: PublicUser, input: CreateIncomeInput) {
        return this.financeRepository.withTransaction(async (transaction) => {
            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode: user.preferredCurrencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const effectiveMonth = input.effectiveMonth ?? input.occurredOn.slice(0, 7)

            await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth: effectiveMonth,
                },
                transaction,
            )

            return this.financeRepository.createTransaction(
                {
                    accountId: defaultAccount.id,
                    amount: input.amount,
                    currencyCode: user.preferredCurrencyCode,
                    description: input.notes,
                    effectiveMonth,
                    occurredOn: toDateOnly(input.occurredOn),
                    title: input.title,
                    type: TransactionType.INCOME,
                    userId: user.id,
                },
                transaction,
            )
        })
    }

    async listObligationTemplates(user: PublicUser) {
        return this.financeRepository.listObligationTemplates(user.id)
    }

    async createObligationTemplate(
        user: PublicUser,
        input: CreateObligationTemplateInput,
    ) {
        await this.ensureExpenseCategory(user.id, input.categoryId)

        return this.financeRepository.createObligationTemplate({
            categoryId: input.categoryId,
            isActive: input.isActive,
            name: input.name,
            notes: input.notes,
            obligationType: input.obligationType,
            suggestedAmount: input.suggestedAmount,
            suggestedDueDay: input.suggestedDueDay,
            userId: user.id,
        })
    }

    async createMonthlyObligation(
        user: PublicUser,
        yearMonth: string,
        input: CreateMonthlyObligationInput,
    ) {
        await this.ensureExpenseCategory(user.id, input.categoryId)

        if (input.templateId) {
            const template = await this.financeRepository.findObligationTemplateById(
                user.id,
                input.templateId,
            )

            if (!template) {
                throw new NotFoundError('La plantilla seleccionada no existe.')
            }
        }

        await this.financeRepository.ensureMonthProfile({
            userId: user.id,
            yearMonth,
        })

        return this.financeRepository.createMonthlyObligation({
            categoryId: input.categoryId,
            expectedOn: input.expectedOn ? toDateOnly(input.expectedOn) : undefined,
            name: input.name,
            notes: input.notes,
            obligationType: input.obligationType,
            plannedAmount: input.plannedAmount,
            templateId: input.templateId,
            userId: user.id,
            yearMonth,
        })
    }

    async copyPreviousMonthObligations(user: PublicUser, yearMonth: string) {
        await this.financeRepository.withTransaction(async (transaction) => {
            await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth,
                },
                transaction,
            )

            await this.financeRepository.ensureMonthlyObligationsFromTemplates(
                {
                    userId: user.id,
                    yearMonth,
                },
                transaction,
            )

            const previousYearMonth = getPreviousYearMonth(yearMonth)
            const [previousObligations, currentObligations] = await Promise.all([
                this.financeRepository.listMonthlyObligations(
                    user.id,
                    previousYearMonth,
                    transaction,
                ),
                this.financeRepository.listMonthlyObligations(
                    user.id,
                    yearMonth,
                    transaction,
                ),
            ])

            if (previousObligations.length === 0) {
                return
            }

            const currentByTemplateId = new Map(
                currentObligations
                    .filter(
                        (obligation): obligation is FinanceMonthlyObligation & {
                            templateId: string
                        } => Boolean(obligation.templateId),
                    )
                    .map((obligation) => [obligation.templateId, obligation]),
            )
            const manualCurrentKeys = new Set(
                currentObligations
                    .filter((obligation) => !obligation.templateId)
                    .map((obligation) =>
                        this.buildManualObligationKey(
                            obligation.category.id,
                            obligation.name,
                        ),
                    ),
            )

            for (const previousObligation of previousObligations) {
                const alignedExpectedOn = this.alignDateToMonth(
                    previousObligation.expectedOn,
                    yearMonth,
                )

                if (previousObligation.templateId) {
                    const currentObligation = currentByTemplateId.get(
                        previousObligation.templateId,
                    )

                    if (
                        currentObligation &&
                        !currentObligation.transactionId &&
                        currentObligation.status === MonthlyObligationStatus.DRAFT
                    ) {
                        await this.financeRepository.updateMonthlyObligation(
                            currentObligation.id,
                            {
                                categoryId: previousObligation.category.id,
                                expectedOn:
                                    alignedExpectedOn ??
                                    currentObligation.expectedOn ??
                                    undefined,
                                name: previousObligation.name,
                                notes: previousObligation.notes,
                                obligationType: previousObligation.obligationType,
                                plannedAmount: decimalToNumber(
                                    previousObligation.plannedAmount,
                                ),
                            },
                            transaction,
                        )
                    }

                    continue
                }

                const manualKey = this.buildManualObligationKey(
                    previousObligation.category.id,
                    previousObligation.name,
                )

                if (manualCurrentKeys.has(manualKey)) {
                    continue
                }

                await this.financeRepository.createMonthlyObligation(
                    {
                        categoryId: previousObligation.category.id,
                        expectedOn: alignedExpectedOn,
                        name: previousObligation.name,
                        notes: previousObligation.notes,
                        obligationType: previousObligation.obligationType,
                        plannedAmount: decimalToNumber(previousObligation.plannedAmount),
                        userId: user.id,
                        yearMonth,
                    },
                    transaction,
                )

                manualCurrentKeys.add(manualKey)
            }
        })

        const profile = await this.financeRepository.findMonthProfile(user.id, yearMonth)

        return this.buildMonthWorkspace(user, yearMonth, profile)
    }

    async updateMonthlyObligation(
        user: PublicUser,
        yearMonth: string,
        obligationId: string,
        input: UpdateMonthlyObligationInput,
    ) {
        const currentObligation =
            await this.financeRepository.findMonthlyObligationById(
                user.id,
                obligationId,
                yearMonth,
            )

        if (!currentObligation) {
            throw new NotFoundError('La obligacion del mes no existe.')
        }

        if (input.categoryId) {
            await this.ensureExpenseCategory(user.id, input.categoryId)
        }

        if (input.status === MonthlyObligationStatus.PAID) {
            if (currentObligation.transactionId) {
                throw new ConflictError(
                    'Esta obligacion ya fue registrada como pagada.',
                )
            }

            if (!input.paidOn) {
                throw new RequestValidationError('Debes indicar la fecha de pago.', [
                    {
                        field: 'paidOn',
                        message:
                            'La fecha de pago es obligatoria cuando marcas la obligacion como pagada.',
                    },
                ])
            }

            const paidOn = input.paidOn

            return this.financeRepository.withTransaction(async (transaction) => {
                const defaultAccount =
                    await this.financeRepository.ensureDefaultFinancialAccount(
                        {
                            currencyCode: user.preferredCurrencyCode,
                            userId: user.id,
                        },
                        transaction,
                    )
                const amountToPay =
                    input.paidAmount ?? decimalToNumber(currentObligation.plannedAmount)
                const categoryId = input.categoryId ?? currentObligation.category.id
                const paidOnDate = toDateOnly(paidOn)
                const transactionRecord =
                    await this.financeRepository.createTransaction(
                        {
                            accountId: defaultAccount.id,
                            amount: amountToPay,
                            categoryId,
                            currencyCode: user.preferredCurrencyCode,
                            description:
                                input.notes ??
                                currentObligation.notes ??
                                'Pago de obligacion mensual.',
                            effectiveMonth: yearMonth,
                            occurredOn: paidOnDate,
                            title: input.name ?? currentObligation.name,
                            type: TransactionType.EXPENSE,
                            userId: user.id,
                        },
                        transaction,
                    )

                return this.financeRepository.updateMonthlyObligation(
                    obligationId,
                    {
                        categoryId,
                        expectedOn:
                            input.expectedOn === null
                                ? null
                                : input.expectedOn
                                  ? toDateOnly(input.expectedOn)
                                  : undefined,
                        name: input.name,
                        notes:
                            input.notes === null
                                ? null
                                : (input.notes ?? currentObligation.notes),
                        paidAmount: amountToPay,
                        paidOn: paidOnDate,
                        plannedAmount: input.plannedAmount,
                        status: MonthlyObligationStatus.PAID,
                        transactionId: transactionRecord.id,
                    },
                    transaction,
                )
            })
        }

        if (
            currentObligation.transactionId &&
            input.status !== undefined
        ) {
            throw new ConflictError(
                'No puedes cambiar el estado de una obligacion que ya tiene un pago vinculado.',
            )
        }

        return this.financeRepository.updateMonthlyObligation(obligationId, {
            categoryId: input.categoryId,
            expectedOn:
                input.expectedOn === null
                    ? null
                    : input.expectedOn
                      ? toDateOnly(input.expectedOn)
                      : undefined,
            name: input.name,
            notes: input.notes === null ? null : input.notes,
            paidAmount:
                input.status === MonthlyObligationStatus.SKIPPED
                    ? null
                    : input.paidAmount,
            paidOn:
                input.status === MonthlyObligationStatus.SKIPPED
                    ? null
                    : input.paidOn
                      ? toDateOnly(input.paidOn)
                      : undefined,
            plannedAmount: input.plannedAmount,
            status: input.status,
        })
    }

    async listDebts(user: PublicUser) {
        return this.financeRepository.listDebts(user.id)
    }

    async createDebt(user: PublicUser, input: CreateDebtInput) {
        return this.financeRepository.createDebt({
            currencyCode: input.currencyCode ?? user.preferredCurrencyCode,
            currentPrincipal: input.currentPrincipal ?? input.originalAmount,
            dueDay: input.dueDay,
            interestRateAnnual: input.interestRateAnnual,
            lenderName: input.lenderName,
            minimumPaymentAmount: input.minimumPaymentAmount,
            name: input.name,
            originalAmount: input.originalAmount,
            statementDay: input.statementDay,
            termMonths: input.termMonths,
            type: input.type,
            userId: user.id,
        })
    }

    async createDebtPayment(
        user: PublicUser,
        debtId: string,
        input: CreateDebtPaymentInput,
    ) {
        return this.financeRepository.withTransaction(async (transaction) => {
            const debt = await this.financeRepository.findDebtById(
                user.id,
                debtId,
                transaction,
            )

            if (!debt) {
                throw new NotFoundError('La deuda seleccionada no existe.')
            }

            const effectiveMonth = input.effectiveMonth ?? input.paidOn.slice(0, 7)
            const totalAmount = roundCurrency(input.minimumAmount + input.extraAmount)
            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode: debt.currencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const transactionRecord = await this.financeRepository.createTransaction(
                {
                    accountId: defaultAccount.id,
                    amount: totalAmount,
                    currencyCode: debt.currencyCode,
                    debtId: debt.id,
                    description: input.notes ?? 'Pago mensual de deuda.',
                    effectiveMonth,
                    occurredOn: toDateOnly(input.paidOn),
                    title: `Pago de deuda - ${debt.name}`,
                    type: TransactionType.DEBT_PAYMENT,
                    userId: user.id,
                },
                transaction,
            )

            const paymentEntry = await this.financeRepository.createDebtPaymentEntry(
                {
                    debtId: debt.id,
                    effectiveMonth,
                    extraAmount: input.extraAmount,
                    minimumAmount: input.minimumAmount,
                    notes: input.notes,
                    paidOn: toDateOnly(input.paidOn),
                    totalAmount,
                    transactionId: transactionRecord.id,
                    userId: user.id,
                },
                transaction,
            )
            const nextPrincipal = roundCurrency(
                Math.max(0, decimalToNumber(debt.currentPrincipal) - totalAmount),
            )

            await this.financeRepository.updateDebt(
                debt.id,
                {
                    closedAt: nextPrincipal === 0 ? new Date() : null,
                    currentPrincipal: nextPrincipal,
                    status: nextPrincipal === 0 ? DebtStatus.PAID : DebtStatus.ACTIVE,
                },
                transaction,
            )

            return paymentEntry
        })
    }

    async createPaycheck(user: PublicUser, input: CreatePaycheckInput) {
        return this.financeRepository.withTransaction(async (transaction) => {
            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode: user.preferredCurrencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const effectiveMonth = input.effectiveMonth ?? input.paidOn.slice(0, 7)
            const netReceived = roundCurrency(
                input.salaryBase + input.transportAllowance - input.totalDeductions,
            )

            if (netReceived <= 0) {
                throw new RequestValidationError(
                    'El salario neto debe ser mayor a cero.',
                    [
                        {
                            field: 'salaryBase',
                            message:
                                'Verifica el salario, el auxilio y los descuentos para que el neto sea valido.',
                        },
                    ],
                )
            }

            await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth: effectiveMonth,
                },
                transaction,
            )

            const transactionRecord = await this.financeRepository.createTransaction(
                {
                    accountId: defaultAccount.id,
                    amount: netReceived,
                    currencyCode: user.preferredCurrencyCode,
                    description: input.notes ?? 'Ingreso por pago de salario.',
                    effectiveMonth,
                    occurredOn: toDateOnly(input.paidOn),
                    title: 'Pago de salario',
                    type: TransactionType.INCOME,
                    userId: user.id,
                },
                transaction,
            )

            return this.financeRepository.createPaycheckEntry(
                {
                    effectiveMonth,
                    netReceived,
                    notes: input.notes,
                    paidOn: toDateOnly(input.paidOn),
                    salaryBase: input.salaryBase,
                    totalDeductions: input.totalDeductions,
                    transactionId: transactionRecord.id,
                    transportAllowance: input.transportAllowance,
                    userId: user.id,
                },
                transaction,
            )
        })
    }

    async createSavingGoal(user: PublicUser, input: CreateSavingGoalInput) {
        return this.financeRepository.createSavingGoal({
            currencyCode: input.currencyCode ?? user.preferredCurrencyCode,
            name: input.name,
            priority: input.priority,
            targetAmount: input.targetAmount,
            targetDate: input.targetDate ? toDateOnly(input.targetDate) : undefined,
            userId: user.id,
        })
    }

    async createSavingContribution(
        user: PublicUser,
        input: CreateSavingContributionInput,
    ) {
        return this.financeRepository.withTransaction(async (transaction) => {
            let savingGoal: FinanceSavingGoal | null = null

            if (input.savingGoalId) {
                savingGoal = await this.financeRepository.findSavingGoalById(
                    user.id,
                    input.savingGoalId,
                    transaction,
                )

                if (!savingGoal) {
                    throw new NotFoundError('La meta de ahorro seleccionada no existe.')
                }

                if (
                    savingGoal.status === SavingGoalStatus.CANCELED ||
                    savingGoal.status === SavingGoalStatus.COMPLETED
                ) {
                    throw new ConflictError(
                        'La meta seleccionada ya no admite nuevos aportes.',
                    )
                }
            }

            const currencyCode = savingGoal?.currencyCode ?? user.preferredCurrencyCode
            const defaultAccount =
                await this.financeRepository.ensureDefaultFinancialAccount(
                    {
                        currencyCode,
                        userId: user.id,
                    },
                    transaction,
                )
            const effectiveMonth = input.effectiveMonth ?? input.occurredOn.slice(0, 7)

            await this.financeRepository.ensureMonthProfile(
                {
                    userId: user.id,
                    yearMonth: effectiveMonth,
                },
                transaction,
            )

            const contribution = await this.financeRepository.createTransaction(
                {
                    accountId: defaultAccount.id,
                    amount: input.amount,
                    currencyCode,
                    description: input.notes,
                    effectiveMonth,
                    occurredOn: toDateOnly(input.occurredOn),
                    savingGoalId: savingGoal?.id,
                    title: input.title,
                    type: TransactionType.SAVING_CONTRIBUTION,
                    userId: user.id,
                },
                transaction,
            )

            if (savingGoal) {
                const nextSavedAmount = roundCurrency(
                    decimalToNumber(savingGoal.currentSavedAmount) + input.amount,
                )
                const targetAmount = decimalToNumber(savingGoal.targetAmount)
                const isCompleted = nextSavedAmount >= targetAmount

                await this.financeRepository.updateSavingGoal(
                    savingGoal.id,
                    {
                        completedAt: isCompleted ? new Date() : null,
                        currentSavedAmount: nextSavedAmount,
                        status: isCompleted
                            ? SavingGoalStatus.COMPLETED
                            : savingGoal.status,
                    },
                    transaction,
                )
            }

            return contribution
        })
    }

    private async buildMonthWorkspace(
        user: PublicUser,
        yearMonth: string,
        profile: FinanceMonthlyProfile | null,
    ): Promise<MonthWorkspaceResponse> {
        const ensuredProfile =
            profile ??
            (await this.financeRepository.ensureMonthProfile({
                userId: user.id,
                yearMonth,
            }))
        const [
            categories,
            debts,
            obligationTemplates,
            obligations,
            paychecks,
            debtPayments,
            savingGoals,
            transactions,
        ] = await Promise.all([
            this.financeRepository.listCategories(user.id),
            this.financeRepository.listDebts(user.id),
            this.financeRepository.listObligationTemplates(user.id),
            this.financeRepository.listMonthlyObligations(user.id, yearMonth),
            this.financeRepository.listPaycheckEntries(user.id, yearMonth),
            this.financeRepository.listDebtPaymentEntries(user.id, yearMonth),
            this.financeRepository.listSavingGoals(user.id),
            this.financeRepository.listMonthTransactions(user.id, yearMonth),
        ])
        const currentDate = toIsoDate(new Date())
        const carryoverSourceAmount = ensuredProfile.initializedAt
            ? decimalToNumber(ensuredProfile.carryoverSourceAmount)
            : await this.computeCarryoverSource(user.id, yearMonth)
        const summary = this.buildSummary(ensuredProfile, transactions)
        const pendingSummary = this.buildPendingSummary({
            currentDate,
            debts,
            obligations,
            yearMonth,
        })
        const rule503020 = this.buildRule503020(ensuredProfile, summary, transactions)
        const monthStatus = this.buildMonthStatus({
            pendingSummary,
            rule503020,
            summary,
        })

        return {
            activity: {
                debtPayments: this.buildMonthDebtPayments(debtPayments),
                expenses: this.buildMonthExpenses(obligations, transactions),
                incomes: this.buildMonthIncomes(paychecks, transactions),
                savingContributions:
                    this.buildMonthSavingContributions(transactions),
            },
            calendarDays: this.buildCalendarDays({
                carryoverSourceAmount,
                debtPayments,
                obligations,
                profile: ensuredProfile,
                paychecks,
                transactions,
                yearMonth,
            }),
            categories,
            debts: debts.map((debt) => this.toDebtSnapshot(debt)),
            initialization: {
                carryoverSourceAmount,
                required: !ensuredProfile.initializedAt && carryoverSourceAmount > 0,
            },
            month: {
                currentDate,
                nextYearMonth: getNextYearMonth(yearMonth),
                previousYearMonth: getPreviousYearMonth(yearMonth),
                yearMonth,
            },
            monthStatus,
            obligationTemplates,
            obligations: obligations.map((obligation) =>
                this.toMonthlyObligationViewModel(obligation),
            ),
            pendingSummary,
            profile: ensuredProfile,
            rule503020,
            savingGoals: savingGoals.map((goal) => this.toSavingGoalSummary(goal)),
            summary,
        }
    }

    private async computeCarryoverSource(userId: string, yearMonth: string) {
        const previousYearMonth = getPreviousYearMonth(yearMonth)
        const previousProfile = await this.financeRepository.findMonthProfile(
            userId,
            previousYearMonth,
        )

        if (!previousProfile) {
            return 0
        }

        const previousTransactions = await this.financeRepository.listMonthTransactions(
            userId,
            previousYearMonth,
        )
        const previousSummary = this.buildSummary(previousProfile, previousTransactions)

        return Math.max(0, roundCurrency(previousSummary.availableBalance))
    }

    private buildMonthIncomes(
        paychecks: Awaited<ReturnType<FinanceRepository['listPaycheckEntries']>>,
        transactions: FinanceTransaction[],
    ): MonthIncomeItem[] {
        const linkedTransactionIds = new Set(paychecks.map((paycheck) => paycheck.transaction.id))
        const incomeItems: MonthIncomeItem[] = paychecks.map((paycheck) => ({
            amount: decimalToNumber(paycheck.netReceived),
            id: paycheck.id,
            kind: 'PAYCHECK',
            notes: paycheck.notes ?? null,
            occurredOn: toIsoDate(paycheck.paidOn),
            title: paycheck.transaction.title,
            totalDeductions: decimalToNumber(paycheck.totalDeductions),
            transportAllowance: decimalToNumber(paycheck.transportAllowance),
        }))

        for (const transaction of transactions) {
            if (
                transaction.type !== TransactionType.INCOME ||
                linkedTransactionIds.has(transaction.id)
            ) {
                continue
            }

            incomeItems.push({
                amount: decimalToNumber(transaction.amount),
                id: transaction.id,
                kind: 'EXTRA_INCOME',
                notes: transaction.description ?? null,
                occurredOn: toIsoDate(transaction.occurredOn),
                title: transaction.title,
                totalDeductions: null,
                transportAllowance: null,
            })
        }

        return incomeItems.sort((left, right) =>
            right.occurredOn.localeCompare(left.occurredOn),
        )
    }

    private buildMonthExpenses(
        obligations: FinanceMonthlyObligation[],
        transactions: FinanceTransaction[],
    ): MonthExpenseItem[] {
        const linkedObligationTransactionIds = new Set(
            obligations
                .map((obligation) => obligation.transactionId)
                .filter((transactionId): transactionId is string => Boolean(transactionId)),
        )

        return transactions
            .filter(
                (transaction) =>
                    transaction.type === TransactionType.EXPENSE &&
                    !linkedObligationTransactionIds.has(transaction.id),
            )
            .map((transaction) => ({
                amount: decimalToNumber(transaction.amount),
                budgetBucket: transaction.category?.budgetBucket ?? null,
                categoryName: transaction.category?.name ?? null,
                id: transaction.id,
                notes: transaction.description ?? null,
                occurredOn: toIsoDate(transaction.occurredOn),
                title: transaction.title,
            }))
            .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn))
    }

    private buildMonthDebtPayments(
        debtPayments: Awaited<ReturnType<FinanceRepository['listDebtPaymentEntries']>>,
    ): MonthDebtPaymentItem[] {
        return debtPayments
            .map((payment) => ({
                debtId: payment.debt.id,
                debtName: payment.debt.name,
                extraAmount: decimalToNumber(payment.extraAmount),
                id: payment.id,
                minimumAmount: decimalToNumber(payment.minimumAmount),
                notes: payment.notes ?? null,
                paidOn: toIsoDate(payment.paidOn),
                totalAmount: decimalToNumber(payment.totalAmount),
            }))
            .sort((left, right) => right.paidOn.localeCompare(left.paidOn))
    }

    private buildMonthSavingContributions(
        transactions: FinanceTransaction[],
    ): MonthSavingContributionItem[] {
        return transactions
            .filter(
                (transaction) =>
                    transaction.type === TransactionType.SAVING_CONTRIBUTION,
            )
            .map((transaction) => ({
                amount: decimalToNumber(transaction.amount),
                id: transaction.id,
                notes: transaction.description ?? null,
                occurredOn: toIsoDate(transaction.occurredOn),
                savingGoalId: transaction.savingGoal?.id ?? null,
                savingGoalName: transaction.savingGoal?.name ?? null,
                title: transaction.title,
            }))
            .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn))
    }

    private alignDateToMonth(date: Date | null | undefined, yearMonth: string) {
        if (!date) {
            return undefined
        }

        const { end } = getMonthBounds(yearMonth)
        const [year, month] = yearMonth.split('-').map(Number)
        const safeDay = Math.min(date.getUTCDate(), end.getUTCDate())

        return new Date(Date.UTC(year, month - 1, safeDay))
    }

    private buildManualObligationKey(categoryId: string, name: string) {
        return `${categoryId}:${name.trim().toLowerCase()}`
    }

    private buildSummary(
        profile: FinanceMonthlyProfile,
        transactions: FinanceTransaction[],
    ): DashboardMonthSummary {
        const openingBalance = decimalToNumber(profile.openingBalance)
        let incomeTotal = 0
        let expenseTotal = 0
        let debtPaymentTotal = 0
        let savingContributionTotal = 0
        let adjustmentTotal = 0

        for (const transaction of transactions) {
            const amount = decimalToNumber(transaction.amount)

            if (transaction.type === TransactionType.INCOME) {
                incomeTotal += amount
                continue
            }

            if (transaction.type === TransactionType.EXPENSE) {
                expenseTotal += amount
                continue
            }

            if (transaction.type === TransactionType.DEBT_PAYMENT) {
                debtPaymentTotal += amount
                continue
            }

            if (transaction.type === TransactionType.SAVING_CONTRIBUTION) {
                savingContributionTotal += amount
                continue
            }

            if (transaction.type === TransactionType.ADJUSTMENT) {
                adjustmentTotal += amount
            }
        }

        return {
            availableBalance: roundCurrency(
                openingBalance +
                    incomeTotal -
                    expenseTotal -
                    debtPaymentTotal -
                    savingContributionTotal +
                    adjustmentTotal,
            ),
            carryoverSourceAmount: decimalToNumber(profile.carryoverSourceAmount),
            debtPaymentTotal: roundCurrency(debtPaymentTotal),
            expenseTotal: roundCurrency(expenseTotal),
            incomeTotal: roundCurrency(incomeTotal),
            openingBalance: roundCurrency(openingBalance),
            savingContributionTotal: roundCurrency(savingContributionTotal),
        }
    }

    private buildRule503020(
        profile: FinanceMonthlyProfile,
        summary: DashboardMonthSummary,
        transactions: FinanceTransaction[],
    ): DashboardRule503020 {
        let needsActual = 0
        let wantsActual = 0
        let savingsDebtActual = summary.debtPaymentTotal + summary.savingContributionTotal
        let unassignedExpenseAmount = 0

        for (const transaction of transactions) {
            if (transaction.type !== TransactionType.EXPENSE) {
                continue
            }

            const amount = decimalToNumber(transaction.amount)
            const bucket = transaction.category?.budgetBucket

            if (bucket === BudgetBucket.NEEDS) {
                needsActual += amount
                continue
            }

            if (bucket === BudgetBucket.WANTS) {
                wantsActual += amount
                continue
            }

            if (bucket === BudgetBucket.SAVINGS_DEBT) {
                savingsDebtActual += amount
                continue
            }

            unassignedExpenseAmount += amount
        }

        const incomeBase = summary.incomeTotal
        const needsTarget = roundCurrency(
            (incomeBase * decimalToNumber(profile.needsTargetPct)) / 100,
        )
        const wantsTarget = roundCurrency(
            (incomeBase * decimalToNumber(profile.wantsTargetPct)) / 100,
        )
        const savingsTarget = roundCurrency(
            (incomeBase * decimalToNumber(profile.savingsTargetPct)) / 100,
        )

        return {
            needs: this.buildRuleBucket({
                actualAmount: roundCurrency(needsActual),
                isSavingsBucket: false,
                targetAmount: needsTarget,
                targetPct: decimalToNumber(profile.needsTargetPct),
            }),
            savingsDebt: this.buildRuleBucket({
                actualAmount: roundCurrency(savingsDebtActual),
                isSavingsBucket: true,
                targetAmount: savingsTarget,
                targetPct: decimalToNumber(profile.savingsTargetPct),
            }),
            unassignedExpenseAmount: roundCurrency(unassignedExpenseAmount),
            wants: this.buildRuleBucket({
                actualAmount: roundCurrency(wantsActual),
                isSavingsBucket: false,
                targetAmount: wantsTarget,
                targetPct: decimalToNumber(profile.wantsTargetPct),
            }),
        }
    }

    private buildRuleBucket(input: {
        actualAmount: number
        isSavingsBucket: boolean
        targetAmount: number
        targetPct: number
    }) {
        const remainingAmount = roundCurrency(input.targetAmount - input.actualAmount)

        if (input.isSavingsBucket) {
            return {
                actualAmount: input.actualAmount,
                remainingAmount,
                status:
                    input.actualAmount > input.targetAmount
                        ? ('ahead' as const)
                        : input.actualAmount === input.targetAmount
                          ? ('on_track' as const)
                          : ('behind' as const),
                targetAmount: input.targetAmount,
                targetPct: input.targetPct,
            }
        }

        return {
            actualAmount: input.actualAmount,
            remainingAmount,
            status:
                input.actualAmount > input.targetAmount
                    ? ('over' as const)
                    : ('on_track' as const),
            targetAmount: input.targetAmount,
            targetPct: input.targetPct,
        }
    }

    private buildPendingSummary(input: {
        currentDate: string
        debts: FinanceDebt[]
        obligations: FinanceMonthlyObligation[]
        yearMonth: string
    }): DashboardPendingSummary {
        const pendingObligations = input.obligations.filter(
            (obligation) => obligation.status === MonthlyObligationStatus.DRAFT,
        )
        const pendingObligationsAmount = roundCurrency(
            pendingObligations.reduce(
                (sum, obligation) => sum + decimalToNumber(obligation.plannedAmount),
                0,
            ),
        )
        const pendingDebtAmount = roundCurrency(
            input.debts.reduce((sum, debt) => {
                if (
                    debt.status !== DebtStatus.ACTIVE ||
                    debt.minimumPaymentAmount === null
                ) {
                    return sum
                }

                return sum + decimalToNumber(debt.minimumPaymentAmount)
            }, 0),
        )
        const currentMonth = input.currentDate.slice(0, 7)
        const upcomingDueItems: PendingMonthItem[] = []

        for (const obligation of pendingObligations) {
            if (!obligation.expectedOn) {
                continue
            }

            const dueOn = toIsoDate(obligation.expectedOn)

            upcomingDueItems.push({
                amount: decimalToNumber(obligation.plannedAmount),
                dueOn,
                id: obligation.id,
                isOverdue: currentMonth === input.yearMonth && dueOn < input.currentDate,
                kind: 'obligation',
                title: obligation.name,
            })
        }

        const { end } = getMonthBounds(input.yearMonth)
        const [year, month] = input.yearMonth.split('-').map(Number)

        for (const debt of input.debts) {
            if (
                debt.status !== DebtStatus.ACTIVE ||
                debt.dueDay === null ||
                debt.minimumPaymentAmount === null
            ) {
                continue
            }

            const safeDay = Math.min(debt.dueDay, end.getUTCDate())
            const dueOn = toIsoDate(new Date(Date.UTC(year, month - 1, safeDay)))

            upcomingDueItems.push({
                amount: decimalToNumber(debt.minimumPaymentAmount),
                dueOn,
                id: debt.id,
                isOverdue: currentMonth === input.yearMonth && dueOn < input.currentDate,
                kind: 'debt',
                title: debt.name,
            })
        }

        upcomingDueItems.sort((left, right) => left.dueOn.localeCompare(right.dueOn))

        return {
            pendingDebtAmount,
            pendingObligationsAmount,
            pendingObligationsCount: pendingObligations.length,
            upcomingDueItems: upcomingDueItems.slice(0, 6),
        }
    }

    private buildMonthStatus(input: {
        pendingSummary: DashboardPendingSummary
        rule503020: DashboardRule503020
        summary: DashboardMonthSummary
    }): DashboardMonthStatus {
        const cues: string[] = []
        const hasOverdueItems = input.pendingSummary.upcomingDueItems.some(
            (item) => item.isOverdue,
        )
        const isOverspending =
            input.rule503020.needs.status === 'over' ||
            input.rule503020.wants.status === 'over'
        const remainingSavingsTarget = Math.max(
            0,
            input.rule503020.savingsDebt.remainingAmount,
        )

        if (input.pendingSummary.pendingObligationsCount > 0) {
            cues.push('Tienes obligaciones del mes pendientes por resolver.')
        }

        if (input.pendingSummary.pendingDebtAmount > 0) {
            cues.push('Aun tienes pagos minimos de deuda por cubrir.')
        }

        if (input.rule503020.unassignedExpenseAmount > 0) {
            cues.push('Hay gastos sin clasificar dentro de la regla 50/30/20.')
        }

        if (remainingSavingsTarget > 0 && input.summary.availableBalance > 0) {
            cues.push(
                `Aun puedes destinar ${remainingSavingsTarget.toFixed(0)} a ahorro o deuda.`,
            )
        }

        if (hasOverdueItems) {
            return {
                cues,
                description:
                    'Hay compromisos vencidos o atrasados y conviene priorizarlos antes de seguir gastando.',
                title: 'Tienes pagos pendientes por vencer',
                tone: 'warning',
            }
        }

        if (isOverspending || input.summary.availableBalance < 0) {
            return {
                cues,
                description:
                    'Tus gastos ya superan lo recomendado o estan dejando el disponible demasiado ajustado.',
                title: 'Estas gastando mas de lo recomendado',
                tone: 'warning',
            }
        }

        if (remainingSavingsTarget > 0 && input.summary.availableBalance > 0) {
            return {
                cues,
                description:
                    'El mes sigue saludable y todavia tienes margen para cumplir tu meta de ahorro o adelantar deuda.',
                title: 'Aun puedes ahorrar este mes',
                tone: 'positive',
            }
        }

        return {
            cues,
            description:
                'Tus totales estan bajo control y no aparecen alertas criticas en este corte mensual.',
            title: 'Vas bien este mes',
            tone: 'positive',
        }
    }

    private buildCalendarDays(input: {
        carryoverSourceAmount: number
        debtPayments: Awaited<ReturnType<FinanceRepository['listDebtPaymentEntries']>>
        obligations: FinanceMonthlyObligation[]
        paychecks: Awaited<ReturnType<FinanceRepository['listPaycheckEntries']>>
        profile: FinanceMonthlyProfile
        transactions: FinanceTransaction[]
        yearMonth: string
    }): CalendarDaySummary[] {
        const { start, end } = getMonthBounds(input.yearMonth)
        const daysMap = new Map<string, CalendarDaySummary>()
        const linkedTransactionIds = new Set<string>()

        for (let day = 1; day <= end.getUTCDate(); day += 1) {
            const date = new Date(
                Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day),
            )
            const isoDate = toIsoDate(date)

            daysMap.set(isoDate, {
                date: isoDate,
                expenseTotal: 0,
                incomeTotal: 0,
                items: [],
            })
        }

        const appendItem = (
            date: string,
            item: CalendarEventItem,
            totals?: { expense?: number; income?: number },
        ) => {
            const day = daysMap.get(date)

            if (!day) {
                return
            }

            day.items.push(item)
            day.expenseTotal = roundCurrency(day.expenseTotal + (totals?.expense ?? 0))
            day.incomeTotal = roundCurrency(day.incomeTotal + (totals?.income ?? 0))
        }

        if (input.profile.initializedAt) {
            const availableCarryover = decimalToNumber(
                input.profile.carryoverToAvailableAmount,
            )

            if (availableCarryover > 0) {
                const monthStart = toIsoDate(start)

                appendItem(monthStart, {
                    amount: availableCarryover,
                    date: monthStart,
                    detail: 'Saldo anterior enviado al disponible del mes.',
                    id: `carryover-${input.profile.id}`,
                    kind: 'carryover',
                    title: 'Ajuste de arrastre',
                })
            }
        }

        for (const paycheck of input.paychecks) {
            const paidOn = toIsoDate(paycheck.paidOn)
            linkedTransactionIds.add(paycheck.transaction.id)
            appendItem(
                paidOn,
                {
                    amount: decimalToNumber(paycheck.netReceived),
                    date: paidOn,
                    detail: 'Ingreso salarial registrado.',
                    id: paycheck.id,
                    kind: 'paycheck',
                    relatedEntityId: paycheck.transaction.id,
                    title: 'Pago de salario',
                },
                {
                    income: decimalToNumber(paycheck.netReceived),
                },
            )
        }

        for (const obligation of input.obligations) {
            if (
                obligation.status === MonthlyObligationStatus.PAID &&
                obligation.paidOn &&
                obligation.paidAmount
            ) {
                const paidOn = toIsoDate(obligation.paidOn)

                if (obligation.transactionId) {
                    linkedTransactionIds.add(obligation.transactionId)
                }

                appendItem(
                    paidOn,
                    {
                        amount: decimalToNumber(obligation.paidAmount),
                        date: paidOn,
                        detail: `Pago en ${obligation.category.name}.`,
                        id: obligation.id,
                        kind: 'obligation_paid',
                        relatedEntityId: obligation.transactionId ?? undefined,
                        title: obligation.name,
                    },
                    {
                        expense: decimalToNumber(obligation.paidAmount),
                    },
                )
                continue
            }

            if (
                obligation.status === MonthlyObligationStatus.DRAFT &&
                obligation.expectedOn
            ) {
                const expectedOn = toIsoDate(obligation.expectedOn)

                appendItem(expectedOn, {
                    amount: decimalToNumber(obligation.plannedAmount),
                    date: expectedOn,
                    detail: `Pendiente en ${obligation.category.name}.`,
                    id: obligation.id,
                    kind: 'obligation_planned',
                    relatedEntityId: obligation.id,
                    title: obligation.name,
                })
            }
        }

        for (const debtPayment of input.debtPayments) {
            const paidOn = toIsoDate(debtPayment.paidOn)
            linkedTransactionIds.add(debtPayment.transaction.id)
            appendItem(
                paidOn,
                {
                    amount: decimalToNumber(debtPayment.totalAmount),
                    date: paidOn,
                    detail: `Minimo ${decimalToNumber(debtPayment.minimumAmount)} · Extra ${decimalToNumber(debtPayment.extraAmount)}`,
                    id: debtPayment.id,
                    kind: 'debt_payment',
                    relatedEntityId: debtPayment.debt.id,
                    title: debtPayment.debt.name,
                },
                {
                    expense: decimalToNumber(debtPayment.totalAmount),
                },
            )
        }

        for (const transaction of input.transactions) {
            if (linkedTransactionIds.has(transaction.id)) {
                continue
            }

            const occurredOn = toIsoDate(transaction.occurredOn)
            const amount = decimalToNumber(transaction.amount)

            if (transaction.type === TransactionType.SAVING_CONTRIBUTION) {
                appendItem(
                    occurredOn,
                    {
                        amount,
                        date: occurredOn,
                        detail: transaction.description ?? 'Aporte al ahorro.',
                        id: transaction.id,
                        kind: 'saving_contribution',
                        relatedEntityId: transaction.id,
                        title: transaction.title,
                    },
                    {
                        expense: amount,
                    },
                )
            }
        }

        return Array.from(daysMap.values())
    }

    private toDebtSnapshot(debt: FinanceDebt): DebtMonthSnapshot {
        const originalAmount = decimalToNumber(debt.originalAmount)
        const currentPrincipal = decimalToNumber(debt.currentPrincipal)
        const progressPct =
            originalAmount > 0
                ? Math.max(
                      0,
                      Math.min(
                          100,
                          roundCurrency(
                              ((originalAmount - currentPrincipal) / originalAmount) *
                                  100,
                          ),
                      ),
                  )
                : 0

        return {
            currencyCode: debt.currencyCode,
            currentPrincipal,
            dueDay: debt.dueDay,
            id: debt.id,
            lenderName: debt.lenderName,
            minimumPaymentAmount:
                debt.minimumPaymentAmount === null
                    ? null
                    : decimalToNumber(debt.minimumPaymentAmount),
            name: debt.name,
            progressPct,
            status: debt.status,
            termMonths: debt.termMonths,
            type: debt.type,
        }
    }

    private toMonthlyObligationViewModel(
        obligation: FinanceMonthlyObligation,
    ): MonthlyObligationViewModel {
        return {
            amountPaid:
                obligation.paidAmount === null
                    ? null
                    : decimalToNumber(obligation.paidAmount),
            categoryId: obligation.category.id,
            categoryName: obligation.category.name,
            expectedOn: obligation.expectedOn ? toIsoDate(obligation.expectedOn) : null,
            id: obligation.id,
            name: obligation.name,
            obligationType: obligation.obligationType,
            paidOn: obligation.paidOn ? toIsoDate(obligation.paidOn) : null,
            plannedAmount: decimalToNumber(obligation.plannedAmount),
            status: obligation.status,
            templateId: obligation.templateId ?? null,
        }
    }

    private toSavingGoalSummary(goal: FinanceSavingGoal): SavingGoalSummary {
        return {
            currentSavedAmount: decimalToNumber(goal.currentSavedAmount),
            id: goal.id,
            name: goal.name,
            priority: goal.priority,
            status: goal.status,
            targetAmount: decimalToNumber(goal.targetAmount),
            targetDate: goal.targetDate ? toIsoDate(goal.targetDate) : null,
        }
    }

    private async ensureExpenseCategory(userId: string, categoryId: string) {
        const category = await this.financeRepository.findCategoryById(
            userId,
            categoryId,
        )

        if (!category || category.kind !== CategoryKind.EXPENSE) {
            throw new NotFoundError('La categoria seleccionada no existe.')
        }

        return category
    }
}
