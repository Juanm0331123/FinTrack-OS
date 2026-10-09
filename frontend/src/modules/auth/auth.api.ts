import { publicEnv } from '@/shared/config/env'
import type {
    AuthenticatedResponse,
    AuthErrorPayload,
    AuthSuccessPayload,
    AuthUser,
    EmailChangeRequestResponse,
    PendingVerificationResponse,
    PasswordResetCodeVerificationResponse,
    PasswordResetRequestResponse,
    PasswordResetResponse,
} from './auth.types'

const REQUEST_TIMEOUT_MS = 15_000

type RequestOptions = {
    accessToken?: string
    body?: Record<string, unknown>
    method?: 'GET' | 'POST'
}

export class AuthApiError extends Error {
    readonly code?: string
    readonly details?: Record<string, unknown>
    readonly errors?: Array<{ field: string; message: string }>
    readonly retryAfterSeconds?: number
    readonly status: number

    constructor(status: number, payload: AuthErrorPayload, retryAfterSeconds?: number) {
        super(payload.message)
        this.code = payload.code
        this.details = payload.details
        this.errors = payload.errors
        this.name = 'AuthApiError'
        this.retryAfterSeconds = retryAfterSeconds
        this.status = status
    }
}

function fallbackMessage(status: number) {
    if (status === 429) {
        return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
    }

    return status >= 500
        ? 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.'
        : 'No pudimos completar la solicitud. Intenta de nuevo.'
}

async function request<T>(path: string, options: RequestOptions = {}) {
    let response: Response

    try {
        response = await fetch(`${publicEnv.backendUrl}${path}`, {
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
            },
            method: options.method ?? 'POST',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
    } catch {
        throw new AuthApiError(0, {
            message: 'No pudimos conectar con el servidor. Revisa tu conexión.',
            success: false,
        })
    }

    const payload = (await response.json().catch(() => null)) as AuthSuccessPayload<T> | AuthErrorPayload | null
    const retryAfter = Number(response.headers.get('retry-after'))

    if (!response.ok || !payload?.success) {
        throw new AuthApiError(
            response.status,
            payload && !payload.success ? payload : { message: fallbackMessage(response.status), success: false },
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        )
    }

    return payload.data
}

export function registerWithEmail(input: { email: string; firstName: string; lastName?: string; password: string }) {
    return request<PendingVerificationResponse>('/api/auth/register', { body: input })
}

export function loginWithEmail(input: { email: string; password: string }) {
    return request<AuthenticatedResponse>('/api/auth/login', { body: input })
}

// El refresh token viaja solo en la cookie HttpOnly; el cuerpo no lo lleva.
export function refreshSession() {
    return request<AuthenticatedResponse>('/api/auth/refresh', { body: {} })
}

export function verifyEmailCode(input: { code: string; email: string }) {
    return request<AuthenticatedResponse>('/api/auth/verify-email-code', { body: input })
}

export function resendEmailCode(input: { email: string }) {
    return request<PendingVerificationResponse>('/api/auth/resend-email-code', { body: input })
}

export function requestPasswordReset(input: { email: string }) {
    return request<PasswordResetRequestResponse>('/api/auth/forgot-password/request', { body: input })
}

export function verifyPasswordResetCode(input: { code: string; email: string }) {
    return request<PasswordResetCodeVerificationResponse>('/api/auth/forgot-password/verify-code', { body: input })
}

export function resetPassword(input: { email: string; password: string; resetToken: string }) {
    return request<PasswordResetResponse>('/api/auth/forgot-password/reset', { body: input })
}

export function logoutSession(accessToken?: string) {
    return request<{ loggedOut: true }>('/api/auth/logout', { accessToken, body: {} })
}

export function changePassword(accessToken: string, input: { currentPassword: string; newPassword: string }) {
    return request<{ otherSessionsClosed: true; passwordChanged: true }>('/api/auth/password', { accessToken, body: input })
}

export function requestEmailChange(accessToken: string, input: { currentPassword: string; newEmail: string }) {
    return request<EmailChangeRequestResponse>('/api/auth/email-change', { accessToken, body: input })
}

export function confirmEmailChange(accessToken: string, input: { code: string }) {
    return request<{ otherSessionsClosed: true; user: AuthUser }>('/api/auth/email-change/confirm', {
        accessToken,
        body: input,
    })
}
