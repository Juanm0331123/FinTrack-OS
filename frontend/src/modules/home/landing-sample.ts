import { computeSummaryRows, summarizeYear } from '@/modules/finance/domain/annual-summary'
import { computeDebtPlan } from '@/modules/finance/domain/debt-plan'
import { computeMonthSheet } from '@/modules/finance/domain/month-sheet'
import { pocketProgress } from '@/modules/finance/domain/pockets'
import type {
    Debt,
    EntryCategory,
    FinanceSettings,
    MoneyAccount,
    MonthEntry,
    MonthSheet,
} from '@/modules/finance/domain/types'
import { longDayLabel } from '@/modules/finance/domain/year-month'

// Datos sintéticos de la landing (docs/landing-content.md §3). No vienen de ningún usuario ni del
// libro original: se inventaron para explicar el producto y se calculan con el dominio de la app,
// así la demostración no puede contradecir sus reglas (bolsillos, colchón, plan de deudas).

const SAMPLE_YEAR = 2026

const settings: FinanceSettings = {
    benefitsRate: 0,
    cushionAmount: 500_000,
    debtStrategy: 'RECOMMENDED',
    redirectDebtOverpayments: false,
}

const accounts: MoneyAccount[] = [
    { archived: false, id: 'main', name: 'Cuenta principal', sortOrder: 0 },
    { archived: false, id: 'cash', name: 'Efectivo', sortOrder: 1 },
]

const debt: Debt = {
    datesNote: null,
    dueDay: 15,
    id: 'sample-debt',
    insuranceRate: 0,
    lender: null,
    minimumPayment: 300_000,
    monthlyRate: 0.02,
    myMinimumOverride: null,
    name: 'Deuda de ejemplo',
    notes: null,
    partnerContribution: 0,
    paymentCap: null,
    sharedAmount: 0,
    sharedPercent: null,
    sharedWith: null,
    sortOrder: 0,
    status: 'ACTIVE',
    totalBalance: 3_000_000,
}

type EntrySeed = Pick<MonthEntry, 'category' | 'concept'> &
    Partial<Pick<MonthEntry, 'accountId' | 'debtId' | 'dueDay' | 'isPaid' | 'spends'>> & { amount: number }

function entries(yearMonth: string, seeds: EntrySeed[]): MonthEntry[] {
    return seeds.map((seed, index) => ({
        accountId: 'main',
        debtId: null,
        dueDay: null,
        isPaid: false,
        note: null,
        spends: [],
        ...seed,
        id: `${yearMonth}-${index}`,
        sortOrder: index,
    }))
}

function sheet(yearMonth: string, salary: number, rows: EntrySeed[]): MonthSheet {
    return {
        // Prestaciones, deducciones y auxilios en cero: el ingreso neto es el salario de la muestra.
        benefitsOverride: 0,
        disabilityIncome: null,
        entries: entries(yearMonth, rows),
        id: yearMonth,
        leftoverDestination: 'AVAILABLE',
        notes: null,
        otherDeductions: 0,
        previousLeftover: 0,
        salary,
        transportAllowance: 0,
        yearMonth,
    }
}

const august = sheet('2026-08', 2_800_000, [
    { amount: 900_000, category: 'FIXED', concept: 'Arriendo', dueDay: 1, isPaid: true },
    { accountId: 'cash', amount: 200_000, category: 'FIXED', concept: 'Transporte', dueDay: 5, isPaid: true },
    { amount: 450_000, category: 'POCKET', concept: 'Mercado' },
    { amount: 250_000, category: 'SAVINGS', concept: 'Ahorro del mes', dueDay: 2, isPaid: true },
    { amount: 300_000, category: 'DEBT', concept: 'Cuota de ejemplo', debtId: debt.id, dueDay: 15, isPaid: true },
])

const september = sheet('2026-09', 2_900_000, [
    { amount: 900_000, category: 'FIXED', concept: 'Arriendo', dueDay: 1, isPaid: true },
    { accountId: 'cash', amount: 200_000, category: 'FIXED', concept: 'Transporte', dueDay: 5, isPaid: true },
    { amount: 450_000, category: 'POCKET', concept: 'Mercado' },
    { amount: 300_000, category: 'SAVINGS', concept: 'Ahorro del mes', dueDay: 2, isPaid: true },
    { amount: 300_000, category: 'DEBT', concept: 'Cuota de ejemplo', debtId: debt.id, dueDay: 15, isPaid: true },
    { amount: 50_000, category: 'SUBSCRIPTION', concept: 'Suscripción de ejemplo', dueDay: 20, isPaid: true },
])

