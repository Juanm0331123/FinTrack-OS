export type AuthUser = {
    id: string
    firstName: string
    lastName: string | null
    email: string
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION'
    role: 'USER' | 'ADMIN'
    preferredCurrencyCode: string
    timezone: string
    lastLoginAt: string | null
    createdAt: string
    updatedAt: string
}

export type AuthSession = {
    accessToken: string
    accessTokenExpiresAt: string
    user: AuthUser
}

export type PendingVerificationSource =
    | 'login'
    | 'register'
    | 'google'
    | 'github'

export type PendingVerificationState = {
    email: string
    expiresAt: string
    source: PendingVerificationSource
    verificationCode?: string
}

export type AuthSuccessPayload<T> = {
    data: T
    success: true
}

export type AuthErrorPayload = {
    code?: string
    details?: Record<string, unknown>
    errors?: Array<{
        field: string
        message: string
    }>
    message: string
    success: false
}

export type AuthenticatedResponse = {
    accessToken: string
    accessTokenExpiresInSeconds: number
    user: AuthUser
}

export type PendingVerificationResponse = {
    email: string
    expiresAt: string
    requiresEmailVerification: true
    verificationCode?: string
}

export type PasswordResetRequestResponse = {
    accepted: true
    email: string
    expiresAt: string
}

export type PasswordResetCodeVerificationResponse = {
    email: string
    resetToken: string
    resetTokenExpiresAt: string
}

export type PasswordResetResponse = {
    passwordReset: true
}
