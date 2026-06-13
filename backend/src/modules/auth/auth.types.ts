import type { OAuthProvider, Prisma, UserRole } from '@prisma/client'
import { publicUserSelect } from '../users/users.types.ts'

export const authCredentialsUserSelect = {
    ...publicUserSelect,
    deletedAt: true,
    passwordHash: true,
} satisfies Prisma.UserSelect

export const authStatusUserSelect = {
    ...publicUserSelect,
    deletedAt: true,
} satisfies Prisma.UserSelect

export type AuthCredentialsUser = Prisma.UserGetPayload<{
    select: typeof authCredentialsUserSelect
}>

export type AuthStatusUser = Prisma.UserGetPayload<{
    select: typeof authStatusUserSelect
}>

export type AccessTokenClaims = {
    role: UserRole
    tokenType: 'access'
}

export type RefreshTokenClaims = AccessTokenClaims & {
    sessionId: string
    tokenType: 'refresh'
}

export type SessionContext = {
    deviceName?: string | null
    ipAddress?: string | null
    userAgent?: string | null
}

export type TokenPair = {
    accessToken: string
    accessTokenExpiresInSeconds: number
    refreshToken: string
    refreshTokenExpiresAt: Date
    refreshTokenMaxAgeMs: number
    sessionId: string
}

export type NormalizedOAuthProfile = {
    avatarUrl?: string | null
    displayName?: string | null
    email: string
    emailVerified: boolean
    firstName: string
    lastName: string | null
    provider: OAuthProvider
    providerAccountId: string
}
