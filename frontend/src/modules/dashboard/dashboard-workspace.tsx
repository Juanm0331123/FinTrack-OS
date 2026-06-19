'use client'

import {
    ArrowLeft,
    ArrowRight,
    BadgePlus,
    CalendarDays,
    CreditCard,
    PiggyBank,
    Plus,
    ReceiptText,
    TriangleAlert,
    Wallet,
    X,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import {
    copyPreviousMonthObligations,
    createCategory,
    createDebtPayment,
    createExpense,
    createIncome,
    createMonthlyObligation,
    createObligationTemplate,
    createPaycheck,
    createSavingContribution,
    createSavingGoal,
    DashboardApiError,
    getMonthWorkspace,
    initializeMonth,
    updateMonthlyObligation,
} from './dashboard.api'
import type {
    BudgetBucket,
    CreateCategoryInput,
    CreateDebtPaymentInput,
    CreateExpenseInput,
    CreateIncomeInput,
    CreateMonthlyObligationInput,
    CreatePaycheckInput,
    CreateSavingContributionInput,
    CreateSavingGoalInput,
    DashboardMonthWorkspace,
    MonthlyObligationViewModel,
} from './dashboard.types'
import { CurrencyInput } from './currency-input'
import type { DashboardView } from './dashboard.data'
import { formatCurrency } from './dashboard-money'

type DashboardWorkspaceProps = {
    accessToken: string
    currencyCode: string
    view: DashboardView
}

type ModalType =
    | 'carryover'
    | 'category'
    | 'debt-payment'
    | 'expense'
    | 'income'
    | 'obligation'
    | 'saving-contribution'
    | 'saving-goal'
    | null

const budgetBucketOptions: Array<{
    description: string
    label: string
    value: BudgetBucket
}> = [
    {
        description: 'Arriendo, mercado, transporte, salud y otros gastos base.',
        label: 'Necesidades',
        value: 'NEEDS',
    },
    {
        description: 'Salidas, compras no esenciales y consumo flexible.',
        label: 'Deseos',
        value: 'WANTS',
    },
    {
        description: 'Ahorro, adelantos y gastos enfocados en deuda o patrimonio.',
        label: 'Ahorro / deuda',
        value: 'SAVINGS_DEBT',
    },
]

function getCurrentYearMonth(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getTodayDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
    ).padStart(2, '0')}`
}

function formatMonthLabel(yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number)

    return new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, month - 1, 1))
}

function formatDateLabel(value: string) {
    const [year, month, day] = value.split('-').map(Number)

    return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(year, month - 1, day))
}

function getErrorMessage(error: unknown) {
    if (error instanceof DashboardApiError) {
        return error.message
    }

    if (error instanceof Error) {
        return error.message
    }

    return 'No pudimos completar la operacion.'
}

function getMonthStatusToneClasses(tone: 'neutral' | 'positive' | 'warning') {
    if (tone === 'warning') {
        return 'border-[color:var(--chart-3)]/18 bg-[color-mix(in_oklch,var(--chart-3)_10%,white)] text-[color:var(--chart-3)]'
    }

    if (tone === 'positive') {
        return 'border-[color:var(--chart-1)]/18 bg-[color-mix(in_oklch,var(--chart-1)_10%,white)] text-[color:var(--chart-1)]'
    }

    return 'border-primary/15 bg-primary/6 text-primary'
}

function getBucketLabel(bucket: BudgetBucket) {
    if (bucket === 'NEEDS') return 'Necesidades'
    if (bucket === 'WANTS') return 'Deseos'
    return 'Ahorro / deuda'
}

function DashboardModal({
    children,
    onClose,
    title,
    description,
    canClose = true,
}: {
    canClose?: boolean
    children: ReactNode
    description?: string
    onClose: () => void
    title: string
}) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && canClose) {
                onClose()
            }
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [canClose, onClose])

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/18 px-4 py-4 backdrop-blur-[5px] md:items-center">
            <div className="w-full max-w-2xl rounded-[1.25rem] border border-white/70 bg-background/98 shadow-[0_28px_60px_-34px_oklch(0.19_0.025_255/0.4)]">
                <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-[-0.02em]">
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {canClose ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cerrar modal"
                            className="shell-press-transition"
                            onClick={onClose}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    ) : null}
                </div>
                <div className="px-5 py-5">{children}</div>
            </div>
        </div>
    )
}

function DashboardWorkspaceSkeleton() {
    return (
        <div className="grid gap-5">
            <Card className="border border-white/70 bg-card/92">
                <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-full max-w-2xl" />
                        <Skeleton className="h-4 w-full max-w-xl" />
                    </div>
                    <Skeleton className="h-44 w-full rounded-[1.25rem]" />
                </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="border border-white/70 bg-card/92">
                        <CardContent className="space-y-3 p-5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                <Card className="border border-white/70 bg-card/92">
                    <CardContent className="space-y-4 p-5">
                        <Skeleton className="h-8 w-44" />
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-28 w-full rounded-[1rem]" />
                        ))}
                    </CardContent>
                </Card>
                <Card className="border border-white/70 bg-card/92">
                    <CardContent className="space-y-4 p-5">
                        <Skeleton className="h-8 w-44" />
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-20 w-full rounded-[1rem]" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function SummaryMetric({
    label,
    tone,
    value,
    detail,
}: {
    detail: string
    label: string
    tone?: string
    value: string
}) {
    return (
        <Card className="border border-white/70 bg-card/94 shadow-[0_18px_34px_-30px_oklch(0.19_0.025_255/0.28)]">
            <CardContent className="space-y-3 p-5">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={cn('finance-number text-2xl font-semibold', tone)}>
                        {value}
                    </p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}

function QuickActionButton({
    icon,
    label,
    onClick,
}: {
    icon: ReactNode
    label: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-[1rem] border border-border/75 bg-background/80 px-4 py-3 text-left transition-colors shell-press-transition hover:border-primary/20 hover:bg-primary/5"
            onClick={onClick}
        >
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                {icon}
            </span>
            <span className="text-sm font-medium">{label}</span>
        </button>
    )
}

function RuleBucketCard({
    bucketLabel,
    bucketStatus,
    currencyCode,
    actualAmount,
    targetAmount,
    remainingAmount,
}: {
    actualAmount: number
    bucketLabel: string
    bucketStatus: 'ahead' | 'behind' | 'on_track' | 'over'
    currencyCode: string
    remainingAmount: number
    targetAmount: number
}) {
    const progressValue =
        targetAmount <= 0 ? 0 : Math.min(100, Math.max(0, (actualAmount / targetAmount) * 100))
    const statusCopy =
        bucketStatus === 'over'
            ? `Excedido por ${formatCurrency(Math.abs(remainingAmount), currencyCode)}`
            : bucketStatus === 'ahead'
              ? `Superaste la meta por ${formatCurrency(Math.abs(remainingAmount), currencyCode)}`
              : bucketStatus === 'behind'
                ? `Te faltan ${formatCurrency(Math.max(remainingAmount, 0), currencyCode)}`
                : remainingAmount > 0
                  ? `Te quedan ${formatCurrency(remainingAmount, currencyCode)}`
                  : 'Exacto sobre la meta'

    return (
        <div className="rounded-[1rem] border border-border/75 bg-background/82 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">{bucketLabel}</p>
                    <p className="text-xs text-muted-foreground">
                        Objetivo {formatCurrency(targetAmount, currencyCode)}
                    </p>
                </div>
                <Badge
                    variant={bucketStatus === 'over' ? 'destructive' : 'secondary'}
                    className="rounded-full"
                >
                    {bucketStatus === 'over'
                        ? 'Fuera del plan'
                        : bucketStatus === 'ahead'
                          ? 'Por encima'
                          : bucketStatus === 'behind'
                            ? 'Pendiente'
                            : 'En linea'}
                </Badge>
            </div>
            <div className="mt-4 grid gap-3">
                <Progress value={progressValue} aria-label={`Avance de ${bucketLabel}`} />
                <div className="grid gap-1 sm:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            Llevas
                        </p>
                        <p className="finance-number mt-1 text-lg font-semibold">
                            {formatCurrency(actualAmount, currencyCode)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            Estado
                        </p>
                        <p className="mt-1 text-sm font-medium">{statusCopy}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SectionHeader({
    action,
    description,
    title,
}: {
    action?: ReactNode
    description: string
    title: string
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    )
}

function MonthLineItem({
    amount,
    badge,
    children,
    currencyCode,
    muted,
    title,
}: {
    amount: number
    badge?: ReactNode
    children?: ReactNode
    currencyCode: string
    muted?: boolean
    title: string
}) {
    return (
        <div className="rounded-[1rem] border border-border/75 bg-background/82 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{title}</p>
                        {badge}
                    </div>
                    {children ? (
                        <div
                            className={cn(
                                'mt-2 text-sm leading-6',
                                muted ? 'text-muted-foreground' : 'text-foreground/82',
                            )}
                        >
                            {children}
                        </div>
                    ) : null}
                </div>
                <p className="finance-number text-lg font-semibold text-foreground">
                    {formatCurrency(amount, currencyCode)}
                </p>
            </div>
        </div>
    )
}

export function DashboardWorkspace({
    accessToken,
    currencyCode,
    view,
}: DashboardWorkspaceProps) {
    const [activeMonth, setActiveMonth] = useState(() => getCurrentYearMonth())
    const [workspace, setWorkspace] = useState<DashboardMonthWorkspace | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)
    const [modalType, setModalType] = useState<ModalType>(null)
    const [incomeMode, setIncomeMode] = useState<'extra' | 'paycheck'>('paycheck')
    const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
        budgetBucket: 'NEEDS',
        color: '',
        name: '',
    })
    const [expenseForm, setExpenseForm] = useState<CreateExpenseInput>({
        amount: 0,
        categoryId: '',
        occurredOn: getTodayDate(),
        title: '',
    })
    const [incomeForm, setIncomeForm] = useState<CreateIncomeInput>({
        amount: 0,
        occurredOn: getTodayDate(),
        title: '',
    })
    const [paycheckForm, setPaycheckForm] = useState<CreatePaycheckInput>({
        paidOn: getTodayDate(),
        salaryBase: 0,
        totalDeductions: 0,
        transportAllowance: 0,
    })
    const [obligationForm, setObligationForm] = useState<
        CreateMonthlyObligationInput & { recurring: boolean }
    >({
        categoryId: '',
        expectedOn: getTodayDate(),
        name: '',
        obligationType: 'FIXED',
        plannedAmount: 0,
        recurring: false,
    })
    const [debtPaymentForm, setDebtPaymentForm] = useState<
        CreateDebtPaymentInput & { debtId: string }
    >({
        debtId: '',
        extraAmount: 0,
        minimumAmount: 0,
        paidOn: getTodayDate(),
    })
    const [savingGoalForm, setSavingGoalForm] = useState<CreateSavingGoalInput>({
        name: '',
        priority: 1,
        targetAmount: 0,
        targetDate: '',
    })
    const [savingContributionForm, setSavingContributionForm] =
        useState<CreateSavingContributionInput>({
            amount: 0,
            occurredOn: getTodayDate(),
            savingGoalId: undefined,
            title: 'Aporte de ahorro',
        })
    const [carryoverForm, setCarryoverForm] = useState<{
        debtAllocations: Record<string, number>
        notes: string
        savingsAmount: number
        toAvailableAmount: number
    }>({
        debtAllocations: {},
        notes: '',
        savingsAmount: 0,
        toAvailableAmount: 0,
    })

    const expenseCategories = useMemo(
        () => workspace?.categories.filter((category) => category.kind === 'EXPENSE') ?? [],
        [workspace],
    )
    const activeDebts = useMemo(
        () => workspace?.debts.filter((debt) => debt.status === 'ACTIVE') ?? [],
        [workspace],
    )
    const pendingObligations = useMemo(
        () =>
            workspace?.obligations.filter((obligation) => obligation.status === 'DRAFT') ??
            [],
        [workspace],
    )
    const paidObligationsTotal = useMemo(
        () =>
            workspace?.obligations.reduce(
                (sum, obligation) =>
                    sum +
                    (obligation.status === 'PAID'
                        ? obligation.amountPaid ?? obligation.plannedAmount
                        : 0),
                0,
            ) ?? 0,
        [workspace],
    )
    const savedPct = useMemo(() => {
        if (!workspace || workspace.summary.incomeTotal <= 0) {
            return 0
        }

        return Math.min(
            100,
            Math.max(
                0,
                (workspace.summary.savingContributionTotal /
                    workspace.summary.incomeTotal) *
                    100,
            ),
        )
    }, [workspace])
    const carryoverTotal = workspace?.initialization.carryoverSourceAmount ?? 0
    const carryoverDebtTotal = Object.values(carryoverForm.debtAllocations).reduce(
        (sum, amount) => sum + amount,
        0,
    )
    const carryoverRemaining = Math.round(
        (carryoverTotal -
            carryoverForm.toAvailableAmount -
            carryoverForm.savingsAmount -
            carryoverDebtTotal) *
            100,
    ) / 100

    useEffect(() => {
        let cancelled = false

        async function loadWorkspace() {
            setIsLoading(true)
            setErrorMessage(null)

            try {
                const nextWorkspace = await getMonthWorkspace(accessToken, activeMonth)

                if (cancelled) {
                    return
                }

                setWorkspace(nextWorkspace)

                if (nextWorkspace.initialization.required) {
                    setCarryoverForm({
                        debtAllocations: Object.fromEntries(
                            nextWorkspace.debts
                                .filter((debt) => debt.status === 'ACTIVE')
                                .map((debt) => [debt.id, 0]),
                        ),
                        notes: '',
                        savingsAmount: 0,
                        toAvailableAmount:
                            nextWorkspace.initialization.carryoverSourceAmount,
                    })
                    setModalType('carryover')
                }
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(getErrorMessage(error))
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadWorkspace()

        return () => {
            cancelled = true
        }
    }, [accessToken, activeMonth])

    function resetCategoryForm() {
        setCategoryForm({
            budgetBucket: 'NEEDS',
            color: '',
            name: '',
        })
    }

    function openModal(type: Exclude<ModalType, 'carryover' | null>, options?: { debtId?: string }) {
        setFormErrorMessage(null)
        setModalType(type)

        if (type === 'expense') {
            setExpenseForm({
                amount: 0,
                categoryId: expenseCategories[0]?.id ?? '',
                occurredOn: workspace?.month.currentDate ?? getTodayDate(),
                title: '',
            })
        }

        if (type === 'income') {
            setIncomeMode('paycheck')
            setIncomeForm({
                amount: 0,
                effectiveMonth: activeMonth,
                occurredOn: workspace?.month.currentDate ?? getTodayDate(),
                title: '',
            })
            setPaycheckForm({
                effectiveMonth: activeMonth,
                paidOn: workspace?.month.currentDate ?? getTodayDate(),
                salaryBase: 0,
                totalDeductions: 0,
                transportAllowance: 0,
            })
        }

        if (type === 'obligation') {
            setObligationForm({
                categoryId: expenseCategories[0]?.id ?? '',
                expectedOn: workspace?.month.currentDate ?? getTodayDate(),
                name: '',
                obligationType: 'FIXED',
                plannedAmount: 0,
                recurring: false,
            })
        }

        if (type === 'debt-payment') {
            setDebtPaymentForm({
                debtId: options?.debtId ?? activeDebts[0]?.id ?? '',
                extraAmount: 0,
                minimumAmount: 0,
                paidOn: workspace?.month.currentDate ?? getTodayDate(),
            })
        }

        if (type === 'saving-goal') {
            setSavingGoalForm({
                name: '',
                priority: 1,
                targetAmount: 0,
                targetDate: '',
            })
        }

        if (type === 'saving-contribution') {
            setSavingContributionForm({
                amount: 0,
                effectiveMonth: activeMonth,
                occurredOn: workspace?.month.currentDate ?? getTodayDate(),
                savingGoalId: workspace?.savingGoals[0]?.id,
                title: 'Aporte de ahorro',
            })
        }

        if (type === 'category') {
            resetCategoryForm()
        }
    }

    async function reloadWorkspace() {
        const nextWorkspace = await getMonthWorkspace(accessToken, activeMonth)
        setWorkspace(nextWorkspace)
    }

    async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            await createCategory(accessToken, {
                ...(categoryForm.color ? { color: categoryForm.color } : {}),
                ...(categoryForm.budgetBucket
                    ? { budgetBucket: categoryForm.budgetBucket }
                    : {}),
                name: categoryForm.name,
            })
            await reloadWorkspace()
            resetCategoryForm()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            await createExpense(accessToken, {
                ...expenseForm,
                effectiveMonth: activeMonth,
            })
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateIncome(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            if (incomeMode === 'paycheck') {
                await createPaycheck(accessToken, {
                    ...paycheckForm,
                    effectiveMonth: activeMonth,
                })
            } else {
                await createIncome(accessToken, {
                    ...incomeForm,
                    effectiveMonth: activeMonth,
                })
            }
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateObligation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            let templateId: string | undefined

            if (obligationForm.recurring) {
                const template = await createObligationTemplate(accessToken, {
                    categoryId: obligationForm.categoryId,
                    name: obligationForm.name,
                    notes: obligationForm.notes,
                    obligationType: obligationForm.obligationType,
                    suggestedAmount: obligationForm.plannedAmount,
                    suggestedDueDay: obligationForm.expectedOn
                        ? Number(obligationForm.expectedOn.slice(-2))
                        : undefined,
                })

                templateId = template.id
            }

            await createMonthlyObligation(accessToken, activeMonth, {
                categoryId: obligationForm.categoryId,
                expectedOn: obligationForm.expectedOn,
                name: obligationForm.name,
                notes: obligationForm.notes,
                obligationType: obligationForm.obligationType,
                plannedAmount: obligationForm.plannedAmount,
                ...(templateId ? { templateId } : {}),
            })
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateDebtPayment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            await createDebtPayment(accessToken, debtPaymentForm.debtId, {
                effectiveMonth: activeMonth,
                extraAmount: debtPaymentForm.extraAmount,
                minimumAmount: debtPaymentForm.minimumAmount,
                notes: debtPaymentForm.notes,
                paidOn: debtPaymentForm.paidOn,
            })
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateSavingGoal(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            await createSavingGoal(accessToken, {
                ...savingGoalForm,
                targetDate: savingGoalForm.targetDate || undefined,
            })
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCreateSavingContribution(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            await createSavingContribution(accessToken, {
                ...savingContributionForm,
                effectiveMonth: activeMonth,
                savingGoalId: savingContributionForm.savingGoalId || undefined,
            })
            await reloadWorkspace()
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleInitializeMonth(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setFormErrorMessage(null)

        try {
            const nextWorkspace = await initializeMonth(accessToken, activeMonth, {
                carryoverToAvailableAmount: carryoverForm.toAvailableAmount,
                carryoverToSavingsAmount: carryoverForm.savingsAmount,
                debtAllocations: Object.entries(carryoverForm.debtAllocations)
                    .filter(([, amount]) => amount > 0)
                    .map(([debtId, amount]) => ({
                        amount,
                        debtId,
                    })),
                notes: carryoverForm.notes || undefined,
            })

            setWorkspace(nextWorkspace)
            setModalType(null)
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleMarkObligationPaid(obligation: MonthlyObligationViewModel) {
        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            await updateMonthlyObligation(accessToken, activeMonth, obligation.id, {
                paidAmount: obligation.plannedAmount,
                paidOn: workspace?.month.currentDate ?? getTodayDate(),
                status: 'PAID',
            })
            await reloadWorkspace()
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleSkipObligation(obligationId: string) {
        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            await updateMonthlyObligation(accessToken, activeMonth, obligationId, {
                status: 'SKIPPED',
            })
            await reloadWorkspace()
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleCopyPreviousMonthObligations() {
        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            const nextWorkspace = await copyPreviousMonthObligations(
                accessToken,
                activeMonth,
            )
            setWorkspace(nextWorkspace)
        } catch (error) {
            setErrorMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading || !workspace) {
        return <DashboardWorkspaceSkeleton />
    }

    if (errorMessage) {
        return (
            <Card className="border border-[color:var(--chart-3)]/16 bg-card/94">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-base font-semibold">No pudimos cargar el dashboard.</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {errorMessage}
                        </p>
                    </div>
                    <Button type="button" variant="brand" onClick={() => void reloadWorkspace()}>
                        Reintentar
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            {view === 'overview' ? (
                <div className="grid gap-5">
                <Card className="overflow-visible border border-white/70 bg-card/95 shadow-[0_24px_48px_-34px_oklch(0.19_0.025_255/0.24)]">
                    <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:p-6">
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                    Mes actual
                                </Badge>
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-background/85 p-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Mes anterior"
                                        onClick={() =>
                                            setActiveMonth(workspace.month.previousYearMonth)
                                        }
                                    >
                                        <ArrowLeft className="size-4" aria-hidden="true" />
                                    </Button>
                                    <span className="px-3 text-sm font-medium">
                                        {formatMonthLabel(workspace.month.yearMonth)}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Mes siguiente"
                                        onClick={() =>
                                            setActiveMonth(workspace.month.nextYearMonth)
                                        }
                                    >
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2.15rem]">
                                    {formatMonthLabel(workspace.month.yearMonth)}
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                    Este dashboard esta hecho para responder rapido como viene tu
                                    mes: cuanto entro, cuanto salio, que te queda, que deberias
                                    ahorrar y que pagos siguen abiertos.
                                </p>
                            </div>

                            <div
                                className={cn(
                                    'rounded-[1.15rem] border px-4 py-4',
                                    getMonthStatusToneClasses(workspace.monthStatus.tone),
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/65">
                                        <TriangleAlert className="size-4" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">
                                            {workspace.monthStatus.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 opacity-90">
                                            {workspace.monthStatus.description}
                                        </p>
                                        {workspace.monthStatus.cues.length > 0 ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {workspace.monthStatus.cues.map((cue) => (
                                                    <span
                                                        key={cue}
                                                        className="rounded-full border border-current/12 bg-white/60 px-3 py-1 text-xs"
                                                    >
                                                        {cue}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 rounded-[1.3rem] border border-border/75 bg-background/86 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">Accesos rapidos</p>
                                    <p className="text-sm text-muted-foreground">
                                        Registra lo importante sin salir del dashboard.
                                    </p>
                                </div>
                                <Badge variant="outline" className="rounded-full">
                                    5 acciones
                                </Badge>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <QuickActionButton
                                    icon={<Wallet className="size-4" aria-hidden="true" />}
                                    label="Registrar ingreso"
                                    onClick={() => openModal('income')}
                                />
                                <QuickActionButton
                                    icon={<ReceiptText className="size-4" aria-hidden="true" />}
                                    label="Registrar gasto"
                                    onClick={() => openModal('expense')}
                                />
                                <QuickActionButton
                                    icon={<CreditCard className="size-4" aria-hidden="true" />}
                                    label="Registrar pago de deuda"
                                    onClick={() => openModal('debt-payment')}
                                />
                                <QuickActionButton
                                    icon={<CalendarDays className="size-4" aria-hidden="true" />}
                                    label="Crear obligacion mensual"
                                    onClick={() => openModal('obligation')}
                                />
                                <QuickActionButton
                                    icon={<PiggyBank className="size-4" aria-hidden="true" />}
                                    label="Crear meta de ahorro"
                                    onClick={() => openModal('saving-goal')}
                                />
                                <QuickActionButton
                                    icon={<BadgePlus className="size-4" aria-hidden="true" />}
                                    label="Crear categoria"
                                    onClick={() => openModal('category')}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <SummaryMetric
                        label="Ingresos del mes"
                        value={formatCurrency(workspace.summary.incomeTotal, currencyCode)}
                        detail="Todo lo recibido en el mes actual."
                        tone="text-primary"
                    />
                    <SummaryMetric
                        label="Gastos del mes"
                        value={formatCurrency(workspace.summary.expenseTotal, currencyCode)}
                        detail="No incluye pagos de deuda ni ahorro."
                        tone="text-foreground"
                    />
                    <SummaryMetric
                        label="Disponible"
                        value={formatCurrency(
                            workspace.summary.availableBalance,
                            currencyCode,
                        )}
                        detail="Lo que queda despues de ingresos, gastos, deuda y ahorro."
                        tone={
                            workspace.summary.availableBalance < 0
                                ? 'text-[color:var(--chart-3)]'
                                : 'text-[color:var(--chart-1)]'
                        }
                    />
                    <SummaryMetric
                        label="Ahorro acumulado"
                        value={formatCurrency(
                            workspace.summary.savingContributionTotal,
                            currencyCode,
                        )}
                        detail="Aportes registrados al ahorro en este mes."
                        tone="text-[color:var(--chart-1)]"
                    />
                    <SummaryMetric
                        label="Pagado en deudas"
                        value={formatCurrency(
                            workspace.summary.debtPaymentTotal,
                            currencyCode,
                        )}
                        detail="Pagos minimos y extras aplicados a deudas."
                        tone="text-[color:var(--chart-3)]"
                    />
                    <SummaryMetric
                        label="Obligaciones pendientes"
                        value={formatCurrency(
                            workspace.pendingSummary.pendingObligationsAmount,
                            currencyCode,
                        )}
                        detail={`${workspace.pendingSummary.pendingObligationsCount} items abiertos para este mes.`}
                        tone="text-secondary-foreground"
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
                    <div className="grid gap-5">
                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Regla 50/30/20</CardTitle>
                                <CardDescription>
                                    Compara lo que deberias mover este mes contra lo que ya
                                    registraste.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.needs.actualAmount}
                                    bucketLabel="Necesidades"
                                    bucketStatus={workspace.rule503020.needs.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={workspace.rule503020.needs.remainingAmount}
                                    targetAmount={workspace.rule503020.needs.targetAmount}
                                />
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.wants.actualAmount}
                                    bucketLabel="Deseos"
                                    bucketStatus={workspace.rule503020.wants.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={workspace.rule503020.wants.remainingAmount}
                                    targetAmount={workspace.rule503020.wants.targetAmount}
                                />
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.savingsDebt.actualAmount}
                                    bucketLabel="Ahorro / deuda"
                                    bucketStatus={workspace.rule503020.savingsDebt.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={
                                        workspace.rule503020.savingsDebt.remainingAmount
                                    }
                                    targetAmount={workspace.rule503020.savingsDebt.targetAmount}
                                />
                                {workspace.rule503020.unassignedExpenseAmount > 0 ? (
                                    <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                        Tienes{' '}
                                        <span className="finance-number font-semibold">
                                            {formatCurrency(
                                                workspace.rule503020.unassignedExpenseAmount,
                                                currencyCode,
                                            )}
                                        </span>{' '}
                                        en gastos sin clasificar. Eso no entra todavia en el
                                        avance real del 50/30/20.
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Obligaciones pendientes</CardTitle>
                                <CardDescription>
                                    Lo que todavia no has marcado como pagado en este mes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {pendingObligations.length > 0 ? (
                                    pendingObligations.map((obligation) => (
                                        <div
                                            key={obligation.id}
                                            className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {obligation.name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {obligation.categoryName}
                                                        {obligation.expectedOn
                                                            ? ` · vence ${formatDateLabel(obligation.expectedOn)}`
                                                            : ' · sin fecha definida'}
                                                    </p>
                                                </div>
                                                <p className="finance-number text-lg font-semibold text-foreground">
                                                    {formatCurrency(
                                                        obligation.plannedAmount,
                                                        currencyCode,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="brand"
                                                    disabled={isSubmitting}
                                                    onClick={() =>
                                                        void handleMarkObligationPaid(
                                                            obligation,
                                                        )
                                                    }
                                                >
                                                    Marcar como pagada
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openModal('expense')}
                                                >
                                                    Registrar otro gasto
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No tienes obligaciones abiertas en este mes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-5">
                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Deudas por pagar</CardTitle>
                                <CardDescription>
                                    Revisa minimos, saldo actual y acceso rapido al pago.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {activeDebts.length > 0 ? (
                                    activeDebts.map((debt) => (
                                        <div
                                            key={debt.id}
                                            className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {debt.name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {debt.dueDay
                                                            ? `Pago estimado el dia ${debt.dueDay}`
                                                            : 'Sin dia de pago definido'}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className="rounded-full">
                                                    {Math.round(debt.progressPct)}% saldado
                                                </Badge>
                                            </div>
                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                        Saldo actual
                                                    </p>
                                                    <p className="finance-number mt-1 text-lg font-semibold">
                                                        {formatCurrency(
                                                            debt.currentPrincipal,
                                                            debt.currencyCode,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                        Pago minimo
                                                    </p>
                                                    <p className="finance-number mt-1 text-lg font-semibold">
                                                        {formatCurrency(
                                                            debt.minimumPaymentAmount ?? 0,
                                                            debt.currencyCode,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <Progress
                                                    value={debt.progressPct}
                                                    aria-label={`Progreso de ${debt.name}`}
                                                />
                                            </div>
                                            <div className="mt-3">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="brand"
                                                    onClick={() =>
                                                        openModal('debt-payment', {
                                                            debtId: debt.id,
                                                        })
                                                    }
                                                >
                                                    Registrar pago
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No tienes deudas activas registradas.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Proximos vencimientos</CardTitle>
                                <CardDescription>
                                    Prioriza primero lo que ya esta vencido o se acerca.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {workspace.pendingSummary.upcomingDueItems.length > 0 ? (
                                    workspace.pendingSummary.upcomingDueItems.map((item) => (
                                        <div
                                            key={`${item.kind}-${item.id}`}
                                            className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/75 bg-background/82 px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {item.kind === 'debt'
                                                        ? 'Pago de deuda'
                                                        : 'Obligacion mensual'}{' '}
                                                    · {formatDateLabel(item.dueOn)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="finance-number text-sm font-semibold">
                                                    {formatCurrency(item.amount, currencyCode)}
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-1 text-xs',
                                                        item.isOverdue
                                                            ? 'text-[color:var(--chart-3)]'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {item.isOverdue ? 'Vencido' : 'Pendiente'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No hay vencimientos proximos para mostrar.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Metas de ahorro</CardTitle>
                                <CardDescription>
                                    Sigue el avance real de tus metas activas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {workspace.savingGoals.length > 0 ? (
                                    workspace.savingGoals.map((goal) => {
                                        const progress =
                                            goal.targetAmount <= 0
                                                ? 0
                                                : Math.min(
                                                      100,
                                                      Math.max(
                                                          0,
                                                          (goal.currentSavedAmount /
                                                              goal.targetAmount) *
                                                              100,
                                                      ),
                                                  )

                                        return (
                                            <div
                                                key={goal.id}
                                                className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {goal.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {goal.targetDate
                                                                ? `Meta para ${formatDateLabel(goal.targetDate)}`
                                                                : 'Sin fecha limite'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="rounded-full">
                                                        Prioridad {goal.priority ?? 'N/A'}
                                                    </Badge>
                                                </div>
                                                <div className="mt-4">
                                                    <Progress
                                                        value={progress}
                                                        aria-label={`Avance de ${goal.name}`}
                                                    />
                                                </div>
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                            Ahorrado
                                                        </p>
                                                        <p className="finance-number mt-1 text-lg font-semibold">
                                                            {formatCurrency(
                                                                goal.currentSavedAmount,
                                                                currencyCode,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                            Objetivo
                                                        </p>
                                                        <p className="finance-number mt-1 text-lg font-semibold">
                                                            {formatCurrency(
                                                                goal.targetAmount,
                                                                currencyCode,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        Aun no tienes metas de ahorro activas.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                    <div className="grid gap-5">
                        <Card className="overflow-visible border border-white/70 bg-card/95 shadow-[0_24px_48px_-34px_oklch(0.19_0.025_255/0.24)]">
                            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)] lg:p-6">
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                            Mes operativo
                                        </Badge>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-background/85 p-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Mes anterior"
                                                onClick={() =>
                                                    setActiveMonth(workspace.month.previousYearMonth)
                                                }
                                            >
                                                <ArrowLeft className="size-4" aria-hidden="true" />
                                            </Button>
                                            <span className="px-3 text-sm font-medium">
                                                {formatMonthLabel(workspace.month.yearMonth)}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Mes siguiente"
                                                onClick={() =>
                                                    setActiveMonth(workspace.month.nextYearMonth)
                                                }
                                            >
                                                <ArrowRight className="size-4" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2.15rem]">
                                            {formatMonthLabel(workspace.month.yearMonth)}
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                            Aqui administras el dia a dia del mes: ingresos,
                                            gastos, deuda, obligaciones, ahorro y cierre final.
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'rounded-[1.15rem] border px-4 py-4',
                                            getMonthStatusToneClasses(workspace.monthStatus.tone),
                                        )}
                                    >
                                        <p className="text-sm font-semibold">
                                            {workspace.monthStatus.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 opacity-90">
                                            {workspace.monthStatus.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-3 rounded-[1.3rem] border border-border/75 bg-background/86 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold">Acciones del mes</p>
                                            <p className="text-sm text-muted-foreground">
                                                Registra movimientos y decisiones sin salir de esta vista.
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full">
                                            6 acciones
                                        </Badge>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <QuickActionButton
                                            icon={<Wallet className="size-4" aria-hidden="true" />}
                                            label="Registrar ingreso"
                                            onClick={() => openModal('income')}
                                        />
                                        <QuickActionButton
                                            icon={<ReceiptText className="size-4" aria-hidden="true" />}
                                            label="Registrar gasto"
                                            onClick={() => openModal('expense')}
                                        />
                                        <QuickActionButton
                                            icon={<CreditCard className="size-4" aria-hidden="true" />}
                                            label="Pago de deuda"
                                            onClick={() => openModal('debt-payment')}
                                        />
                                        <QuickActionButton
                                            icon={<CalendarDays className="size-4" aria-hidden="true" />}
                                            label="Nueva obligacion"
                                            onClick={() => openModal('obligation')}
                                        />
                                        <QuickActionButton
                                            icon={<PiggyBank className="size-4" aria-hidden="true" />}
                                            label="Aportar ahorro"
                                            onClick={() => openModal('saving-contribution')}
                                        />
                                        <QuickActionButton
                                            icon={<BadgePlus className="size-4" aria-hidden="true" />}
                                            label="Crear meta o categoria"
                                            onClick={() => openModal('saving-goal')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Ingresos del mes"
                                    description="Incluye salario formal y entradas extra registradas para este mes."
                                    action={
                                        <Button type="button" variant="brand" onClick={() => openModal('income')}>
                                            Registrar ingreso
                                        </Button>
                                    }
                                />
                                {workspace.activity.incomes.length > 0 ? (
                                    workspace.activity.incomes.map((income) => (
                                        <MonthLineItem
                                            key={income.id}
                                            amount={income.amount}
                                            badge={
                                                <Badge variant="secondary" className="rounded-full">
                                                    {income.kind === 'PAYCHECK' ? 'Salario' : 'Ingreso extra'}
                                                </Badge>
                                            }
                                            currencyCode={currencyCode}
                                            title={income.title}
                                        >
                                            {formatDateLabel(income.occurredOn)}
                                            {income.kind === 'PAYCHECK' ? (
                                                <>
                                                    {' · '}Auxilio{' '}
                                                    {formatCurrency(income.transportAllowance ?? 0, currencyCode)}
                                                    {' · '}Descuentos{' '}
                                                    {formatCurrency(income.totalDeductions ?? 0, currencyCode)}
                                                </>
                                            ) : income.notes ? (
                                                <> · {income.notes}</>
                                            ) : null}
                                        </MonthLineItem>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        Aun no has registrado ingresos en este mes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Gastos del mes"
                                    description="Solo gastos corrientes del mes activo, separados de deuda y ahorro."
                                    action={
                                        <Button type="button" variant="brand" onClick={() => openModal('expense')}>
                                            Registrar gasto
                                        </Button>
                                    }
                                />
                                {workspace.activity.expenses.length > 0 ? (
                                    workspace.activity.expenses.map((expense) => (
                                        <MonthLineItem
                                            key={expense.id}
                                            amount={expense.amount}
                                            badge={
                                                expense.budgetBucket ? (
                                                    <Badge variant="outline" className="rounded-full">
                                                        {getBucketLabel(expense.budgetBucket)}
                                                    </Badge>
                                                ) : undefined
                                            }
                                            currencyCode={currencyCode}
                                            muted
                                            title={expense.title}
                                        >
                                            {formatDateLabel(expense.occurredOn)}
                                            {expense.categoryName ? ` · ${expense.categoryName}` : ''}
                                            {expense.notes ? ` · ${expense.notes}` : ''}
                                        </MonthLineItem>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No hay gastos corrientes registrados para este mes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Deudas del mes"
                                    description="Aqui ves tus deudas activas y los pagos ya registrados en el mes."
                                    action={
                                        <Button type="button" variant="brand" onClick={() => openModal('debt-payment')}>
                                            Registrar pago
                                        </Button>
                                    }
                                />
                                <div className="grid gap-3">
                                    {activeDebts.length > 0 ? (
                                        activeDebts.map((debt) => (
                                            <div
                                                key={debt.id}
                                                className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold">{debt.name}</p>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {debt.dueDay
                                                                ? `Pago estimado el dia ${debt.dueDay}`
                                                                : 'Sin fecha de pago definida'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {Math.round(debt.progressPct)}% saldado
                                                    </Badge>
                                                </div>
                                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                            Saldo actual
                                                        </p>
                                                        <p className="finance-number mt-1 text-lg font-semibold">
                                                            {formatCurrency(debt.currentPrincipal, debt.currencyCode)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                                            Pago minimo
                                                        </p>
                                                        <p className="finance-number mt-1 text-lg font-semibold">
                                                            {formatCurrency(debt.minimumPaymentAmount ?? 0, debt.currencyCode)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                            No tienes deudas activas registradas.
                                        </div>
                                    )}
                                </div>
                                {workspace.activity.debtPayments.length > 0 ? (
                                    <div className="grid gap-3">
                                        {workspace.activity.debtPayments.map((payment) => (
                                            <MonthLineItem
                                                key={payment.id}
                                                amount={payment.totalAmount}
                                                badge={
                                                    <Badge variant="outline" className="rounded-full">
                                                        Min {formatCurrency(payment.minimumAmount, currencyCode)} · Extra {formatCurrency(payment.extraAmount, currencyCode)}
                                                    </Badge>
                                                }
                                                currencyCode={currencyCode}
                                                muted
                                                title={payment.debtName}
                                            >
                                                {formatDateLabel(payment.paidOn)}
                                                {payment.notes ? ` · ${payment.notes}` : ''}
                                            </MonthLineItem>
                                        ))}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Obligaciones del mes"
                                    description="Pagos recurrentes o puntuales que debes resolver dentro del mes activo."
                                    action={
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isSubmitting}
                                                onClick={() => void handleCopyPreviousMonthObligations()}
                                            >
                                                Copiar mes pasado
                                            </Button>
                                            <Button type="button" variant="brand" onClick={() => openModal('obligation')}>
                                                Crear obligacion
                                            </Button>
                                        </div>
                                    }
                                />
                                {workspace.obligations.length > 0 ? (
                                    workspace.obligations.map((obligation) => (
                                        <div
                                            key={obligation.id}
                                            className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-semibold">{obligation.name}</p>
                                                        <Badge
                                                            variant={
                                                                obligation.status === 'PAID'
                                                                    ? 'secondary'
                                                                    : obligation.status === 'SKIPPED'
                                                                      ? 'outline'
                                                                      : 'destructive'
                                                            }
                                                            className="rounded-full"
                                                        >
                                                            {obligation.status === 'PAID'
                                                                ? 'Pagada'
                                                                : obligation.status === 'SKIPPED'
                                                                  ? 'Saltada'
                                                                  : 'Pendiente'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {obligation.categoryName}
                                                        {obligation.expectedOn
                                                            ? ` · vence ${formatDateLabel(obligation.expectedOn)}`
                                                            : ' · sin fecha definida'}
                                                    </p>
                                                </div>
                                                <p className="finance-number text-lg font-semibold">
                                                    {formatCurrency(obligation.plannedAmount, currencyCode)}
                                                </p>
                                            </div>
                                            {obligation.status === 'DRAFT' ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="brand"
                                                        disabled={isSubmitting}
                                                        onClick={() => void handleMarkObligationPaid(obligation)}
                                                    >
                                                        Marcar pagada
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isSubmitting}
                                                        onClick={() => void handleSkipObligation(obligation.id)}
                                                    >
                                                        Saltar este mes
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No tienes obligaciones registradas para este mes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Ahorro del mes"
                                    description="Registra aportes simples o vinculados a metas activas."
                                    action={
                                        <div className="flex flex-wrap gap-2">
                                            <Button type="button" variant="outline" onClick={() => openModal('saving-goal')}>
                                                Crear meta
                                            </Button>
                                            <Button type="button" variant="brand" onClick={() => openModal('saving-contribution')}>
                                                Registrar aporte
                                            </Button>
                                        </div>
                                    }
                                />
                                {workspace.activity.savingContributions.length > 0 ? (
                                    workspace.activity.savingContributions.map((contribution) => (
                                        <MonthLineItem
                                            key={contribution.id}
                                            amount={contribution.amount}
                                            badge={
                                                contribution.savingGoalName ? (
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {contribution.savingGoalName}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="rounded-full">
                                                        Ahorro general
                                                    </Badge>
                                                )
                                            }
                                            currencyCode={currencyCode}
                                            muted
                                            title={contribution.title}
                                        >
                                            {formatDateLabel(contribution.occurredOn)}
                                            {contribution.notes ? ` · ${contribution.notes}` : ''}
                                        </MonthLineItem>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        Todavia no registras aportes de ahorro en este mes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-5">
                        <Card className="border border-white/70 bg-card/95">
                            <CardContent className="grid gap-4 p-5">
                                <SectionHeader
                                    title="Resumen final del mes"
                                    description="Lo esencial para cerrar decisiones rapidas sobre el mes actual."
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <SummaryMetric
                                        label="Ingresos"
                                        value={formatCurrency(workspace.summary.incomeTotal, currencyCode)}
                                        detail="Todo lo recibido este mes."
                                        tone="text-primary"
                                    />
                                    <SummaryMetric
                                        label="Gastos"
                                        value={formatCurrency(workspace.summary.expenseTotal, currencyCode)}
                                        detail="Gasto corriente sin deuda ni ahorro."
                                    />
                                    <SummaryMetric
                                        label="Obligaciones pagadas"
                                        value={formatCurrency(paidObligationsTotal, currencyCode)}
                                        detail="Pagos cerrados desde obligaciones del mes."
                                    />
                                    <SummaryMetric
                                        label="Deuda pagada"
                                        value={formatCurrency(workspace.summary.debtPaymentTotal, currencyCode)}
                                        detail="Minimos y extras aplicados a deudas."
                                    />
                                    <SummaryMetric
                                        label="Ahorro"
                                        value={formatCurrency(workspace.summary.savingContributionTotal, currencyCode)}
                                        detail={`Has ahorrado ${savedPct.toFixed(1)}% de tus ingresos.`}
                                        tone="text-[color:var(--chart-1)]"
                                    />
                                    <SummaryMetric
                                        label="Disponible"
                                        value={formatCurrency(workspace.summary.availableBalance, currencyCode)}
                                        detail="Resto real despues de ingresos, gastos, deuda y ahorro."
                                        tone={
                                            workspace.summary.availableBalance < 0
                                                ? 'text-[color:var(--chart-3)]'
                                                : 'text-[color:var(--chart-1)]'
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Regla 50/30/20</CardTitle>
                                <CardDescription>
                                    Sigue tu avance frente al plan mensual en necesidades, deseos y ahorro/deuda.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.needs.actualAmount}
                                    bucketLabel="Necesidades"
                                    bucketStatus={workspace.rule503020.needs.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={workspace.rule503020.needs.remainingAmount}
                                    targetAmount={workspace.rule503020.needs.targetAmount}
                                />
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.wants.actualAmount}
                                    bucketLabel="Deseos"
                                    bucketStatus={workspace.rule503020.wants.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={workspace.rule503020.wants.remainingAmount}
                                    targetAmount={workspace.rule503020.wants.targetAmount}
                                />
                                <RuleBucketCard
                                    actualAmount={workspace.rule503020.savingsDebt.actualAmount}
                                    bucketLabel="Ahorro / deuda"
                                    bucketStatus={workspace.rule503020.savingsDebt.status}
                                    currencyCode={currencyCode}
                                    remainingAmount={workspace.rule503020.savingsDebt.remainingAmount}
                                    targetAmount={workspace.rule503020.savingsDebt.targetAmount}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Pagos pendientes</CardTitle>
                                <CardDescription>
                                    Lo que deberias resolver primero antes de seguir gastando.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {workspace.pendingSummary.upcomingDueItems.length > 0 ? (
                                    workspace.pendingSummary.upcomingDueItems.map((item) => (
                                        <div
                                            key={`${item.kind}-${item.id}`}
                                            className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/75 bg-background/82 px-4 py-3"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{item.title}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {item.kind === 'debt' ? 'Pago de deuda' : 'Obligacion mensual'} · {formatDateLabel(item.dueOn)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="finance-number text-sm font-semibold">
                                                    {formatCurrency(item.amount, currencyCode)}
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-1 text-xs',
                                                        item.isOverdue
                                                            ? 'text-[color:var(--chart-3)]'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {item.isOverdue ? 'Vencido' : 'Pendiente'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No hay pagos pendientes por mostrar.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-white/70 bg-card/95">
                            <CardHeader>
                                <CardTitle>Metas activas</CardTitle>
                                <CardDescription>
                                    Tus metas siguen visibles para que el ahorro no quede fuera del mes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {workspace.savingGoals.length > 0 ? (
                                    workspace.savingGoals.map((goal) => {
                                        const progress =
                                            goal.targetAmount <= 0
                                                ? 0
                                                : Math.min(
                                                      100,
                                                      Math.max(
                                                          0,
                                                          (goal.currentSavedAmount /
                                                              goal.targetAmount) *
                                                              100,
                                                      ),
                                                  )

                                        return (
                                            <div
                                                key={goal.id}
                                                className="rounded-[1rem] border border-border/75 bg-background/82 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold">{goal.name}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {goal.targetDate
                                                                ? `Meta para ${formatDateLabel(goal.targetDate)}`
                                                                : 'Sin fecha limite'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="rounded-full">
                                                        Prioridad {goal.priority ?? 'N/A'}
                                                    </Badge>
                                                </div>
                                                <div className="mt-4">
                                                    <Progress value={progress} aria-label={`Avance de ${goal.name}`} />
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="rounded-[1rem] border border-dashed border-border/75 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                                        No hay metas activas en este momento.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {modalType === 'category' ? (
                <DashboardModal
                    title="Crear categoria de gasto"
                    description="Clasifica bien la categoria para que el 50/30/20 sea real y no aproximado."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateCategory}>
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Nombre</Label>
                            <Input
                                id="category-name"
                                value={categoryForm.name}
                                onChange={(event) =>
                                    setCategoryForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Ejemplo: mercado"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bucket mensual</Label>
                            <Select
                                value={categoryForm.budgetBucket}
                                onValueChange={(value: BudgetBucket) =>
                                    setCategoryForm((current) => ({
                                        ...current,
                                        budgetBucket: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona un bucket" />
                                </SelectTrigger>
                                <SelectContent>
                                    {budgetBucketOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {
                                    budgetBucketOptions.find(
                                        (option) =>
                                            option.value === categoryForm.budgetBucket,
                                    )?.description
                                }
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-color">Color (opcional)</Label>
                            <Input
                                id="category-color"
                                value={categoryForm.color}
                                onChange={(event) =>
                                    setCategoryForm((current) => ({
                                        ...current,
                                        color: event.target.value,
                                    }))
                                }
                                placeholder="#5b7cfa"
                            />
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="brand" disabled={isSubmitting}>
                                Guardar categoria
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'expense' ? (
                <DashboardModal
                    title="Registrar gasto"
                    description="Cada gasto entra al mes activo y alimenta el seguimiento real del plan mensual."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateExpense}>
                        <div className="space-y-2">
                            <Label htmlFor="expense-title">Concepto</Label>
                            <Input
                                id="expense-title"
                                value={expenseForm.title}
                                onChange={(event) =>
                                    setExpenseForm((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                                placeholder="Ejemplo: mercado de la semana"
                                required
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={expenseForm.categoryId}
                                    onValueChange={(value) =>
                                        setExpenseForm((current) => ({
                                            ...current,
                                            categoryId: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona una categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {expenseCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name} ·{' '}
                                                {getBucketLabel(
                                                    category.budgetBucket ?? 'NEEDS',
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {expenseCategories.length === 0 ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openModal('category')}
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                        Crear categoria primero
                                    </Button>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expense-amount">Monto</Label>
                                <CurrencyInput
                                    id="expense-amount"
                                    currencyCode={currencyCode}
                                    value={expenseForm.amount}
                                    onValueChange={(amount) =>
                                        setExpenseForm((current) => ({
                                            ...current,
                                            amount,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expense-date">Fecha</Label>
                                <Input
                                    id="expense-date"
                                    type="date"
                                    value={expenseForm.occurredOn}
                                    onChange={(event) =>
                                        setExpenseForm((current) => ({
                                            ...current,
                                            occurredOn: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expense-notes">Notas</Label>
                            <textarea
                                id="expense-notes"
                                value={expenseForm.notes ?? ''}
                                onChange={(event) =>
                                    setExpenseForm((current) => ({
                                        ...current,
                                        notes: event.target.value,
                                    }))
                                }
                                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                placeholder="Opcional: detalle corto para recordar el gasto."
                            />
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={isSubmitting || expenseCategories.length === 0}
                            >
                                Guardar gasto
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'income' ? (
                <DashboardModal
                    title="Registrar ingreso"
                    description="Puedes registrar salario formal con su desglose o un ingreso extra simple para el mismo mes."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateIncome}>
                        <div className="inline-flex rounded-full border border-border/75 bg-background/80 p-1">
                            <Button
                                type="button"
                                variant={incomeMode === 'paycheck' ? 'brand' : 'ghost'}
                                size="sm"
                                onClick={() => setIncomeMode('paycheck')}
                            >
                                Salario formal
                            </Button>
                            <Button
                                type="button"
                                variant={incomeMode === 'extra' ? 'brand' : 'ghost'}
                                size="sm"
                                onClick={() => setIncomeMode('extra')}
                            >
                                Ingreso extra
                            </Button>
                        </div>
                        {incomeMode === 'paycheck' ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="paycheck-date">Fecha</Label>
                                    <Input
                                        id="paycheck-date"
                                        type="date"
                                        value={paycheckForm.paidOn}
                                        onChange={(event) =>
                                            setPaycheckForm((current) => ({
                                                ...current,
                                                paidOn: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paycheck-base">Salario base</Label>
                                    <CurrencyInput
                                        id="paycheck-base"
                                        currencyCode={currencyCode}
                                        value={paycheckForm.salaryBase}
                                        onValueChange={(salaryBase) =>
                                            setPaycheckForm((current) => ({
                                                ...current,
                                                salaryBase,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paycheck-transport">Auxilio</Label>
                                    <CurrencyInput
                                        id="paycheck-transport"
                                        currencyCode={currencyCode}
                                        value={paycheckForm.transportAllowance}
                                        onValueChange={(transportAllowance) =>
                                            setPaycheckForm((current) => ({
                                                ...current,
                                                transportAllowance,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paycheck-deductions">Descuentos</Label>
                                    <CurrencyInput
                                        id="paycheck-deductions"
                                        currencyCode={currencyCode}
                                        value={paycheckForm.totalDeductions}
                                        onValueChange={(totalDeductions) =>
                                            setPaycheckForm((current) => ({
                                                ...current,
                                                totalDeductions,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="income-title">Concepto</Label>
                                    <Input
                                        id="income-title"
                                        value={incomeForm.title}
                                        onChange={(event) =>
                                            setIncomeForm((current) => ({
                                                ...current,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder="Ejemplo: freelance, reembolso o bonificacion"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="income-date">Fecha</Label>
                                    <Input
                                        id="income-date"
                                        type="date"
                                        value={incomeForm.occurredOn}
                                        onChange={(event) =>
                                            setIncomeForm((current) => ({
                                                ...current,
                                                occurredOn: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="income-amount">Monto</Label>
                                    <CurrencyInput
                                        id="income-amount"
                                        currencyCode={currencyCode}
                                        value={incomeForm.amount}
                                        onValueChange={(amount) =>
                                            setIncomeForm((current) => ({
                                                ...current,
                                                amount,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="income-notes">Notas</Label>
                                    <textarea
                                        id="income-notes"
                                        value={incomeForm.notes ?? ''}
                                        onChange={(event) =>
                                            setIncomeForm((current) => ({
                                                ...current,
                                                notes: event.target.value,
                                            }))
                                        }
                                        className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        placeholder="Opcional: origen o detalle del ingreso."
                                    />
                                </div>
                            </div>
                        )}
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="brand" disabled={isSubmitting}>
                                Guardar ingreso
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'obligation' ? (
                <DashboardModal
                    title="Crear obligacion mensual"
                    description="Usa esta accion para gastos comprometidos que todavia no has pagado."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateObligation}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="obligation-name">Nombre</Label>
                                <Input
                                    id="obligation-name"
                                    value={obligationForm.name}
                                    onChange={(event) =>
                                        setObligationForm((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder="Ejemplo: arriendo"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={obligationForm.categoryId}
                                    onValueChange={(value) =>
                                        setObligationForm((current) => ({
                                            ...current,
                                            categoryId: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona una categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {expenseCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="obligation-date">Fecha esperada</Label>
                                <Input
                                    id="obligation-date"
                                    type="date"
                                    value={obligationForm.expectedOn ?? ''}
                                    onChange={(event) =>
                                        setObligationForm((current) => ({
                                            ...current,
                                            expectedOn: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="obligation-amount">Monto planeado</Label>
                                <CurrencyInput
                                    id="obligation-amount"
                                    currencyCode={currencyCode}
                                    value={obligationForm.plannedAmount}
                                    onValueChange={(plannedAmount) =>
                                        setObligationForm((current) => ({
                                            ...current,
                                            plannedAmount,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={obligationForm.obligationType}
                                    onValueChange={(value: 'FIXED' | 'VARIABLE') =>
                                        setObligationForm((current) => ({
                                            ...current,
                                            obligationType: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FIXED">Fija</SelectItem>
                                        <SelectItem value="VARIABLE">Variable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <label className="flex items-start gap-3 rounded-[1rem] border border-border/75 bg-background/72 px-4 py-3 text-sm">
                            <input
                                type="checkbox"
                                className="mt-1 size-4 rounded border-border"
                                checked={obligationForm.recurring}
                                onChange={(event) =>
                                    setObligationForm((current) => ({
                                        ...current,
                                        recurring: event.target.checked,
                                    }))
                                }
                            />
                            <span>
                                Guardar tambien como plantilla recurrente para que aparezca sola
                                en los siguientes meses.
                            </span>
                        </label>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={isSubmitting || expenseCategories.length === 0}
                            >
                                Guardar obligacion
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'debt-payment' ? (
                <DashboardModal
                    title="Registrar pago de deuda"
                    description="Separa el minimo del extra para entender mejor como avanza tu alivio de deuda."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateDebtPayment}>
                        <div className="space-y-2">
                            <Label>Deuda</Label>
                            <Select
                                value={debtPaymentForm.debtId}
                                onValueChange={(value) =>
                                    setDebtPaymentForm((current) => ({
                                        ...current,
                                        debtId: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona una deuda" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeDebts.map((debt) => (
                                        <SelectItem key={debt.id} value={debt.id}>
                                            {debt.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="debt-payment-date">Fecha</Label>
                                <Input
                                    id="debt-payment-date"
                                    type="date"
                                    value={debtPaymentForm.paidOn}
                                    onChange={(event) =>
                                        setDebtPaymentForm((current) => ({
                                            ...current,
                                            paidOn: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="debt-payment-min">Minimo</Label>
                                <CurrencyInput
                                    id="debt-payment-min"
                                    currencyCode={currencyCode}
                                    value={debtPaymentForm.minimumAmount}
                                    onValueChange={(minimumAmount) =>
                                        setDebtPaymentForm((current) => ({
                                            ...current,
                                            minimumAmount,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="debt-payment-extra">Extra</Label>
                                <CurrencyInput
                                    id="debt-payment-extra"
                                    currencyCode={currencyCode}
                                    value={debtPaymentForm.extraAmount}
                                    onValueChange={(extraAmount) =>
                                        setDebtPaymentForm((current) => ({
                                            ...current,
                                            extraAmount,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="rounded-[1rem] border border-border/75 bg-secondary/55 px-4 py-3 text-sm">
                            Total registrado:{' '}
                            <span className="finance-number font-semibold text-primary">
                                {formatCurrency(
                                    debtPaymentForm.minimumAmount +
                                        debtPaymentForm.extraAmount,
                                    currencyCode,
                                )}
                            </span>
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={isSubmitting || activeDebts.length === 0}
                            >
                                Guardar pago
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'saving-contribution' ? (
                <DashboardModal
                    title="Registrar aporte de ahorro"
                    description="Puedes enviarlo a una meta activa o dejarlo como ahorro general del mes."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateSavingContribution}>
                        <div className="space-y-2">
                            <Label htmlFor="saving-contribution-title">Concepto</Label>
                            <Input
                                id="saving-contribution-title"
                                value={savingContributionForm.title}
                                onChange={(event) =>
                                    setSavingContributionForm((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                                placeholder="Ejemplo: aporte al fondo de emergencia"
                                required
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="saving-contribution-date">Fecha</Label>
                                <Input
                                    id="saving-contribution-date"
                                    type="date"
                                    value={savingContributionForm.occurredOn}
                                    onChange={(event) =>
                                        setSavingContributionForm((current) => ({
                                            ...current,
                                            occurredOn: event.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="saving-contribution-amount">Monto</Label>
                                <CurrencyInput
                                    id="saving-contribution-amount"
                                    currencyCode={currencyCode}
                                    value={savingContributionForm.amount}
                                    onValueChange={(amount) =>
                                        setSavingContributionForm((current) => ({
                                            ...current,
                                            amount,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Meta vinculada</Label>
                                <Select
                                    value={savingContributionForm.savingGoalId ?? 'general'}
                                    onValueChange={(value) =>
                                        setSavingContributionForm((current) => ({
                                            ...current,
                                            savingGoalId:
                                                value === 'general' ? undefined : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona una meta o ahorro general" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">Ahorro general</SelectItem>
                                        {workspace.savingGoals.map((goal) => (
                                            <SelectItem key={goal.id} value={goal.id}>
                                                {goal.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="saving-contribution-notes">Notas</Label>
                                <textarea
                                    id="saving-contribution-notes"
                                    value={savingContributionForm.notes ?? ''}
                                    onChange={(event) =>
                                        setSavingContributionForm((current) => ({
                                            ...current,
                                            notes: event.target.value,
                                        }))
                                    }
                                    className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                    placeholder="Opcional: detalle corto del aporte."
                                />
                            </div>
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="brand" disabled={isSubmitting}>
                                Guardar aporte
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'saving-goal' ? (
                <DashboardModal
                    title="Crear meta de ahorro"
                    description="Las metas activas aparecen en el dashboard para que el ahorro no quede escondido."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleCreateSavingGoal}>
                        <div className="space-y-2">
                            <Label htmlFor="goal-name">Nombre</Label>
                            <Input
                                id="goal-name"
                                value={savingGoalForm.name}
                                onChange={(event) =>
                                    setSavingGoalForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Ejemplo: fondo de emergencia"
                                required
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="goal-amount">Monto objetivo</Label>
                                <CurrencyInput
                                    id="goal-amount"
                                    currencyCode={currencyCode}
                                    value={savingGoalForm.targetAmount}
                                    onValueChange={(targetAmount) =>
                                        setSavingGoalForm((current) => ({
                                            ...current,
                                            targetAmount,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="goal-priority">Prioridad</Label>
                                <Input
                                    id="goal-priority"
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={savingGoalForm.priority ?? 1}
                                    onChange={(event) =>
                                        setSavingGoalForm((current) => ({
                                            ...current,
                                            priority: Number(event.target.value),
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-3">
                                <Label htmlFor="goal-date">Fecha objetivo</Label>
                                <Input
                                    id="goal-date"
                                    type="date"
                                    value={savingGoalForm.targetDate ?? ''}
                                    onChange={(event) =>
                                        setSavingGoalForm((current) => ({
                                            ...current,
                                            targetDate: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="brand" disabled={isSubmitting}>
                                Guardar meta
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}

            {modalType === 'carryover' ? (
                <DashboardModal
                    canClose={!workspace.initialization.required}
                    title="Asignar saldo sobrante"
                    description="Antes de arrancar el mes, define que parte del cierre anterior entra a disponible, ahorro o deuda."
                    onClose={() => setModalType(null)}
                >
                    <form className="space-y-4" onSubmit={handleInitializeMonth}>
                        <div className="rounded-[1rem] border border-primary/15 bg-primary/6 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Saldo disponible para repartir
                            </p>
                            <p className="finance-number mt-2 text-2xl font-semibold text-primary">
                                {formatCurrency(carryoverTotal, currencyCode)}
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="carryover-available">Llevar a disponible</Label>
                                <CurrencyInput
                                    id="carryover-available"
                                    currencyCode={currencyCode}
                                    value={carryoverForm.toAvailableAmount}
                                    onValueChange={(toAvailableAmount) =>
                                        setCarryoverForm((current) => ({
                                            ...current,
                                            toAvailableAmount,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="carryover-savings">Llevar a ahorro</Label>
                                <CurrencyInput
                                    id="carryover-savings"
                                    currencyCode={currencyCode}
                                    value={carryoverForm.savingsAmount}
                                    onValueChange={(savingsAmount) =>
                                        setCarryoverForm((current) => ({
                                            ...current,
                                            savingsAmount,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        {activeDebts.length > 0 ? (
                            <div className="space-y-3 rounded-[1rem] border border-border/75 bg-background/72 p-4">
                                <div>
                                    <p className="font-medium">Asignar a deudas</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Puedes repartir una parte entre varias deudas activas.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {activeDebts.map((debt) => (
                                        <div
                                            key={debt.id}
                                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px]"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{debt.name}</p>
                                                <p className="finance-number text-xs text-muted-foreground">
                                                    Saldo{' '}
                                                    {formatCurrency(
                                                        debt.currentPrincipal,
                                                        debt.currencyCode,
                                                    )}
                                                </p>
                                            </div>
                                            <CurrencyInput
                                                currencyCode={currencyCode}
                                                value={
                                                    carryoverForm.debtAllocations[debt.id] ?? 0
                                                }
                                                onValueChange={(amount) =>
                                                    setCarryoverForm((current) => ({
                                                        ...current,
                                                        debtAllocations: {
                                                            ...current.debtAllocations,
                                                            [debt.id]: amount,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div
                            className={cn(
                                'rounded-[1rem] border px-4 py-3 text-sm',
                                carryoverRemaining === 0
                                    ? 'border-[color:var(--chart-1)]/20 bg-[color-mix(in_oklch,var(--chart-1)_10%,transparent)] text-[color:var(--chart-1)]'
                                    : 'border-[color:var(--chart-3)]/20 bg-[color-mix(in_oklch,var(--chart-3)_10%,transparent)] text-[color:var(--chart-3)]',
                            )}
                        >
                            Restante por asignar:{' '}
                            <span className="finance-number font-semibold">
                                {formatCurrency(carryoverRemaining, currencyCode)}
                            </span>
                        </div>
                        {formErrorMessage ? (
                            <div className="rounded-[1rem] border border-[color:var(--chart-3)]/16 bg-[color-mix(in_oklch,var(--chart-3)_8%,white)] px-4 py-3 text-sm text-[color:var(--chart-3)]">
                                {formErrorMessage}
                            </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                            {!workspace.initialization.required ? (
                                <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
                                    Cancelar
                                </Button>
                            ) : null}
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={isSubmitting || carryoverRemaining !== 0}
                            >
                                Confirmar apertura del mes
                            </Button>
                        </div>
                    </form>
                </DashboardModal>
            ) : null}
        </>
    )
}
