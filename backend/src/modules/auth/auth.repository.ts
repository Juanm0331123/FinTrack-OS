import { AuthTokenType, Prisma, SessionRevokeReason, UserStatus } from '@prisma/client'
import { prisma, withTransaction, type TransactionClient } from '../../config/prisma.ts'
import { publicUserSelect } from '../users/users.types.ts'
import {
    authCredentialsUserSelect,
    type AuthCredentialsUser,
    type NormalizedOAuthProfile,
    type SessionContext,
} from './auth.types.ts'

type NewRefreshToken = {
    expiresAt: Date
    tokenHash: string
    tokenId: string
}

type NewCodeToken = {
    expiresAt: Date
    tokenHash: string
    tokenSalt: string
    userId: string
}

export type RotationOutcome =
    | { status: 'rotated' }
    | { status: 'already-used'; usedAt: Date | null }
    | { status: 'session-invalid' }

const activeCodeTokenSelect = {
    attempts: true,
    expiresAt: true,
    id: true,
    targetEmail: true,
    tokenHash: true,
    tokenSalt: true,
    userId: true,
} satisfies Prisma.AuthTokenSelect

function contextFields(context: SessionContext) {
    return {
        deviceName: context.deviceName?.slice(0, 150) ?? null,
        ipAddress: context.ipAddress?.slice(0, 100) ?? null,
        userAgent: context.userAgent?.slice(0, 500) ?? null,
    }
}

async function revokeOpenTokens(transaction: TransactionClient, userId: string, type: AuthTokenType, now: Date) {
    await transaction.authToken.updateMany({
        data: { revokedAt: now },
        where: { revokedAt: null, type, usedAt: null, userId },
    })
}

async function revokeSessions(
    transaction: TransactionClient,
    where: Prisma.AuthSessionWhereInput,
    reason: SessionRevokeReason,
    now: Date,
) {
    return transaction.authSession.updateMany({
        data: { revokedAt: now, revokeReason: reason },
        where: { ...where, revokedAt: null },
    })
}

// Consume un token de un solo uso dentro de la transacción. La condición `usedAt/revokedAt
// null` en el UPDATE garantiza que, ante peticiones concurrentes, solo una obtiene count = 1.
async function consumeCodeToken(transaction: TransactionClient, tokenId: string, now: Date) {
    const result = await transaction.authToken.updateMany({
        data: { usedAt: now },
        where: { expiresAt: { gt: now }, id: tokenId, revokedAt: null, usedAt: null },
    })

    return result.count === 1
}

export class AuthRepository {
    findActiveSessionUser(sessionId: string, userId: string, now: Date) {
        return prisma.authSession.findFirst({
            select: { user: { select: publicUserSelect } },
            where: {
                absoluteExpiresAt: { gt: now },
                id: sessionId,
                idleExpiresAt: { gt: now },
                revokedAt: null,
                user: { deletedAt: null, status: UserStatus.ACTIVE },
                userId,
            },
        })
    }

    findActiveUserById(userId: string) {
        return prisma.user.findFirst({
            select: publicUserSelect,
            where: { deletedAt: null, id: userId, status: UserStatus.ACTIVE },
        })
    }

    findUserByEmailForAuth(email: string): Promise<AuthCredentialsUser | null> {
        return prisma.user.findFirst({
            select: authCredentialsUserSelect,
            where: { deletedAt: null, email },
        })
    }

    findUserByIdForAuth(userId: string): Promise<AuthCredentialsUser | null> {
        return prisma.user.findFirst({
            select: authCredentialsUserSelect,
            where: { deletedAt: null, id: userId },
        })
    }

    emailBelongsToAnotherUser(email: string, userId: string) {
        return prisma.user
            .count({ where: { email, id: { not: userId } } })
            .then((count) => count > 0)
    }

