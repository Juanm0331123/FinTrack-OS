import { AuthTokenType, OAuthProvider, UserStatus, type Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.ts'
import { publicUserSelect } from '../users/users.types.ts'
import {
    authCredentialsUserSelect,
    authStatusUserSelect,
    type AuthCredentialsUser,
    type NormalizedOAuthProfile,
    type SessionContext,
} from './auth.types.ts'

export class AuthRepository {
    findActiveUserById(userId: string) {
        return prisma.user.findFirst({
            where: {
                deletedAt: null,
                id: userId,
                status: UserStatus.ACTIVE,
            },
            select: publicUserSelect,
        })
    }

    findUserByEmailForAuth(email: string): Promise<AuthCredentialsUser | null> {
        return prisma.user.findFirst({
            where: {
                deletedAt: null,
                email,
            },
            select: authCredentialsUserSelect,
        })
    }

    createRegisteredUser(input: {
        tokenExpiresAt: Date
        tokenHash: string
        userData: Prisma.UserCreateInput
    }) {
        return prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: input.userData,
                select: publicUserSelect,
            })

            await transaction.authToken.create({
                data: {
                    expiresAt: input.tokenExpiresAt,
                    tokenHash: input.tokenHash,
                    type: AuthTokenType.EMAIL_VERIFICATION,
                    userId: user.id,
                },
            })

            return user
        })
    }

    findEmailVerificationToken(tokenHash: string) {
        return prisma.authToken.findFirst({
            where: {
                tokenHash,
                type: AuthTokenType.EMAIL_VERIFICATION,
            },
            select: {
                expiresAt: true,
                id: true,
                usedAt: true,
                user: {
                    select: authStatusUserSelect,
                },
                userId: true,
            },
        })
    }

    activateUserAndConsumeVerificationToken(tokenId: string, userId: string) {
        return prisma.$transaction(async (transaction) => {
            await transaction.authToken.update({
                where: {
                    id: tokenId,
                },
                data: {
                    usedAt: new Date(),
                },
            })

            return transaction.user.update({
                where: {
                    id: userId,
                },
                data: {
                    status: UserStatus.ACTIVE,
                },
                select: publicUserSelect,
            })
        })
    }

    createRefreshTokenSession(input: {
        expiresAt: Date
        sessionId: string
        tokenHash: string
        userId: string
    } & SessionContext) {
        return prisma.refreshToken.create({
            data: {
                deviceName: input.deviceName,
                expiresAt: input.expiresAt,
                id: input.sessionId,
                ipAddress: input.ipAddress,
                tokenHash: input.tokenHash,
                userAgent: input.userAgent,
                userId: input.userId,
            },
            select: {
                id: true,
            },
        })
    }

    findRefreshTokenByHash(tokenHash: string) {
        return prisma.refreshToken.findFirst({
            where: {
                tokenHash,
            },
            select: {
                createdAt: true,
                expiresAt: true,
                id: true,
                revokedAt: true,
                user: {
                    select: authStatusUserSelect,
                },
                userId: true,
            },
        })
    }

    rotateRefreshTokenSession(input: {
        currentTokenId: string
        newExpiresAt: Date
        newSessionId: string
        newTokenHash: string
        userId: string
    } & SessionContext) {
        return prisma.$transaction(async (transaction) => {
            await transaction.refreshToken.update({
                where: {
                    id: input.currentTokenId,
                },
                data: {
                    revokedAt: new Date(),
                },
            })

            return transaction.refreshToken.create({
                data: {
                    deviceName: input.deviceName,
                    expiresAt: input.newExpiresAt,
                    id: input.newSessionId,
                    ipAddress: input.ipAddress,
                    tokenHash: input.newTokenHash,
                    userAgent: input.userAgent,
                    userId: input.userId,
                },
                select: {
                    id: true,
                },
            })
        })
    }

    revokeRefreshTokenById(tokenId: string) {
        return prisma.refreshToken.updateMany({
            where: {
                id: tokenId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        })
    }

    revokeAllRefreshTokens(userId: string) {
        return prisma.refreshToken.updateMany({
            where: {
                revokedAt: null,
                userId,
            },
            data: {
                revokedAt: new Date(),
            },
        })
    }

    touchLastLogin(userId: string) {
        return prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                lastLoginAt: new Date(),
            },
            select: {
                id: true,
            },
        })
    }

    findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
        return prisma.oAuthAccount.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
            select: {
                id: true,
                user: {
                    select: authCredentialsUserSelect,
                },
            },
        })
    }

    updateOAuthAccountMetadata(
        oauthAccountId: string,
        profile: NormalizedOAuthProfile,
    ) {
        return prisma.oAuthAccount.update({
            where: {
                id: oauthAccountId,
            },
            data: {
                avatarUrl: profile.avatarUrl,
                displayName: profile.displayName,
                providerEmail: profile.email,
            },
            select: {
                id: true,
            },
        })
    }

    linkOAuthAccountToUser(userId: string, profile: NormalizedOAuthProfile) {
        return prisma.$transaction(async (transaction) => {
            await transaction.oAuthAccount.create({
                data: {
                    avatarUrl: profile.avatarUrl,
                    displayName: profile.displayName,
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                    providerEmail: profile.email,
                    userId,
                },
            })

            return transaction.user.update({
                where: {
                    id: userId,
                },
                data: {
                    status: UserStatus.ACTIVE,
                },
                select: publicUserSelect,
            })
        })
    }

    createUserFromOAuth(profile: NormalizedOAuthProfile, passwordHash: string) {
        return prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email: profile.email,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    passwordHash,
                    status: UserStatus.ACTIVE,
                    timezone: 'UTC',
                },
                select: publicUserSelect,
            })

            await transaction.oAuthAccount.create({
                data: {
                    avatarUrl: profile.avatarUrl,
                    displayName: profile.displayName,
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                    providerEmail: profile.email,
                    userId: user.id,
                },
            })

            return user
        })
    }
}
