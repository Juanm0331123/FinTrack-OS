import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import bcrypt from 'bcryptjs'
import { AuthTokenType, OAuthProvider, SessionRevokeReason, UserRole, UserStatus } from '@prisma/client'
import { isUniqueViolation } from '../../config/database-errors.ts'
import { durationToMilliseconds, durationToSeconds } from '../../config/duration.ts'
import { env } from '../../config/env.ts'
import { logger } from '../../config/logger.ts'
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    RequestValidationError,
    UnauthorizedError,
} from '../../utils/app-error.ts'
import { CURRENT_PASSWORD_HASH_VERSION, type PublicUser } from '../users/users.types.ts'
import { AuthRepository } from './auth.repository.ts'
import {
    BCRYPT_MAX_PASSWORD_BYTES,
    utf8ByteLength,
    type ChangePasswordInput,
    type ConfirmEmailChangeInput,
    type LoginInput,
    type RegisterInput,
    type RequestEmailChangeInput,
    type RequestPasswordResetInput,
    type ResendEmailCodeInput,
    type ResetPasswordInput,
    type VerifyEmailCodeInput,
    type VerifyPasswordResetCodeInput,
} from './auth.schemas.ts'
import {
    createNumericCode,
    createOpaqueToken,
    createTokenSalt,
    hashToken,
    signAccessToken,
    signRefreshToken,
    tokenHashMatches,
    verifyRefreshToken,
} from './auth.tokens.ts'
import type {
    AuthCredentialsUser,
    AuthenticatedSessionResult,
    StampedUser,
    EmailChangeRequestedResult,
    IssuedSession,
    OAuthIntent,
    PasswordResetRequestAcceptedResult,
    PasswordResetVerificationResult,
    PendingEmailVerificationResult,
    SessionContext,
} from './auth.types.ts'
import { EmailService } from './email.service.ts'
import { OAuthClient } from './oauth.client.ts'
import { classifyConsumedTokenReplay, isSessionUsable, newSessionExpiry, renewedIdleExpiry } from './session-policy.ts'

const PASSWORD_HASH_ROUNDS = 12

// Hash bcrypt (coste 12) de un valor aleatorio descartado. El login de un correo inexistente lo
// compara igual que uno real, para que el tiempo de respuesta no revele si la cuenta existe.
const DUMMY_PASSWORD_HASH = '$2b$12$vjpjd72ljCy0OWqPj0fgj.pfhbWcrS/bOx6maTU7tXSact41W9BUW'

export type AuthenticatedActor = {
    sessionId: string
    userId: string
}

type Clock = () => Date

function sessionLifetimes() {
    return {
        absoluteSeconds: durationToSeconds(env.SESSION_ABSOLUTE_TTL),
        idleSeconds: durationToSeconds(env.JWT_REFRESH_TTL),
    }
}

function secretsEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

// Seudónimo estable del correo para trazar incidentes en logs sin escribir el correo.
function emailFingerprint(email: string) {
    return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`log-email:${email}`).digest('hex').slice(0, 16)
}

function auditAuthEvent(event: string, outcome: string, fields: Record<string, unknown> = {}) {
    logger.info('auth_event', { event, outcome, ...fields })
}

const invalidCredentials = () => new UnauthorizedError('Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS')
const accountInactive = () => new ForbiddenError('Esta cuenta está inactiva.', 'ACCOUNT_INACTIVE')
const emailUnavailable = () =>
    new ConflictError(
        'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
        'EMAIL_ALREADY_REGISTERED',
    )
const invalidVerificationCode = () =>
    new UnauthorizedError(
        'El código no es válido. Si fallaste varias veces, solicita uno nuevo.',
        'EMAIL_VERIFICATION_INVALID',
    )
const invalidResetCode = () =>
    new UnauthorizedError('El código no es válido. Si fallaste varias veces, solicita uno nuevo.', 'PASSWORD_RESET_CODE_INVALID')
const invalidResetToken = () =>
    new UnauthorizedError(
        'La autorización para cambiar la contraseña no es válida. Solicita un código nuevo.',
        'PASSWORD_RESET_TOKEN_INVALID',
    )