    // Crea la cuenta pendiente y su primer código en una transacción. Devuelve null si otra
    // petición creó el mismo correo en paralelo (violación única), para que el servicio decida.
    async createPendingUser(userData: Prisma.UserCreateInput, code: Omit<NewCodeToken, 'userId'>) {
        try {
            return await withTransaction(async (transaction) => {
                const user = await transaction.user.create({ data: userData, select: publicUserSelect })

                await transaction.authToken.create({
                    data: {
                        expiresAt: code.expiresAt,
                        tokenHash: code.tokenHash,
                        tokenSalt: code.tokenSalt,
                        type: AuthTokenType.EMAIL_VERIFICATION,
                        userId: user.id,
                    },
                })

                return user
            })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return null
            }

            throw error
        }
    }

    // Reemplaza credenciales y perfil de una cuenta que nunca se verificó. Solo actúa si sigue
    // pendiente, para no tocar una cuenta activada en paralelo.
    async updatePendingUser(userId: string, userData: Prisma.UserUpdateInput) {
        const result = await prisma.user.updateMany({
            data: userData as Prisma.UserUpdateManyMutationInput,
            where: { id: userId, status: UserStatus.PENDING_VERIFICATION },
        })

        if (result.count !== 1) {
            return null
        }

        return prisma.user.findUnique({ select: publicUserSelect, where: { id: userId } })
    }

    issueCodeToken(type: AuthTokenType, token: NewCodeToken & { targetEmail?: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            await revokeOpenTokens(transaction, token.userId, type, now)

            return transaction.authToken.create({
                data: {
                    expiresAt: token.expiresAt,
                    targetEmail: token.targetEmail ?? null,
                    tokenHash: token.tokenHash,
                    tokenSalt: token.tokenSalt,
                    type,
                    userId: token.userId,
                },
                select: { expiresAt: true, id: true },
            })
        })
    }

    findLatestOpenCodeToken(userId: string, type: AuthTokenType) {
        return prisma.authToken.findFirst({
            orderBy: { createdAt: 'desc' },
            select: activeCodeTokenSelect,
            where: { revokedAt: null, tokenSalt: { not: null }, type, usedAt: null, userId },
        })
    }

    findLatestOpenResetSession(userId: string) {
        return prisma.authToken.findFirst({
            orderBy: { createdAt: 'desc' },
            select: activeCodeTokenSelect,
            where: { revokedAt: null, tokenSalt: null, type: AuthTokenType.PASSWORD_RESET, usedAt: null, userId },
        })
    }

    // Registra un intento fallido; al llegar al máximo el código queda revocado.
    async registerFailedCodeAttempt(tokenId: string, maxAttempts: number) {
        await prisma.$executeRaw`UPDATE "auth_tokens"
            SET "attempts" = "attempts" + 1,
                "revoked_at" = CASE WHEN "attempts" + 1 >= ${maxAttempts} THEN (now() AT TIME ZONE 'UTC') ELSE "revoked_at" END
            WHERE "id" = ${tokenId}::uuid AND "used_at" IS NULL AND "revoked_at" IS NULL`
    }

    activateWithVerificationCode(tokenId: string, userId: string) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            if (!(await consumeCodeToken(transaction, tokenId, now))) {
                return null
            }

            const activated = await transaction.user.updateMany({
                data: { status: UserStatus.ACTIVE },
                where: { deletedAt: null, id: userId, status: UserStatus.PENDING_VERIFICATION },
            })

            if (activated.count !== 1) {
                throw new TransactionAborted()
            }

            return transaction.user.findUniqueOrThrow({ select: publicUserSelect, where: { id: userId } })
        }).catch((error: unknown) => {
            if (error instanceof TransactionAborted) {
                return null
            }

            throw error
        })
    }

    exchangeResetCodeForSession(input: { codeTokenId: string; resetToken: Omit<NewCodeToken, 'tokenSalt'> }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            if (!(await consumeCodeToken(transaction, input.codeTokenId, now))) {
                return false
            }

            await revokeOpenTokens(transaction, input.resetToken.userId, AuthTokenType.PASSWORD_RESET, now)
            await transaction.authToken.create({
                data: {
                    expiresAt: input.resetToken.expiresAt,
                    tokenHash: input.resetToken.tokenHash,
                    type: AuthTokenType.PASSWORD_RESET,
                    userId: input.resetToken.userId,
                },
            })

            return true
        })
    }

    resetPasswordWithSession(input: { passwordHash: string; resetTokenId: string; userId: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            if (!(await consumeCodeToken(transaction, input.resetTokenId, now))) {
                return false
            }

            await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
            await revokeSessions(transaction, { userId: input.userId }, SessionRevokeReason.PASSWORD_RESET, now)
            await transaction.user.update({ data: { passwordHash: input.passwordHash }, where: { id: input.userId } })

            return true
        })
    }

    changePassword(input: { currentSessionId: string; passwordHash: string; userId: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            await transaction.user.update({ data: { passwordHash: input.passwordHash }, where: { id: input.userId } })
            await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
            await revokeSessions(
                transaction,
                { id: { not: input.currentSessionId }, userId: input.userId },
                SessionRevokeReason.PASSWORD_CHANGE,
                now,
            )
        })
    }

    confirmEmailChange(input: { currentSessionId: string; targetEmail: string; tokenId: string; userId: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            if (!(await consumeCodeToken(transaction, input.tokenId, now))) {
                return null
            }

            const user = await transaction.user.update({
                data: { email: input.targetEmail },
                select: publicUserSelect,
                where: { id: input.userId },
            })

            await revokeSessions(
                transaction,
                { id: { not: input.currentSessionId }, userId: input.userId },
                SessionRevokeReason.EMAIL_CHANGE,
                now,
            )

            return user
        })
    }

    createSession(input: {
        absoluteExpiresAt: Date
        context: SessionContext
        idleExpiresAt: Date
        refreshToken: NewRefreshToken
        retentionCutoff: Date
        sessionId: string
        userId: string
    }) {
        return withTransaction(async (transaction) => {
            await transaction.authSession.create({
                data: {
                    ...contextFields(input.context),
                    absoluteExpiresAt: input.absoluteExpiresAt,
                    id: input.sessionId,
                    idleExpiresAt: input.idleExpiresAt,
                    userId: input.userId,
                },
            })
            await transaction.refreshToken.create({
                data: {
                    expiresAt: input.refreshToken.expiresAt,
                    id: input.refreshToken.tokenId,
                    sessionId: input.sessionId,
                    tokenHash: input.refreshToken.tokenHash,
                    userId: input.userId,
                },
            })
            // Retención: las sesiones de este usuario vencidas o revocadas hace tiempo se eliminan
            // (sus refresh tokens caen en cascada). El resto lo limpia scripts/cleanup-auth.ts.
            await transaction.authSession.deleteMany({
                where: {
                    OR: [
                        { absoluteExpiresAt: { lt: input.retentionCutoff } },
                        { idleExpiresAt: { lt: input.retentionCutoff } },
                        { revokedAt: { lt: input.retentionCutoff } },
                    ],
                    userId: input.userId,
                },
            })
        })
    }

    findRefreshToken(tokenId: string) {
        return prisma.refreshToken.findUnique({
            select: {
                expiresAt: true,
                id: true,
                revokedAt: true,
                session: {
                    select: {
                        absoluteExpiresAt: true,
                        id: true,
                        idleExpiresAt: true,
                        revokedAt: true,
                        user: { select: { ...publicUserSelect, deletedAt: true } },
                        userId: true,
                    },
                },
                tokenHash: true,
                usedAt: true,
            },
            where: { id: tokenId },
        })
    }

    // Rotación atómica: marca el token como usado solo si nadie lo usó antes y emite el sucesor
    // en la misma sesión. Si la sesión dejó de ser válida, la transacción se revierte completa.
    rotateRefreshToken(input: {
        context: SessionContext
        currentTokenId: string
        idleExpiresAt: Date
        next: NewRefreshToken
        now: Date
        sessionId: string
        userId: string
    }) {
        return withTransaction<RotationOutcome>(async (transaction) => {
            const consumed = await transaction.refreshToken.updateMany({
                data: { usedAt: input.now },
                where: {
                    expiresAt: { gt: input.now },
                    id: input.currentTokenId,
                    revokedAt: null,
                    sessionId: input.sessionId,
                    usedAt: null,
                },
            })

            if (consumed.count !== 1) {
                const current = await transaction.refreshToken.findUnique({
                    select: { usedAt: true },
                    where: { id: input.currentTokenId },
                })

                return { status: 'already-used', usedAt: current?.usedAt ?? null }
            }

            const session = await transaction.authSession.updateMany({
                data: {
                    ...contextFields(input.context),
                    idleExpiresAt: input.idleExpiresAt,
                    lastUsedAt: input.now,
                },
                where: {
                    absoluteExpiresAt: { gt: input.now },
                    id: input.sessionId,
                    idleExpiresAt: { gt: input.now },
                    revokedAt: null,
                    user: { deletedAt: null, status: UserStatus.ACTIVE },
                    userId: input.userId,
                },
            })

            if (session.count !== 1) {
                throw new TransactionAborted()
            }

            await transaction.refreshToken.create({
                data: {
                    expiresAt: input.next.expiresAt,
                    id: input.next.tokenId,
                    sessionId: input.sessionId,
                    tokenHash: input.next.tokenHash,
                    userId: input.userId,
                },
            })

            return { status: 'rotated' }
        }).catch((error: unknown) => {
            if (error instanceof TransactionAborted) {
                return { status: 'session-invalid' } as const
            }

            throw error
        })
    }

    revokeSession(sessionId: string, reason: SessionRevokeReason) {
        return prisma.authSession.updateMany({
            data: { revokedAt: new Date(), revokeReason: reason },
            where: { id: sessionId, revokedAt: null },
        })
    }

    revokeUserSession(sessionId: string, userId: string, reason: SessionRevokeReason) {
        return prisma.authSession.updateMany({
            data: { revokedAt: new Date(), revokeReason: reason },
            where: { id: sessionId, revokedAt: null, userId },
        })
    }

    revokeAllSessions(userId: string, reason: SessionRevokeReason) {
        return prisma.authSession.updateMany({
            data: { revokedAt: new Date(), revokeReason: reason },
            where: { revokedAt: null, userId },
        })
    }

    touchLastLogin(userId: string) {
        return prisma.user.update({ data: { lastLoginAt: new Date() }, select: { id: true }, where: { id: userId } })
    }

    findOAuthAccount(provider: NormalizedOAuthProfile['provider'], providerAccountId: string) {
        return prisma.oAuthAccount.findUnique({
            select: { id: true, user: { select: authCredentialsUserSelect } },
            where: { provider_providerAccountId: { provider, providerAccountId } },
        })
    }

    updateOAuthAccountMetadata(oauthAccountId: string, profile: NormalizedOAuthProfile) {
        return prisma.oAuthAccount.update({
            data: { avatarUrl: profile.avatarUrl, displayName: profile.displayName, providerEmail: profile.email },
            select: { id: true },
            where: { id: oauthAccountId },
        })
    }

    // Vincula el proveedor a una cuenta existente. Si la cuenta nunca se verificó, la contraseña
    // y el perfil los eligió alguien que no demostró poseer el correo: se invalidan y se adoptan
    // los datos del proveedor, que sí lo verificó. Una cuenta activa conserva su contraseña.
    linkOAuthAccount(input: {
        expectedStatus: UserStatus
        profile: NormalizedOAuthProfile
        unusablePasswordHash: string
        userId: string
    }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            await transaction.oAuthAccount.create({
                data: {
                    avatarUrl: input.profile.avatarUrl,
                    displayName: input.profile.displayName,
                    provider: input.profile.provider,
                    providerAccountId: input.profile.providerAccountId,
                    providerEmail: input.profile.email,
                    userId: input.userId,
                },
            })

            if (input.expectedStatus === UserStatus.PENDING_VERIFICATION) {
                const reset = await transaction.user.updateMany({
                    data: {
                        firstName: input.profile.firstName,
                        lastName: input.profile.lastName,
                        passwordHash: input.unusablePasswordHash,
                    },
                    where: { id: input.userId, status: UserStatus.PENDING_VERIFICATION },
                })

                if (reset.count === 1) {
                    await revokeOpenTokens(transaction, input.userId, AuthTokenType.EMAIL_VERIFICATION, now)
                    await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
                    await revokeSessions(transaction, { userId: input.userId }, SessionRevokeReason.PASSWORD_RESET, now)
                }
            }

            return transaction.user.findUniqueOrThrow({ select: publicUserSelect, where: { id: input.userId } })
        })
    }

    createUserFromOAuth(profile: NormalizedOAuthProfile, unusablePasswordHash: string) {
        return withTransaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email: profile.email,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    passwordHash: unusablePasswordHash,
                    status: UserStatus.PENDING_VERIFICATION,
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

// Señal interna para revertir una transacción cuando una condición dejó de cumplirse.
class TransactionAborted extends Error {}
