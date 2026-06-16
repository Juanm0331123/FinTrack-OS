import { publicEnv } from '@/shared/config/env'
import type {
    AuthenticatedResponse,
    AuthErrorPayload,
    AuthSuccessPayload,
    PendingVerificationResponse,
    PasswordResetCodeVerificationResponse,
    PasswordResetRequestResponse,
    PasswordResetResponse,
} from './auth.types'

type RequestOptions = {
    accessToken?: string
    body?: Record<string, unknown>
    method?: 'GET' | 'POST'
}

export class AuthApiError extends Error {
    readonly code?: string
    readonly details?: Record<string, unknown>
    readonly errors?: Array<{ field: string; message: string }>
    readonly status: number

    constructor(status: number, payload: AuthErrorPayload) {
        super(payload.message)
        this.code = payload.code
        this.details = payload.details
        this.errors = payload.errors
        this.name = 'AuthApiError'
        this.status = status
    }
}

async function request<T>(path: string, options: RequestOptions = {}) {
    const response = await fetch(`${publicEnv.backendUrl}${path}`, {
        method: options.method ?? 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.accessToken
                ? {
                      Authorization: `Bearer ${options.accessToken}`,
                  }
                : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const payload = (await response.json()) as
        | AuthSuccessPayload<T>
        | AuthErrorPayload

    if (!response.ok || !payload.success) {
        throw new AuthApiError(response.status, payload as AuthErrorPayload)
    }

    return payload.data
}

export function registerWithEmail(input: {
    email: string
    firstName: string
    lastName?: string
    password: string
}) {
    return request<PendingVerificationResponse>('/api/auth/register', {
        body: input,
    })
}

export function loginWithEmail(input: { email: string; password: string }) {
    return request<AuthenticatedResponse>('/api/auth/login', {
        body: input,
    })
}

export function verifyEmailCode(input: { code: string; email: string }) {
    return request<AuthenticatedResponse>('/api/auth/verify-email-code', {
        body: input,
    })
}

export function resendEmailCode(input: { email: string }) {
    return request<PendingVerificationResponse>('/api/auth/resend-email-code', {
        body: input,
    })
}

export function requestPasswordReset(input: { email: string }) {
    return request<PasswordResetRequestResponse>('/api/auth/forgot-password/request', {
        body: input,
    })
}

export function verifyPasswordResetCode(input: { code: string; email: string }) {
    return request<PasswordResetCodeVerificationResponse>(
        '/api/auth/forgot-password/verify-code',
        {
            body: input,
        },
    )
}

export function resetPassword(input: {
    email: string
    password: string
    resetToken: string
}) {
    return request<PasswordResetResponse>('/api/auth/forgot-password/reset', {
        body: input,
    })
}

export function logoutSession(accessToken?: string) {
    return request<{ loggedOut: true }>('/api/auth/logout', {
        accessToken,
        body: {},
    })
}
