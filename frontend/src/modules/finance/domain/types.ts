export const ENTRY_CATEGORIES = [
    'SUBSCRIPTION',
    'FIXED',
    'POCKET',
    'SAVINGS',
    'DEBT',
    'OTHER',
] as const

export type EntryCategory = (typeof ENTRY_CATEGORIES)[number]

export type LeftoverDestination = 'AVAILABLE' | 'SAVINGS'

export type DebtStatus = 'ACTIVE' | 'PAID'

export const DEBT_STRATEGIES = ['AVALANCHE', 'HIGHEST_PAYMENT', 'LOWEST_PAYMENT', 'RECOMMENDED'] as const

export type DebtStrategy = (typeof DEBT_STRATEGIES)[number]

export type FinanceSettings = {
    benefitsRate: number
    cushionAmount: number
    debtStrategy: DebtStrategy
    redirectDebtOverpayments: boolean
}

export type MoneyAccount = {
    archived: boolean
    id: string
    name: string
    sortOrder: number
}

export type PocketSpend = {
    amount: number
    id: string
    note: string | null
    spentOn: string
}

export type MonthEntry = {
    accountId: string | null
    amount: number | null
    category: EntryCategory
    concept: string
    debtId: string | null
    dueDay: number | null
    id: string
    isPaid: boolean
    note: string | null
    sortOrder: number
    spends: PocketSpend[]
}

export type MonthSheetFields = {
    benefitsOverride: number | null
    disabilityIncome: number | null
    id: string
    leftoverDestination: LeftoverDestination
    notes: string | null
    otherDeductions: number
    previousLeftover: number
    salary: number
    transportAllowance: number
    yearMonth: string
}

export type MonthSheet = MonthSheetFields & {
    entries: MonthEntry[]
}

export type Debt = {
    datesNote: string | null
    dueDay: number | null
    id: string
    insuranceRate: number
    lender: string | null
    minimumPayment: number
    monthlyRate: number
    myMinimumOverride: number | null
    name: string
    notes: string | null
    partnerContribution: number
    paymentCap: number | null
    sharedAmount: number
    sharedPercent: number | null
    sharedWith: string | null
    sortOrder: number
    status: DebtStatus
    totalBalance: number
}

export type Workbook = {
    accounts: MoneyAccount[]
    debts: Debt[]
    settings: FinanceSettings
    sheets: MonthSheet[]
}
