import type { OAuthProvider, Prisma, UserRole } from '@prisma/client'
import { publicUserSelect, type PublicUser } from '../users/users.types.ts'

export const authCredentialsUserSelect = {
    ...publicUserSelect,
    deletedAt: true,
    passwordHash: true,
} satisfies Prisma.UserSelect

export type AuthCredentialsUser = Prisma.UserGetPayload<{
    select: typeof authCredentialsUserSelect
}>

export type AccessTokenClaims = {
    role: UserRole
    sessionId: string
    userId: string
}

export type RefreshTokenClaims = {
    sessionId: string
    tokenId: string
    userId: string
}

export type SessionContext = {
    deviceName?: string | null
    ipAddress?: string | null
    userAgent?: string | null
}

export type OAuthIntent = 'login' | 'register'

export type IssuedSession = {
    accessToken: string
    accessTokenExpiresInSeconds: number
    refreshToken: string
    refreshTokenMaxAgeMs: number
    sessionId: string
}

export type AuthenticatedSessionResult = IssuedSession & {
    user: PublicUser
}

export type PendingEmailVerificationResult = {
    email: string
    expiresAt: Date
    requiresEmailVerification: true
    verificationCode?: string
}

export type PasswordResetRequestAcceptedResult = {
    accepted: true
    email: string
    expiresAt: Date
    resetCode?: string
}

export type PasswordResetVerificationResult = {
    email: string
    resetToken: string
    resetTokenExpiresAt: Date
}

export type EmailChangeRequestedResult = {
    email: string
    expiresAt: Date
    verificationCode?: string
}

export type NormalizedOAuthProfile = {
    avatarUrl: string | null
    displayName: string | null
    email: string
    firstName: string
    lastName: string | null
    provider: OAuthProvider
    providerAccountId: string
}
