import { getBrowserSession } from '@/modules/auth/browser-session'
import { SessionChangedError, SessionUnavailableError, type SessionManager } from '@/modules/auth/session-manager'
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

const REQUEST_TIMEOUT_MS = 20_000

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

    if (status === 401) {
        return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    }

    if (status === 503 && payload?.message) {
        return payload.message
    }

    if (status >= 500 || !payload?.message) {
        return 'Algo falló en el servidor. Reintenta en un momento.'
    }

    return payload.message
}

type RequestOptions = {
    body?: unknown
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST'
    signal?: AbortSignal
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

export type FinanceApiDeps = {
    fetch?: typeof fetch
    session?: Pick<SessionManager, 'ensureAccessToken'>
    // Cuenta dueña de esta instancia: ninguna petición sale con la identidad de otra.
    userId: string
}

function abortError() {
    return new DOMException('La operación se canceló.', 'AbortError')
}

export function createFinanceApi(deps: FinanceApiDeps) {
    const session = deps.session ?? getBrowserSession()
    const send = deps.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))
    let lifetime = new AbortController()

    // Todas las peticiones obtienen el token del gestor de sesión compartido: una sola renovación
    // en curso por pestaña y coordinada entre pestañas. Un fallo temporal de renovación no borra
    // la sesión; se informa como error reintentable.
    async function accessToken(forceRefresh: boolean) {
        try {
            return await session.ensureAccessToken({ forceRefresh, userId: deps.userId })
        } catch (error) {
            if (error instanceof SessionUnavailableError) {
                throw new FinanceApiError(503, 'No pudimos renovar tu sesión ahora. Reintenta en unos segundos.', 'SESSION_UNAVAILABLE')
            }

            if (error instanceof SessionChangedError) {
                throw new FinanceApiError(401, error.message, 'SESSION_CHANGED')
            }

            throw error
        }
    }

    // El dueño (lifetime) se fija al iniciar la operación y se conserva en el reintento: si se
    // detuvo mientras esperábamos el token o la respuesta, la operación termina con AbortError y no
    // se envía nada más.
    async function request<T>(path: string, options: RequestOptions = {}, canRetry = true, owner = lifetime.signal): Promise<T> {
        const token = await accessToken(!canRetry)

        if (owner.aborted) {
            throw abortError()
        }

        if (!token) {
            throw new FinanceApiError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.', 'SESSION_MISSING')
        }

        let response: Response

        try {
            const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

            response = await send(`${publicEnv.backendUrl}/api/finance${path}`, {
                body: options.body === undefined ? undefined : JSON.stringify(options.body),
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
                },
                method: options.method ?? 'GET',
                signal: AbortSignal.any([owner, timeout, ...(options.signal ? [options.signal] : [])]),
            })
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error
            }

            throw new FinanceApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión.')
        }

        if (owner.aborted) {
            throw abortError()
        }

        if (response.status === 401 && canRetry) {
            return request<T>(path, options, false, owner)
        }

        const payload = (await response.json().catch(() => null)) as
            | (ErrorPayload & { data?: T; success?: boolean })
            | null

        if (!response.ok || !payload?.success) {
            throw new FinanceApiError(response.status, messageFor(response.status, payload), payload?.code)
        }

        return payload.data as T
    }

    return {
        // Cancela las peticiones en vuelo (al desmontar el libro o cambiar de cuenta).
        abortPending() {
            lifetime.abort()
            lifetime = new AbortController()
        },

        copyPreviousSheet: (yearMonth: string, operationId: string) =>
            request<MonthSheet>(`/sheets/${yearMonth}/copy-previous`, { body: { operationId }, method: 'POST' }),
        createAccount: (input: { id: string; name: string }) =>
            request<MoneyAccount>('/accounts', { body: input, method: 'POST' }),
        createDebt: (input: DebtInput & { id: string; name: string }) =>
            request<Debt>('/debts', { body: input, method: 'POST' }),
        createEntry: (yearMonth: string, input: EntryInput & { concept: string; id: string }) =>
            request<MonthEntry>(`/sheets/${yearMonth}/entries`, { body: input, method: 'POST' }),
        createSheet: (input: { copyFrom: 'NONE' | 'PREVIOUS'; operationId: string; yearMonth: string }) =>
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
}

export type FinanceApi = ReturnType<typeof createFinanceApi>