const sessionInvalid = () => new UnauthorizedError('Tu sesión no es válida. Vuelve a iniciar sesión.', 'SESSION_INVALID')
const sessionExpired = () => new UnauthorizedError('Tu sesión expiró. Vuelve a iniciar sesión.', 'SESSION_EXPIRED')
const credentialsChanged = () =>
    new UnauthorizedError(
        'Tus credenciales o el estado de tu cuenta cambiaron mientras iniciabas sesión. Vuelve a intentarlo.',
        'CREDENTIALS_CHANGED',
    )
const currentPasswordInvalid = () =>
    new ForbiddenError('La contraseña actual no es correcta.', 'CURRENT_PASSWORD_INVALID')

export class AuthService {
    private readonly authRepository: AuthRepository
    private readonly clock: Clock
    private readonly emailService: EmailService
    private readonly oauthClient: OAuthClient

    constructor(
        authRepository = new AuthRepository(),
        emailService = new EmailService(),
        oauthClient = new OAuthClient(),
        clock: Clock = () => new Date(),
    ) {
        this.authRepository = authRepository
        this.clock = clock
        this.emailService = emailService
        this.oauthClient = oauthClient
    }

    // Registro. Un correo activo o inactivo es un conflicto real (409, mismo mensaje para ambos).
    // Un correo pendiente se reemplaza: quien registra de nuevo recibe el código. La creación
    // concurrente del mismo correo se resuelve releyendo la cuenta, nunca con un error de índice.
    async register(input: RegisterInput): Promise<PendingEmailVerificationResult> {
        const email = input.email
        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)
        const profile = {
            firstName: input.firstName,
            lastName: input.lastName ?? null,
            passwordHash,
            passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
            preferredCurrencyCode: input.preferredCurrencyCode ?? 'COP',
            role: UserRole.USER,
            timezone: input.timezone ?? 'UTC',
        }
        const existing = await this.authRepository.findUserByEmailForAuth(email)

        if (existing && existing.status !== UserStatus.PENDING_VERIFICATION) {
            auditAuthEvent('register', 'conflict', { emailFingerprint: emailFingerprint(email) })
            throw emailUnavailable()
        }

        if (existing) {
            return this.refreshPendingRegistration(existing.id, email, profile, 'pending_refreshed')
        }

        const code = createNumericCode(6)
        const tokenSalt = createTokenSalt()
        const expiresAt = this.futureDate(env.EMAIL_VERIFICATION_TTL)
        const created = await this.authRepository.createPendingUser(
            { ...profile, email, securityStamp: randomUUID(), status: UserStatus.PENDING_VERIFICATION },
            { expiresAt, requiresPassword: true, tokenHash: hashToken(code, tokenSalt), tokenSalt },
        )

        if (created) {
            auditAuthEvent('register', 'created', { emailFingerprint: emailFingerprint(email) })
            await this.emailService.sendVerificationCodeEmail({ code, email, expiresAt, firstName: created.firstName })

            return this.pendingResult(email, expiresAt, code)
        }

        const raced = await this.authRepository.findUserByEmailForAuth(email)

        if (!raced || raced.status !== UserStatus.PENDING_VERIFICATION) {
            auditAuthEvent('register', 'race_conflict', { emailFingerprint: emailFingerprint(email) })
            throw emailUnavailable()
        }

