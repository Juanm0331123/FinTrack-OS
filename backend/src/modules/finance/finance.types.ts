export const ENTRY_CATEGORIES = [
    'SUBSCRIPTION',
    'FIXED',
    'POCKET',
    'SAVINGS',
    'DEBT',
    'OTHER',
] as const

export const LEFTOVER_DESTINATIONS = ['AVAILABLE', 'SAVINGS'] as const

export const DEBT_STATUSES = ['ACTIVE', 'PAID'] as const

export const DEBT_STRATEGIES = ['AVALANCHE', 'HIGHEST_PAYMENT', 'LOWEST_PAYMENT', 'RECOMMENDED'] as const

export type EntryCategory = (typeof ENTRY_CATEGORIES)[number]

export type LeftoverDestination = (typeof LEFTOVER_DESTINATIONS)[number]

export type DebtStatus = (typeof DEBT_STATUSES)[number]

export type DebtStrategy = (typeof DEBT_STRATEGIES)[number]

export type DecimalLike = number | string | { toNumber(): number }

export type FinanceSettingsDto = {
    benefitsRate: number
    cushionAmount: number
    debtStrategy: DebtStrategy
    redirectDebtOverpayments: boolean
}

export type MoneyAccountDto = {
    archived: boolean
    id: string
    name: string
    sortOrder: number
}

export type PocketSpendDto = {
    amount: number
    id: string
    note: string | null
    spentOn: string
}

export type MonthEntryDto = {
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
    spends: PocketSpendDto[]
}

export type MonthSheetFieldsDto = {
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

export type MonthSheetDto = MonthSheetFieldsDto & {
    entries: MonthEntryDto[]
}

export type DebtDto = {
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

export type WorkbookDto = {
    accounts: MoneyAccountDto[]
    debts: DebtDto[]
    settings: FinanceSettingsDto
    sheets: MonthSheetDto[]
}

export type SettingsRecord = {
    benefitsRate: DecimalLike
    cushionAmount: DecimalLike
    debtStrategy: DebtStrategy
    redirectDebtOverpayments: boolean
}

export type AccountRecord = {
    archivedAt: Date | null
    id: string
    name: string
    sortOrder: number
}

export type SpendRecord = {
    amount: DecimalLike
    id: string
    note: string | null
    spentOn: Date
}

export type EntryRecord = {
    accountId: string | null
    amount: DecimalLike | null
    category: EntryCategory
    concept: string
    debtId: string | null
    dueDay: number | null
    id: string
    isPaid: boolean
    note: string | null
    sortOrder: number
    spends?: SpendRecord[]
}

export type SheetRecord = {
    benefitsOverride: DecimalLike | null
    disabilityIncome: DecimalLike | null
    id: string
    leftoverDestination: LeftoverDestination
    notes: string | null
    otherDeductions: DecimalLike
    previousLeftover: DecimalLike
    salary: DecimalLike
    transportAllowance: DecimalLike
    yearMonth: string
}

export type DebtRecord = {
    datesNote: string | null
    dueDay: number | null
    id: string
    insuranceRate: DecimalLike
    lender: string | null
    minimumPayment: DecimalLike
    monthlyRate: DecimalLike
    myMinimumOverride: DecimalLike | null
    name: string
    notes: string | null
    partnerContribution: DecimalLike
    paymentCap: DecimalLike | null
    sharedAmount: DecimalLike
    sharedPercent: DecimalLike | null
    sharedWith: string | null
    sortOrder: number
    status: DebtStatus
    totalBalance: DecimalLike
}