const october = sheet('2026-10', 3_000_000, [
    { amount: 900_000, category: 'FIXED', concept: 'Arriendo', dueDay: 1, isPaid: true },
    { accountId: 'cash', amount: 200_000, category: 'FIXED', concept: 'Transporte', dueDay: 5, isPaid: true },
    {
        amount: 500_000,
        category: 'POCKET',
        concept: 'Mercado',
        spends: [
            { amount: 120_000, id: 'spend-1', note: null, spentOn: '2026-10-04' },
            { amount: 60_000, id: 'spend-2', note: null, spentOn: '2026-10-11' },
        ],
    },
    { amount: 300_000, category: 'SAVINGS', concept: 'Ahorro del mes', dueDay: 2, isPaid: true },
    { amount: 300_000, category: 'DEBT', concept: 'Cuota de ejemplo', debtId: debt.id, dueDay: 15 },
    { amount: 50_000, category: 'SUBSCRIPTION', concept: 'Suscripción de ejemplo', dueDay: 20 },
])

export type LandingSampleRow = {
    accountName: string
    amount: number
    category: EntryCategory
    concept: string
    dueDay: number | null
    isPaid: boolean
    /** Consumido dentro del bolsillo; null en las filas que no son bolsillo. */
    pocketSpent: number | null
}

function buildLandingSample() {
    const summary = computeMonthSheet(october, settings, accounts)
    const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
    const pocketEntry = october.entries.find((entry) => entry.category === 'POCKET')

    if (!pocketEntry) {
        throw new Error('La muestra de la landing necesita un bolsillo.')
    }

    const pocket = pocketProgress(pocketEntry)
    const plan = computeDebtPlan({
        available: summary.available,
        cashFlowTight: !summary.meetsCushion || summary.isOverspent,
        cushion: summary.cushion,
        debts: [debt],
        entries: october.entries,
        redirectOverpayments: settings.redirectDebtOverpayments,
        strategy: settings.debtStrategy,
    })
    const debtRow = plan.rows[0]
    const year = summarizeYear(computeSummaryRows([august, september, october], settings, accounts), SAMPLE_YEAR)

    return {
        debt: {
            availableAfterRecommended: plan.availableAfterRecommended,
            balance: debtRow.debt.totalBalance,
            base: debtRow.base,
            effectiveAnnualRate: debtRow.effectiveAnnualRate,
            extra: debtRow.extra,
            minimumPayment: debtRow.myMinimum,
            monthlyRate: debtRow.debt.monthlyRate,
            monthsRemaining: debtRow.monthsRemaining,
            name: debtRow.debt.name,
            recommended: debtRow.recommended,
            strategy: plan.strategy,
        },
        month: {
            available: summary.available,
            // Totales por cuenta de dinero; sin filas sin cuenta en la muestra.
            byAccount: summary.byAccount.filter((account) => account.id !== null).map(({ name, total }) => ({ name, total })),
            cushion: summary.cushion,
            meetsCushion: summary.meetsCushion,
            netIncome: summary.netIncome,
            rows: october.entries.map(
                (entry): LandingSampleRow => ({
                    accountName: accountNames.get(entry.accountId ?? '') ?? '',
                    amount: entry.amount ?? 0,
                    category: entry.category,
                    concept: entry.concept,
                    dueDay: entry.dueDay,
                    isPaid: entry.isPaid,
                    pocketSpent: entry.category === 'POCKET' ? pocketProgress(entry).spent : null,
                }),
            ),
            savings: summary.savings,
            surplus: summary.surplus,
            totalExpenses: summary.totalExpenses,
            yearMonth: october.yearMonth,
        },
        pocket: {
            budget: pocket.budget,
            concept: pocket.concept,
            remaining: pocket.remaining,
            share: pocket.share,
            spends: pocketEntry.spends.map((spend) => ({ amount: spend.amount, label: longDayLabel(spend.spentOn) })),
            spent: pocket.spent,
        },
        year: {
            monthCount: year.rows.length,
            monthsMeetingCushion: year.monthsMeetingCushion,
            netIncome: year.netIncome,
            rows: year.rows,
            savings: year.savings,
            totalExpenses: year.totalExpenses,
        },
    }
}

export type LandingSample = ReturnType<typeof buildLandingSample>

export const landingSample: LandingSample = buildLandingSample()
