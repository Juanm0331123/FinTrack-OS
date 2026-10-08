import type {
    Debt,
    EntryCategory,
    FinanceSettings,
    MoneyAccount,
    MonthEntry,
    MonthSheet,
} from './types'

export const settings: FinanceSettings = {
    benefitsRate: 0.08,
    cushionAmount: 500_000,
    debtStrategy: 'AVALANCHE',
    redirectDebtOverpayments: false,
}

export const accounts: MoneyAccount[] = [
    { archived: false, id: 'wallet', name: 'Billetera', sortOrder: 0 },
    { archived: false, id: 'bank', name: 'Banco Uno', sortOrder: 1 },
    { archived: false, id: 'cash', name: 'Efectivo', sortOrder: 2 },
    { archived: true, id: 'old', name: 'Cuenta vieja', sortOrder: 3 },
]

let sequence = 0

export function entry(
    concept: string,
    amount: number | null,
    category: EntryCategory,
    overrides: Partial<MonthEntry> = {},
): MonthEntry {
    sequence += 1

    return {
        accountId: null,
        amount,
        category,
        concept,
        debtId: null,
        dueDay: null,
        id: `entry-${sequence}`,
        isPaid: false,
        note: null,
        sortOrder: sequence,
        spends: [],
        ...overrides,
    }
}

export function sampleSheet(overrides: Partial<MonthSheet> = {}): MonthSheet {
    return {
        benefitsOverride: null,
        disabilityIncome: null,
        entries: [
            entry('Streaming', 30_000, 'SUBSCRIPTION', { accountId: 'wallet', dueDay: 5, isPaid: true }),
            entry('Música', 15_000, 'SUBSCRIPTION', { accountId: 'wallet' }),
            entry('Celular', 50_000, 'FIXED', { accountId: 'bank', dueDay: 10 }),
            entry('Arriendo', 900_000, 'FIXED', { accountId: 'bank', dueDay: 1, isPaid: true }),
            entry('Mercado', 400_000, 'POCKET', { accountId: 'wallet', isPaid: true }),
            entry('Detergente', null, 'POCKET'),
            entry('Ahorro', 150_000, 'SAVINGS', { accountId: 'bank' }),
            entry('Tarjeta', 300_000, 'DEBT', { accountId: 'wallet', debtId: 'card', dueDay: 20 }),
            entry('Préstamo', 250_000, 'DEBT', { accountId: 'bank', debtId: 'loan', dueDay: 15 }),
            entry('Regalo', 60_000, 'OTHER'),
        ],
        id: 'sheet-2026-03',
        leftoverDestination: 'AVAILABLE',
        notes: null,
        otherDeductions: 20_000,
        previousLeftover: 100_000,
        salary: 2_500_000,
        transportAllowance: 200_000,
        yearMonth: '2026-03',
        ...overrides,
    }
}

export function debt(overrides: Partial<Debt> & Pick<Debt, 'id' | 'name'>): Debt {
    return {
        datesNote: null,
        dueDay: null,
        insuranceRate: 0,
        lender: null,
        minimumPayment: 0,
        monthlyRate: 0,
        myMinimumOverride: null,
        notes: null,
        partnerContribution: 0,
        paymentCap: null,
        sharedAmount: 0,
        sharedPercent: null,
        sharedWith: null,
        sortOrder: 0,
        status: 'ACTIVE',
        totalBalance: 0,
        ...overrides,
    }
}