        return this.refreshPendingRegistration(raced.id, email, profile, 'race_resolved')
    }

    async verifyEmailCode(input: VerifyEmailCodeInput, context: SessionContext): Promise<AuthenticatedSessionResult> {
        const user = await this.authRepository.findUserByEmailForAuth(input.email)

        if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
            throw invalidVerificationCode()
        }

        const token = await this.authRepository.findLatestOpenCodeToken(user.id, AuthTokenType.EMAIL_VERIFICATION)

        if (!token || !tokenHashMatches(input.code, token.tokenHash, token.tokenSalt)) {
            if (token) {
                await this.authRepository.registerFailedCodeAttempt(token.id, env.AUTH_CODE_MAX_ATTEMPTS)
            }

            throw invalidVerificationCode()
        }

        // El código solo activa las credenciales para las que se emitió (mismo sello). Si lo emitió
        // un registro con contraseña, además hay que demostrar esa contraseña: quien recibe el
        // correo no puede activar una contraseña que eligió otra persona.
        const credentialsMatch =
            token.securityStamp === user.securityStamp &&
            (!token.requiresPassword ||
                (input.password !== undefined && (await bcrypt.compare(input.password, user.passwordHash))))

        if (!credentialsMatch || !token.securityStamp) {
            await this.authRepository.registerFailedCodeAttempt(token.id, env.AUTH_CODE_MAX_ATTEMPTS)
            throw invalidVerificationCode()
        }

        if (token.expiresAt <= this.clock()) {
            throw new UnauthorizedError('El código ya venció. Solicita uno nuevo.', 'EMAIL_VERIFICATION_EXPIRED', {
                email: input.email,
                expiresAt: token.expiresAt.toISOString(),
            })
        }

        const activated = await this.authRepository.activateWithVerificationCode(token.id, user.id, token.securityStamp)

        if (!activated) {
            throw invalidVerificationCode()
        }

        auditAuthEvent('verify_email', 'activated', { userId: activated.id })

        return this.startSession(activated, context)
    }

    // Respuesta neutral: el mismo resultado exista o no una verificación pendiente.
    async resendEmailCode(input: ResendEmailCodeInput): Promise<PendingEmailVerificationResult> {
        const startedAt = Date.now()
        const user = await this.authRepository.findUserByEmailForAuth(input.email)
        const result =
            user?.status === UserStatus.PENDING_VERIFICATION
                ? await this.issueVerificationCode(user, { requiresPassword: await this.resendRequiresPassword(user) })
                : this.pendingResult(input.email, this.futureDate(env.EMAIL_VERIFICATION_TTL))

        await this.padNeutralResponse(startedAt)

        return result
    }

    async requestPasswordReset(input: RequestPasswordResetInput): Promise<PasswordResetRequestAcceptedResult> {
        const startedAt = Date.now()
        const expiresAt = this.futureDate(env.PASSWORD_RESET_TTL)
        const user = await this.authRepository.findUserByEmailForAuth(input.email)

        if (user && user.status !== UserStatus.INACTIVE) {
            await this.issuePasswordResetCode(user, expiresAt)
        }

        await this.padNeutralResponse(startedAt)

        return { accepted: true, email: input.email, expiresAt }
    }

    async verifyPasswordResetCode(input: VerifyPasswordResetCodeInput): Promise<PasswordResetVerificationResult> {
        const user = await this.authRepository.findUserByEmailForAuth(input.email)

        if (!user || user.status === UserStatus.INACTIVE) {
            throw invalidResetCode()
        }

        const token = await this.authRepository.findLatestOpenCodeToken(user.id, AuthTokenType.PASSWORD_RESET)

        if (!token || !tokenHashMatches(input.code, token.tokenHash, token.tokenSalt)) {
            if (token) {
                await this.authRepository.registerFailedCodeAttempt(token.id, env.AUTH_CODE_MAX_ATTEMPTS)
            }

            throw invalidResetCode()
        }

        if (!token.securityStamp || token.securityStamp !== user.securityStamp) {
            throw invalidResetCode()
        }

        if (token.expiresAt <= this.clock()) {
            throw new UnauthorizedError('El código ya venció. Solicita uno nuevo.', 'PASSWORD_RESET_CODE_EXPIRED', {
                email: input.email,
                expiresAt: token.expiresAt.toISOString(),
            })
        }

        const resetToken = createOpaqueToken()
        const resetTokenExpiresAt = this.futureDate(env.PASSWORD_RESET_SESSION_TTL)
        const exchanged = await this.authRepository.exchangeResetCodeForSession({
            codeTokenId: token.id,
            resetToken: {
                expiresAt: resetTokenExpiresAt,
                securityStamp: token.securityStamp,
                tokenHash: hashToken(resetToken),
                userId: user.id,
            },
        })

        if (!exchanged) {
            throw invalidResetCode()
        }

        return { email: input.email, resetToken, resetTokenExpiresAt }
    }

    // Recuperación: consume la autorización una sola vez, cambia la contraseña y cierra todas las
    // sesiones (también invalida los access tokens emitidos, que dependen de su sesión).
    async resetPassword(input: ResetPasswordInput) {
        const user = await this.authRepository.findUserByEmailForAuth(input.email)

        if (!user || user.status === UserStatus.INACTIVE) {
            throw invalidResetToken()
        }

        const token = await this.authRepository.findLatestOpenResetSession(user.id)

        if (!token || !tokenHashMatches(input.resetToken, token.tokenHash) || !token.securityStamp) {
            throw invalidResetToken()
        }

        if (token.expiresAt <= this.clock()) {
            throw new UnauthorizedError(
                'La autorización para cambiar la contraseña venció. Solicita un código nuevo.',
                'PASSWORD_RESET_TOKEN_EXPIRED',
                { email: input.email, expiresAt: token.expiresAt.toISOString() },
            )
        }

        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)
        const changed = await this.authRepository.resetPasswordWithSession({
            passwordHash,
            resetTokenId: token.id,
            securityStamp: token.securityStamp,
            userId: user.id,
        })

        if (!changed) {
            throw invalidResetToken()
        }

        auditAuthEvent('password_reset', 'completed', { userId: user.id })

        return { passwordReset: true as const }
    }

    async login(
        input: LoginInput,
        context: SessionContext,
    ): Promise<AuthenticatedSessionResult | PendingEmailVerificationResult> {
        const user = await this.authRepository.findUserByEmailForAuth(input.email)
        const hashMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
        // bcrypt termina la clave con un NUL: «S + NUL» coincide con S. Ninguna contraseña válida
        // contiene NUL (newPasswordSchema lo rechaza), así que una entrada con NUL nunca autentica.
        const passwordMatches = hashMatches && !input.password.includes('\u0000')

        if (!user || !passwordMatches) {
            auditAuthEvent('login', 'invalid_credentials', { emailFingerprint: emailFingerprint(input.email) })
            throw invalidCredentials()
        }

        // bcrypt usa los primeros 72 bytes de «contraseña + NUL». Una entrada de más de 72 bytes nunca
        // pudo fijarse con la regla actual. Contra un hash heredado (versión 1), una entrada de 72
        // bytes puede ser el prefijo de una contraseña más larga, y una de 71 bytes coincide con una
        // contraseña cuyo byte 72 era NUL. En esos casos se exige una contraseña nueva. La versión 2
        // (72 bytes como máximo y sin NUL) no tiene esa ambigüedad.
        const passwordBytes = utf8ByteLength(input.password)
        const ambiguousLegacyHash =
            passwordBytes >= BCRYPT_MAX_PASSWORD_BYTES - 1 && user.passwordHashVersion < CURRENT_PASSWORD_HASH_VERSION

        if (passwordBytes > BCRYPT_MAX_PASSWORD_BYTES || ambiguousLegacyHash) {
            const expiresAt = this.futureDate(env.PASSWORD_RESET_TTL)

            if (user.status !== UserStatus.INACTIVE) {
                await this.issuePasswordResetCode(user, expiresAt)
            }

            auditAuthEvent('login', 'password_reset_required', { userId: user.id })
            throw new ForbiddenError(
                'Por seguridad debes crear una contraseña nueva. Te enviamos un código de recuperación a tu correo.',
                'PASSWORD_RESET_REQUIRED',
                { email: input.email, expiresAt: expiresAt.toISOString() },
            )
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            return this.issueVerificationCode(user, { requiresPassword: true })
        }

        if (user.status === UserStatus.INACTIVE) {
            throw accountInactive()
        }

        auditAuthEvent('login', 'success', { userId: user.id })

        return this.startSession(user, context)
    }

    // Orden de validación: firma, expiración, emisor y audiencia primero (un token vencido o falso
    // nunca toca el estado). Luego el estado de la sesión. Solo un token vigente y ya rotado, que
    // llega fuera de la ventana de reintento, revoca su propia familia; nunca otras sesiones.
    async refresh(rawRefreshToken: string | undefined, context: SessionContext): Promise<AuthenticatedSessionResult> {
        if (!rawRefreshToken) {
            throw new UnauthorizedError('Inicia sesión para continuar.', 'SESSION_MISSING')
        }

        const claims = await verifyRefreshToken(rawRefreshToken)
        const record = await this.authRepository.findRefreshToken(claims.tokenId)

        if (
            !record ||
            record.session.id !== claims.sessionId ||
            record.session.userId !== claims.userId ||
            !tokenHashMatches(rawRefreshToken, record.tokenHash)
        ) {
            throw sessionInvalid()
        }

        const now = this.clock()
        const user = record.session.user

        if (!isSessionUsable(record.session, now) || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            throw sessionExpired()
        }

        if (record.revokedAt) {
            throw sessionInvalid()
        }

        if (record.usedAt) {
            return this.handleConsumedRefresh(record.session.id, record.usedAt, now)
        }

        const nextTokenId = randomUUID()
        const nextExpiresAt = renewedIdleExpiry(now, record.session.absoluteExpiresAt, sessionLifetimes().idleSeconds)
        const nextRefreshToken = await signRefreshToken({
            expiresAt: nextExpiresAt,
            sessionId: record.session.id,
            tokenId: nextTokenId,
            userId: user.id,
        })
        const outcome = await this.authRepository.rotateRefreshToken({
            context,
            currentTokenId: record.id,
            idleExpiresAt: nextExpiresAt,
            next: { expiresAt: nextExpiresAt, tokenHash: hashToken(nextRefreshToken), tokenId: nextTokenId },
            now,
            sessionId: record.session.id,
            userId: user.id,
        })

        if (outcome.status === 'already-used') {
            return this.handleConsumedRefresh(record.session.id, outcome.usedAt ?? now, now)
        }

        if (outcome.status === 'session-invalid') {
            throw sessionExpired()
        }

        const { accessToken, accessTokenExpiresInSeconds } = await signAccessToken({
            role: user.role,
            sessionId: record.session.id,
            userId: user.id,
        })
        const { deletedAt: _deletedAt, ...publicUser } = user

        return {
            accessToken,
            accessTokenExpiresInSeconds,
            refreshToken: nextRefreshToken,
            refreshTokenMaxAgeMs: Math.max(0, nextExpiresAt.getTime() - now.getTime()),
            sessionId: record.session.id,
            user: publicUser,
        }
    }

    async logout(actor: AuthenticatedActor, rawRefreshToken?: string) {
        await this.authRepository.revokeUserSession(actor.sessionId, actor.userId, SessionRevokeReason.LOGOUT)

        if (!rawRefreshToken) {
            return
        }

        try {
            const claims = await verifyRefreshToken(rawRefreshToken)

            if (claims.userId === actor.userId && claims.sessionId !== actor.sessionId) {
                await this.authRepository.revokeUserSession(claims.sessionId, actor.userId, SessionRevokeReason.LOGOUT)
            }
        } catch {
            // Una cookie inválida no impide cerrar la sesión del access token.
        }
    }

    async logoutAll(actor: AuthenticatedActor) {
        await this.authRepository.closeAllSessions(actor.userId, SessionRevokeReason.LOGOUT_ALL)
        auditAuthEvent('logout_all', 'completed', { userId: actor.userId })
    }

    async getAuthenticatedUser(userId: string) {
        const user = await this.authRepository.findActiveUserById(userId)

        if (!user) {
            throw sessionInvalid()
        }

        return user
    }

    // Cambio de contraseña con reautenticación. La sesión actual sigue; las demás se cierran.
    async changePassword(actor: AuthenticatedActor, input: ChangePasswordInput) {
        const user = await this.requireCurrentPassword(actor.userId, input.currentPassword)
        const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_HASH_ROUNDS)
        const changed = await this.authRepository.changePassword({
            currentSessionId: actor.sessionId,
            passwordHash,
            securityStamp: user.securityStamp,
            userId: user.id,
        })

        if (!changed) {
            auditAuthEvent('password_change', 'credentials_changed', { userId: user.id })
            throw credentialsChanged()
        }

        auditAuthEvent('password_change', 'completed', { userId: user.id })

        return { otherSessionsClosed: true as const, passwordChanged: true as const }
    }

    // Paso 1 del cambio de correo: reautenticación y código enviado al correo nuevo. El correo de
    // la cuenta no cambia hasta confirmar que el usuario controla la dirección nueva.
    async requestEmailChange(actor: AuthenticatedActor, input: RequestEmailChangeInput): Promise<EmailChangeRequestedResult> {
        const user = await this.requireCurrentPassword(actor.userId, input.currentPassword)

        if (input.newEmail === user.email) {
            throw new RequestValidationError('Revisa los datos enviados.', [
                { field: 'newEmail', message: 'Ese ya es tu correo actual.' },
            ])
        }

        if (await this.authRepository.emailBelongsToAnotherUser(input.newEmail, user.id)) {
            throw emailUnavailable()
        }

        const code = createNumericCode(6)
        const tokenSalt = createTokenSalt()
        const expiresAt = this.futureDate(env.EMAIL_VERIFICATION_TTL)

        await this.authRepository.issueCodeToken(AuthTokenType.EMAIL_CHANGE, {
            expiresAt,
            securityStamp: user.securityStamp,
            targetEmail: input.newEmail,
            tokenHash: hashToken(code, tokenSalt),
            tokenSalt,
            userId: user.id,
        })
        await this.emailService.sendEmailChangeCodeEmail({ code, email: input.newEmail, expiresAt, firstName: user.firstName })

        return {
            email: input.newEmail,
            expiresAt,
            ...(env.exposeDevAuthTokens ? { verificationCode: code } : {}),
        }
    }

    async confirmEmailChange(actor: AuthenticatedActor, input: ConfirmEmailChangeInput) {
        const user = await this.authRepository.findUserByIdForAuth(actor.userId)
        const token = user ? await this.authRepository.findLatestOpenCodeToken(user.id, AuthTokenType.EMAIL_CHANGE) : null
        const invalid = () =>
            new BadRequestError('El código no es válido. Si fallaste varias veces, solicita uno nuevo.', 'EMAIL_CHANGE_CODE_INVALID')

        if (
            !user ||
            !token?.targetEmail ||
            !token.securityStamp ||
            token.securityStamp !== user.securityStamp ||
            !tokenHashMatches(input.code, token.tokenHash, token.tokenSalt)
        ) {
            if (token) {
                await this.authRepository.registerFailedCodeAttempt(token.id, env.AUTH_CODE_MAX_ATTEMPTS)
            }

            throw invalid()
        }

        if (token.expiresAt <= this.clock()) {
            throw new BadRequestError('El código ya venció. Solicita uno nuevo.', 'EMAIL_CHANGE_CODE_EXPIRED')
        }

        let updated: PublicUser | null

        try {
            updated = await this.authRepository.confirmEmailChange({
                currentSessionId: actor.sessionId,
                securityStamp: token.securityStamp,
                targetEmail: token.targetEmail,
                tokenId: token.id,
                userId: user.id,
            })
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw emailUnavailable()
            }

            throw error
        }

        if (!updated) {
            throw invalid()
        }

        auditAuthEvent('email_change', 'completed', { userId: user.id })
        await this.emailService.sendEmailChangedNotice({
            firstName: user.firstName,
            newEmail: updated.email,
            previousEmail: user.email,
        })

        return { otherSessionsClosed: true as const, user: updated }
    }

    startOAuth(provider: OAuthProvider) {
        const state = randomBytes(24).toString('base64url')

        return { authorizationUrl: this.oauthClient.authorizationUrl(provider, state), state }
    }

    async handleOAuthCallback(
        input: { code: string; intent: OAuthIntent; provider: OAuthProvider; state: string; storedState?: string },
        context: SessionContext,
    ): Promise<AuthenticatedSessionResult | PendingEmailVerificationResult> {
        if (!input.storedState || !secretsEqual(input.state, input.storedState)) {
            throw new UnauthorizedError(
                'La solicitud de inicio de sesión no es válida. Intenta de nuevo.',
                'OAUTH_STATE_INVALID',
            )
        }

        const profile = await this.oauthClient.exchangeCode(input.provider, input.code)
        const existingAccount = await this.authRepository.findOAuthAccount(profile.provider, profile.providerAccountId)
        const accountExists = () =>
            new ConflictError(
                'Ya existe una cuenta con este correo. Inicia sesión en lugar de crear una nueva.',
                'OAUTH_ACCOUNT_ALREADY_EXISTS',
                { provider: profile.provider.toLowerCase() },
            )
        let user: StampedUser

        if (existingAccount) {
            if (existingAccount.user.deletedAt || existingAccount.user.status === UserStatus.INACTIVE) {
                throw accountInactive()
            }

            if (input.intent === 'register') {
                throw accountExists()
            }

            await this.authRepository.updateOAuthAccountMetadata(existingAccount.id, profile)
            user =
                existingAccount.user.status === UserStatus.PENDING_VERIFICATION
                    ? await this.authRepository.resetPendingCredentialsForOAuth(
                          existingAccount.user.id,
                          await bcrypt.hash(createOpaqueToken(), PASSWORD_HASH_ROUNDS),
                      )
                    : existingAccount.user
        } else {
            const existingUser = await this.authRepository.findUserByEmailForAuth(profile.email)
            const unusablePasswordHash = await bcrypt.hash(createOpaqueToken(), PASSWORD_HASH_ROUNDS)

            if (existingUser) {
                if (existingUser.status === UserStatus.INACTIVE) {
                    throw accountInactive()
                }

                if (input.intent === 'register') {
                    throw accountExists()
                }

                user = await this.authRepository.linkOAuthAccount({
                    expectedStatus: existingUser.status,
                    profile,
                    unusablePasswordHash,
                    userId: existingUser.id,
                })
                auditAuthEvent('oauth_link', existingUser.status === UserStatus.PENDING_VERIFICATION ? 'pending_reset' : 'linked', {
                    provider: profile.provider,
                    userId: existingUser.id,
                })
            } else {
                user = await this.authRepository.createUserFromOAuth(profile, unusablePasswordHash)
            }
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            // El proveedor ya verificó el correo: el código no exige contraseña, pero queda ligado
            // al sello actual y cualquier re-registro posterior lo invalida.
            return this.issueVerificationCode(user, { requiresPassword: false })
        }

        if (user.status === UserStatus.INACTIVE) {
            throw accountInactive()
        }

        return this.startSession(user, context)
    }

    // Un reenvío conserva el requisito de las credenciales vigentes: el último código emitido con
    // el mismo sello (aunque se haya revocado por intentos fallidos) dice si vienen de un registro
    // con contraseña o de OAuth. Sin ese dato se exige contraseña; el usuario de OAuth puede repetir
    // el inicio con su proveedor.
    private async resendRequiresPassword(user: AuthCredentialsUser) {
        const latest = await this.authRepository.findLatestCodeTokenForStamp(user.id, AuthTokenType.EMAIL_VERIFICATION, user.securityStamp)

        return latest?.requiresPassword ?? true
    }

    private async refreshPendingRegistration(
        userId: string,
        email: string,
        profile: Parameters<AuthRepository['updatePendingUser']>[1],
        outcome: string,
    ) {
        const updated = await this.authRepository.updatePendingUser(userId, profile)

        if (!updated) {
            auditAuthEvent('register', 'activated_meanwhile', { emailFingerprint: emailFingerprint(email) })
            throw emailUnavailable()
        }

        auditAuthEvent('register', outcome, { emailFingerprint: emailFingerprint(email) })

        return this.issueVerificationCode(updated, { requiresPassword: true })
    }

    private async handleConsumedRefresh(sessionId: string, usedAt: Date, now: Date): Promise<never> {
        if (classifyConsumedTokenReplay(usedAt, now, env.REFRESH_REUSE_GRACE_SECONDS) === 'concurrent-retry') {
            throw new ConflictError(
                'Tu sesión se acaba de renovar en otra pestaña. Reintenta.',
                'REFRESH_TOKEN_ROTATED',
            )
        }

        await this.authRepository.revokeSession(sessionId, SessionRevokeReason.REFRESH_REUSE)
        auditAuthEvent('refresh', 'reuse_detected', { sessionId })

        throw new UnauthorizedError('Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.', 'SESSION_REVOKED')
    }

    private async requireCurrentPassword(userId: string, currentPassword: string) {
        const user = await this.authRepository.findUserByIdForAuth(userId)

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw sessionInvalid()
        }

        if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
            auditAuthEvent('reauthentication', 'failed', { userId })
            throw currentPasswordInvalid()
        }

        return user
    }

    private async startSession(user: StampedUser, context: SessionContext): Promise<AuthenticatedSessionResult> {
        const issued = await this.createSession(user, context)

        await this.authRepository.touchLastLogin(user.id)

        return { ...issued, user: this.toPublicUser(user) }
    }

    private async createSession(user: StampedUser, context: SessionContext): Promise<IssuedSession> {
        const now = this.clock()
        const sessionId = randomUUID()
        const tokenId = randomUUID()
        const { absoluteExpiresAt, idleExpiresAt } = newSessionExpiry(now, sessionLifetimes())
        const refreshToken = await signRefreshToken({ expiresAt: idleExpiresAt, sessionId, tokenId, userId: user.id })

        const created = await this.authRepository.createSession({
            absoluteExpiresAt,
            context,
            idleExpiresAt,
            refreshToken: { expiresAt: idleExpiresAt, tokenHash: hashToken(refreshToken), tokenId },
            retentionCutoff: new Date(now.getTime() - env.AUTH_RETENTION_DAYS * 24 * 60 * 60 * 1000),
            securityStamp: user.securityStamp,
            sessionId,
            userId: user.id,
        })

        if (!created) {
            auditAuthEvent('session', 'credentials_changed', { userId: user.id })
            throw credentialsChanged()
        }

        const { accessToken, accessTokenExpiresInSeconds } = await signAccessToken({
            role: user.role,
            sessionId,
            userId: user.id,
        })

        return {
            accessToken,
            accessTokenExpiresInSeconds,
            refreshToken,
            refreshTokenMaxAgeMs: idleExpiresAt.getTime() - now.getTime(),
            sessionId,
        }
    }

    private async issueVerificationCode(
        user: StampedUser,
        options: { requiresPassword: boolean },
    ): Promise<PendingEmailVerificationResult> {
        const code = createNumericCode(6)
        const tokenSalt = createTokenSalt()
        const expiresAt = this.futureDate(env.EMAIL_VERIFICATION_TTL)

        await this.authRepository.issueCodeToken(AuthTokenType.EMAIL_VERIFICATION, {
            expiresAt,
            requiresPassword: options.requiresPassword,
            securityStamp: user.securityStamp,
            tokenHash: hashToken(code, tokenSalt),
            tokenSalt,
            userId: user.id,
        })
        await this.emailService.sendVerificationCodeEmail({ code, email: user.email, expiresAt, firstName: user.firstName })

        return this.pendingResult(user.email, expiresAt, code)
    }

    private async issuePasswordResetCode(user: StampedUser, expiresAt: Date) {
        const code = createNumericCode(6)
        const tokenSalt = createTokenSalt()

        await this.authRepository.issueCodeToken(AuthTokenType.PASSWORD_RESET, {
            expiresAt,
            securityStamp: user.securityStamp,
            tokenHash: hashToken(code, tokenSalt),
            tokenSalt,
            userId: user.id,
        })
        await this.emailService.sendPasswordResetCodeEmail({ code, email: user.email, expiresAt, firstName: user.firstName })
    }

    private pendingResult(email: string, expiresAt: Date, code?: string): PendingEmailVerificationResult {
        return {
            email,
            expiresAt,
            requiresEmailVerification: true,
            ...(env.exposeDevAuthTokens && code ? { verificationCode: code } : {}),
        }
    }

    // Iguala la duración de las respuestas neutrales para que enviar o no un correo no sea una
    // diferencia trivial de tiempo. No elimina por completo latencias extremas del proveedor.
    private async padNeutralResponse(startedAt: number) {
        const remaining = env.AUTH_NEUTRAL_RESPONSE_MS - (Date.now() - startedAt)

        if (remaining > 0) {
            await delay(remaining)
        }
    }

    private futureDate(duration: string) {
        return new Date(this.clock().getTime() + durationToMilliseconds(duration))
    }

    // Quita los campos internos (hash, versión, sello, borrado) antes de responder.
    private toPublicUser(user: StampedUser | AuthCredentialsUser): PublicUser {
        const {
            deletedAt: _deletedAt,
            passwordHash: _passwordHash,
            passwordHashVersion: _passwordHashVersion,
            securityStamp: _securityStamp,
            ...publicUser
        } = user as AuthCredentialsUser

        return publicUser
    }
}
