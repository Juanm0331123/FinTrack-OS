import { refreshSession } from '@/modules/auth/auth.api'
import {
    isAuthSessionActive,
    loadAuthSession,
    saveAuthSession,
} from '@/modules/auth/auth.storage'
import { publicEnv } from '@/shared/config/env'
import type {
    Debt,
    EntryCategory,
    FinanceSettings,
    LeftoverDestination,
    MoneyAccount,
    MonthEntry,
    MonthSheet,
    MonthSheetFields,
    PocketSpend,
    Workbook,
} from '../domain/types'

type ErrorPayload = {
    code?: string
    errors?: Array<{ field: string; message: string }>
    message?: string
}

export class FinanceApiError extends Error {
    readonly code?: string
    readonly status: number

    constructor(status: number, message: string, code?: string) {
        super(message)
        this.code = code
        this.name = 'FinanceApiError'
        this.status = status
    }
}

function messageFor(status: number, payload: ErrorPayload | null) {
    const fieldMessage = payload?.errors?.[0]?.message

    if (fieldMessage) {
        return fieldMessage
    }

    if (status >= 500 || !payload?.message) {
        return 'Algo falló en el servidor. Reintenta en un momento.'
    }

    if (status === 401) {
        return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    }

    return payload.message
}

let refreshInFlight: Promise<string | null> | null = null

function refreshAccessToken() {
    refreshInFlight ??= refreshSession()
        .then((session) => {
            saveAuthSession(session)

            return session.accessToken
        })
        .catch(() => null)
        .finally(() => {
            refreshInFlight = null
        })

    return refreshInFlight
}

async function getAccessToken() {
    const session = loadAuthSession()

    if (session && isAuthSessionActive(session)) {
        return session.accessToken
    }

    return refreshAccessToken()
}

type RequestOptions = {
    body?: unknown
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST'
    signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}, canRetry = true): Promise<T> {
    const token = await getAccessToken()

    if (!token) {
        throw new FinanceApiError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.')
    }

    let response: Response

    try {
        response = await fetch(`${publicEnv.backendUrl}/api/finance${path}`, {
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            credentials: 'include',
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
            method: options.method ?? 'GET',
            signal: options.signal,
        })
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error
        }

        throw new FinanceApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión.')
    }

    if (response.status === 401 && canRetry) {
        const refreshed = await refreshAccessToken()

        if (refreshed) {
            return request<T>(path, options, false)
        }
    }

    const payload = (await response.json().catch(() => null)) as
        | (ErrorPayload & { data?: T; success?: boolean })
        | null

    if (!response.ok || !payload?.success) {
        throw new FinanceApiError(response.status, messageFor(response.status, payload), payload?.code)
    }

    return payload.data as T
}

export type EntryInput = {
    accountId?: string | null
    amount?: number | null
    category?: EntryCategory
    concept?: string
    debtId?: string | null
    dueDay?: number | null
    isPaid?: boolean
    note?: string | null
    sortOrder?: number
}

export type SheetFieldsInput = Partial<{
    benefitsOverride: number | null
    disabilityIncome: number | null
    leftoverDestination: LeftoverDestination
    notes: string | null
    otherDeductions: number
    previousLeftover: number
    salary: number
    transportAllowance: number
}>

export type SpendInput = Partial<Omit<PocketSpend, 'id'>>

export type DebtInput = Partial<Omit<Debt, 'id'>>

export type AccountInput = Partial<{ archived: boolean; name: string; sortOrder: number }>

export type DeleteAccountResult =
    | { account: MoneyAccount; result: 'archived' }
    | { id: string; result: 'deleted' }

export const financeApi = {
    copyPreviousSheet: (yearMonth: string) =>
        request<MonthSheet>(`/sheets/${yearMonth}/copy-previous`, { method: 'POST' }),
    createAccount: (input: { id: string; name: string }) =>
        request<MoneyAccount>('/accounts', { body: input, method: 'POST' }),
    createDebt: (input: DebtInput & { id: string; name: string }) =>
        request<Debt>('/debts', { body: input, method: 'POST' }),
    createEntry: (yearMonth: string, input: EntryInput & { concept: string; id: string }) =>
        request<MonthEntry>(`/sheets/${yearMonth}/entries`, { body: input, method: 'POST' }),
    createSheet: (input: { copyFrom: 'NONE' | 'PREVIOUS'; yearMonth: string }) =>
        request<MonthSheet>('/sheets', { body: input, method: 'POST' }),
    createSpend: (entryId: string, input: PocketSpend) =>
        request<PocketSpend>(`/entries/${entryId}/spends`, { body: input, method: 'POST' }),
    deleteAccount: (id: string) =>
        request<DeleteAccountResult>(`/accounts/${id}`, { method: 'DELETE' }),
    deleteDebt: (id: string) => request<{ deleted: true }>(`/debts/${id}`, { method: 'DELETE' }),
    deleteEntry: (id: string) => request<{ deleted: true }>(`/entries/${id}`, { method: 'DELETE' }),
    deleteSheet: (yearMonth: string) =>
        request<{ deleted: true }>(`/sheets/${yearMonth}`, { method: 'DELETE' }),
    deleteSpend: (id: string) => request<{ deleted: true }>(`/spends/${id}`, { method: 'DELETE' }),
    getWorkbook: (signal?: AbortSignal) => request<Workbook>('/workbook', { signal }),
    updateAccount: (id: string, input: AccountInput) =>
        request<MoneyAccount>(`/accounts/${id}`, { body: input, method: 'PATCH' }),
    updateDebt: (id: string, input: DebtInput) =>
        request<Debt>(`/debts/${id}`, { body: input, method: 'PATCH' }),
    updateEntry: (id: string, input: EntryInput) =>
        request<MonthEntry>(`/entries/${id}`, { body: input, method: 'PATCH' }),
    updateSettings: (input: Partial<FinanceSettings>) =>
        request<FinanceSettings>('/settings', { body: input, method: 'PATCH' }),
    updateSheet: (yearMonth: string, input: SheetFieldsInput) =>
        request<MonthSheetFields>(`/sheets/${yearMonth}`, { body: input, method: 'PATCH' }),
    updateSpend: (id: string, input: SpendInput) =>
        request<PocketSpend>(`/spends/${id}`, { body: input, method: 'PATCH' }),
}

export type FinanceApi = typeof financeApi
