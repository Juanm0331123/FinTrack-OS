import type {
    AccountRecord,
    DebtDto,
    DebtRecord,
    DecimalLike,
    EntryRecord,
    FinanceSettingsDto,
    MoneyAccountDto,
    MonthEntryDto,
    MonthSheetDto,
    MonthSheetFieldsDto,
    PocketSpendDto,
    SettingsRecord,
    SheetRecord,
    SpendRecord,
} from './finance.types.ts'

export function toNumber(value: DecimalLike) {
    if (typeof value === 'number') {
        return value
    }

    if (typeof value === 'string') {
        return Number(value)
    }

    return value.toNumber()
}

export function toNullableNumber(value: DecimalLike | null) {
    return value === null ? null : toNumber(value)
}

export function toSettingsDto(settings: SettingsRecord): FinanceSettingsDto {
    return {
        benefitsRate: toNumber(settings.benefitsRate),
        cushionAmount: toNumber(settings.cushionAmount),
        debtStrategy: settings.debtStrategy,
        redirectDebtOverpayments: settings.redirectDebtOverpayments,
    }
}

export function toAccountDto(account: AccountRecord): MoneyAccountDto {
    return {
        archived: account.archivedAt !== null,
        id: account.id,
        name: account.name,
        sortOrder: account.sortOrder,
    }
}

export function toSpendDto(spend: SpendRecord): PocketSpendDto {
    return {
        amount: toNumber(spend.amount),
        id: spend.id,
        note: spend.note,
        spentOn: spend.spentOn.toISOString().slice(0, 10),
    }
}

export function toEntryDto(entry: EntryRecord): MonthEntryDto {
    return {
        accountId: entry.accountId,
        amount: toNullableNumber(entry.amount),
        category: entry.category,
        concept: entry.concept,
        debtId: entry.debtId,
        dueDay: entry.dueDay,
        id: entry.id,
        isPaid: entry.isPaid,
        note: entry.note,
        sortOrder: entry.sortOrder,
        spends: (entry.spends ?? []).map(toSpendDto),
    }
}

export function toSheetFieldsDto(sheet: SheetRecord): MonthSheetFieldsDto {
    return {
        benefitsOverride: toNullableNumber(sheet.benefitsOverride),
        disabilityIncome: toNullableNumber(sheet.disabilityIncome),
        id: sheet.id,
        leftoverDestination: sheet.leftoverDestination,
        notes: sheet.notes,
        otherDeductions: toNumber(sheet.otherDeductions),
        previousLeftover: toNumber(sheet.previousLeftover),
        salary: toNumber(sheet.salary),
        transportAllowance: toNumber(sheet.transportAllowance),
        yearMonth: sheet.yearMonth,
    }
}

export function toSheetDto(sheet: SheetRecord & { entries: EntryRecord[] }): MonthSheetDto {
    return {
        ...toSheetFieldsDto(sheet),
        entries: sheet.entries.map(toEntryDto),
    }
}

export function toDebtDto(debt: DebtRecord): DebtDto {
    return {
        datesNote: debt.datesNote,
        dueDay: debt.dueDay,
        id: debt.id,
        insuranceRate: toNumber(debt.insuranceRate),
        lender: debt.lender,
        minimumPayment: toNumber(debt.minimumPayment),
        monthlyRate: toNumber(debt.monthlyRate),
        myMinimumOverride: toNullableNumber(debt.myMinimumOverride),
        name: debt.name,
        notes: debt.notes,
        partnerContribution: toNumber(debt.partnerContribution),
        paymentCap: toNullableNumber(debt.paymentCap),
        sharedAmount: toNumber(debt.sharedAmount),
        sharedPercent: toNullableNumber(debt.sharedPercent),
        sharedWith: debt.sharedWith,
        sortOrder: debt.sortOrder,
        status: debt.status,
        totalBalance: toNumber(debt.totalBalance),
    }
}
