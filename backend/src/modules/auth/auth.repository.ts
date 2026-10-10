import { randomUUID } from 'node:crypto'
import { AuthTokenType, Prisma, SessionRevokeReason, UserStatus } from '@prisma/client'
import { prisma, withTransaction, type TransactionClient } from '../../config/prisma.ts'
import { CURRENT_PASSWORD_HASH_VERSION, publicUserSelect } from '../users/users.types.ts'
import {
    authCredentialsUserSelect,
    stampedUserSelect,
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
    requiresPassword?: boolean
    securityStamp: string
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
    requiresPassword: true,
    securityStamp: true,
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
// null` garantiza que, ante peticiones concurrentes, solo una obtiene count = 1; el sello exige
// que el token se haya emitido para las credenciales vigentes.
async function consumeCodeToken(transaction: TransactionClient, tokenId: string, now: Date, securityStamp: string) {
    const result = await transaction.authToken.updateMany({
        data: { usedAt: now },
        where: { expiresAt: { gt: now }, id: tokenId, revokedAt: null, securityStamp, usedAt: null },
    })

    return result.count === 1
}

type LockedUser = { deletedAt: Date | null; securityStamp: string; status: UserStatus }

// Bloquea la fila del usuario hasta el fin de la transacción: cualquier cambio de credenciales,
// estado o sello (que también actualiza esa fila) queda serializado con la operación en curso.
async function lockUser(transaction: TransactionClient, userId: string): Promise<LockedUser | null> {
    const rows = await transaction.$queryRaw<Array<{ deleted_at: Date | null; security_stamp: string; status: UserStatus }>>`
        SELECT "security_stamp"::text AS "security_stamp", "status"::text AS "status", "deleted_at"
        FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`

    return rows[0] ? { deletedAt: rows[0].deleted_at, securityStamp: rows[0].security_stamp, status: rows[0].status } : null
}

function stampMatches(user: LockedUser | null, securityStamp: string): user is LockedUser {
    return user !== null && user.securityStamp === securityStamp && !user.deletedAt
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
    async createPendingUser(
        userData: Prisma.UserCreateInput & { securityStamp: string },
        code: Omit<NewCodeToken, 'securityStamp' | 'userId'>,
    ) {
        try {
            return await withTransaction(async (transaction) => {
                const user = await transaction.user.create({ data: userData, select: stampedUserSelect })

                await transaction.authToken.create({
                    data: {
                        expiresAt: code.expiresAt,
                        requiresPassword: code.requiresPassword ?? true,
                        securityStamp: userData.securityStamp,
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
    // pendiente. El sello nuevo invalida todo código emitido para las credenciales anteriores.
    async updatePendingUser(userId: string, userData: Prisma.UserUpdateManyMutationInput) {
        const result = await prisma.user.updateMany({
            data: { ...userData, securityStamp: randomUUID() },
            where: { id: userId, status: UserStatus.PENDING_VERIFICATION },
        })

        if (result.count !== 1) {
            return null
        }

        return prisma.user.findUnique({ select: stampedUserSelect, where: { id: userId } })
    }

    issueCodeToken(type: AuthTokenType, token: NewCodeToken & { targetEmail?: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()

            await revokeOpenTokens(transaction, token.userId, type, now)

            return transaction.authToken.create({
                data: {
                    expiresAt: token.expiresAt,
                    requiresPassword: token.requiresPassword ?? false,
                    securityStamp: token.securityStamp,
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

    // Último código emitido para las credenciales vigentes (mismo sello), aunque ya esté usado,
    // vencido o revocado: indica de dónde vienen esas credenciales (registro con contraseña u OAuth).
    findLatestCodeTokenForStamp(userId: string, type: AuthTokenType, securityStamp: string) {
        return prisma.authToken.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { requiresPassword: true },
            where: { securityStamp, tokenSalt: { not: null }, type, userId },
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

    // Activa solo si las credenciales siguen siendo las del código (mismo sello) bajo bloqueo:
    // un re-registro concurrente o posterior invalida el código anterior.
    activateWithVerificationCode(tokenId: string, userId: string, securityStamp: string) {
        return withTransaction(async (transaction) => {
            const now = new Date()
            const user = await lockUser(transaction, userId)

            if (!stampMatches(user, securityStamp) || user.status !== UserStatus.PENDING_VERIFICATION) {
                return null
            }

            if (!(await consumeCodeToken(transaction, tokenId, now, securityStamp))) {
                return null
            }

            const activated = await transaction.user.updateMany({
                data: { status: UserStatus.ACTIVE },
                where: { deletedAt: null, id: userId, securityStamp, status: UserStatus.PENDING_VERIFICATION },
            })

            if (activated.count !== 1) {
                throw new TransactionAborted()
            }

            return transaction.user.findUniqueOrThrow({ select: stampedUserSelect, where: { id: userId } })
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
            const user = await lockUser(transaction, input.resetToken.userId)

            if (!stampMatches(user, input.resetToken.securityStamp) || user.status === UserStatus.INACTIVE) {
                return false
            }

            if (!(await consumeCodeToken(transaction, input.codeTokenId, now, input.resetToken.securityStamp))) {
                return false
            }

            await revokeOpenTokens(transaction, input.resetToken.userId, AuthTokenType.PASSWORD_RESET, now)
            await transaction.authToken.create({
                data: {
                    expiresAt: input.resetToken.expiresAt,
                    securityStamp: input.resetToken.securityStamp,
                    tokenHash: input.resetToken.tokenHash,
                    type: AuthTokenType.PASSWORD_RESET,
                    userId: input.resetToken.userId,
                },
            })

            return true
        })
    }

    resetPasswordWithSession(input: { passwordHash: string; resetTokenId: string; securityStamp: string; userId: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()
            const user = await lockUser(transaction, input.userId)

            if (!stampMatches(user, input.securityStamp) || user.status === UserStatus.INACTIVE) {
                return false
            }

            if (!(await consumeCodeToken(transaction, input.resetTokenId, now, input.securityStamp))) {
                return false
            }

            await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
            await revokeSessions(transaction, { userId: input.userId }, SessionRevokeReason.PASSWORD_RESET, now)
            await transaction.user.update({
                data: {
                    passwordHash: input.passwordHash,
                    passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                    securityStamp: randomUUID(),
                },
                where: { id: input.userId },
            })

            return true
        })
    }

    // Escribe solo si nada cambió desde que se comprobó la contraseña actual: mismo sello, cuenta
    // activa y sesión actual abierta. Un cambio que validó la contraseña anterior no puede pisar
    // una recuperación, un logout-all ni otro cambio que terminaron entretanto.
    changePassword(input: { currentSessionId: string; passwordHash: string; securityStamp: string; userId: string }) {
        return withTransaction(async (transaction) => {
            const now = new Date()
            const user = await lockUser(transaction, input.userId)
            const session = await transaction.authSession.findFirst({
                select: { id: true },
                where: { id: input.currentSessionId, revokedAt: null, userId: input.userId },
            })

            if (!stampMatches(user, input.securityStamp) || user.status !== UserStatus.ACTIVE || !session) {
                return false
            }

            await transaction.user.update({
                data: {
                    passwordHash: input.passwordHash,
                    passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                    securityStamp: randomUUID(),
                },
                where: { id: input.userId },
            })
            await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
            await revokeSessions(
                transaction,
                { id: { not: input.currentSessionId }, userId: input.userId },
                SessionRevokeReason.PASSWORD_CHANGE,
                now,
            )

            return true
        })
    }

    confirmEmailChange(input: {
        currentSessionId: string
        securityStamp: string
        targetEmail: string
        tokenId: string
        userId: string
    }) {
        return withTransaction(async (transaction) => {
            const now = new Date()
            const locked = await lockUser(transaction, input.userId)

            if (!stampMatches(locked, input.securityStamp) || locked.status !== UserStatus.ACTIVE) {
                return null
            }

            if (!(await consumeCodeToken(transaction, input.tokenId, now, input.securityStamp))) {
                return null
            }

            const user = await transaction.user.update({
                data: { email: input.targetEmail, securityStamp: randomUUID() },
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

    // Abre la sesión solo si nada cambió desde que se comprobaron las credenciales: mismo sello,
    // cuenta activa y no borrada, bajo bloqueo de la fila. Un cambio de contraseña, recuperación,
    // desactivación o logout-all que terminó antes hace que devuelva false sin crear nada.
    createSession(input: {
        absoluteExpiresAt: Date
        context: SessionContext
        idleExpiresAt: Date
        refreshToken: NewRefreshToken
        retentionCutoff: Date
        securityStamp: string
        sessionId: string
        userId: string
    }) {
        return withTransaction(async (transaction) => {
            const user = await lockUser(transaction, input.userId)

            if (!stampMatches(user, input.securityStamp) || user.status !== UserStatus.ACTIVE) {
                return false
            }

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

            return true
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

    // Cierra todas las sesiones y cambia el sello en la misma transacción: un login que comprobó
    // la contraseña antes no puede abrir una sesión después.
    closeAllSessions(userId: string, reason: SessionRevokeReason) {
        return withTransaction(async (transaction) => {
            await transaction.user.update({ data: { securityStamp: randomUUID() }, where: { id: userId } })
            await revokeSessions(transaction, { userId }, reason, new Date())
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
                        passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                        securityStamp: randomUUID(),
                    },
                    where: { id: input.userId, status: UserStatus.PENDING_VERIFICATION },
                })

                if (reset.count === 1) {
                    await revokeOpenTokens(transaction, input.userId, AuthTokenType.EMAIL_VERIFICATION, now)
                    await revokeOpenTokens(transaction, input.userId, AuthTokenType.PASSWORD_RESET, now)
                    await revokeSessions(transaction, { userId: input.userId }, SessionRevokeReason.PASSWORD_RESET, now)
                }
            }

            return transaction.user.findUniqueOrThrow({ select: stampedUserSelect, where: { id: input.userId } })
        })
    }

    // OAuth demuestra que quien entra controla el correo. Si la cuenta sigue pendiente, ninguna
    // contraseña existente está autorizada (pudo fijarla un re-registro ajeno): se reemplaza por una
    // inutilizable, se rota el sello y se invalidan códigos y sesiones anteriores.
    resetPendingCredentialsForOAuth(userId: string, unusablePasswordHash: string) {
        return withTransaction(async (transaction) => {
            const now = new Date()
            const user = await lockUser(transaction, userId)

            if (user?.status === UserStatus.PENDING_VERIFICATION) {
                await transaction.user.update({
                    data: {
                        passwordHash: unusablePasswordHash,
                        passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                        securityStamp: randomUUID(),
                    },
                    where: { id: userId },
                })
                await revokeOpenTokens(transaction, userId, AuthTokenType.EMAIL_VERIFICATION, now)
                await revokeOpenTokens(transaction, userId, AuthTokenType.PASSWORD_RESET, now)
                await revokeSessions(transaction, { userId }, SessionRevokeReason.PASSWORD_RESET, now)
            }

            return transaction.user.findUniqueOrThrow({ select: stampedUserSelect, where: { id: userId } })
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
                    passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                    status: UserStatus.PENDING_VERIFICATION,
                    timezone: 'UTC',
                },
                select: stampedUserSelect,
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
