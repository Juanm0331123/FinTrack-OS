import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { OAuthProvider, UserRole, UserStatus } from '@prisma/client'
import { env } from '../../config/env.ts'
import {
    ConflictError,
    ForbiddenError,
    ServiceUnavailableError,
    UnauthorizedError,
} from '../../utils/app-error.ts'
import { type PublicUser } from '../users/users.types.ts'
import { AuthRepository } from './auth.repository.ts'
import { EmailService } from './email.service.ts'
import {
    createNumericCode,
    createOpaqueToken,
    createTokenSalt,
    hashToken,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from './auth.tokens.ts'
import type {
    LoginInput,
    RequestPasswordResetInput,
    RefreshSessionInput,
    RegisterInput,
    ResetPasswordInput,
    ResendEmailCodeInput,
    VerifyEmailCodeInput,
    VerifyPasswordResetCodeInput,
} from './auth.schemas.ts'
import type {
    AuthenticatedSessionResult,
    AuthCredentialsUser,
    NormalizedOAuthProfile,
    OAuthIntent,
    PendingEmailVerificationResult,
    PasswordResetRequestAcceptedResult,
    PasswordResetVerificationResult,
    SessionContext,
    TokenPair,
} from './auth.types.ts'

type OAuthStartResult = {
    authorizationUrl: string
    state: string
}

const PASSWORD_HASH_ROUNDS = 12
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_ENDPOINT = 'https://api.github.com/user'
const GITHUB_EMAILS_ENDPOINT = 'https://api.github.com/user/emails'

export class AuthService {
    private readonly authRepository: AuthRepository
    private readonly emailService: EmailService

    constructor(
        authRepository = new AuthRepository(),
        emailService = new EmailService(),
    ) {
        this.authRepository = authRepository
        this.emailService = emailService
    }

    async register(input: RegisterInput) {
        const email = this.normalizeEmail(input.email)
        const existingUser = await this.authRepository.findUserByEmailForAuth(email)
        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)

        if (existingUser?.status === UserStatus.ACTIVE) {
            throw new ConflictError('Ya existe una cuenta con ese correo.')
        }

        if (existingUser?.status === UserStatus.INACTIVE) {
            throw new ForbiddenError('Esta cuenta está inactiva.')
        }

        if (existingUser) {
            const updatedUser = await this.authRepository.updatePendingRegisteredUser({
                userId: existingUser.id,
                userData: {
                    email,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    passwordHash,
                    preferredCurrencyCode: input.preferredCurrencyCode ?? 'COP',
                    role: UserRole.USER,
                    timezone: input.timezone ?? 'UTC',
                },
            })

            return this.issueAndSendEmailVerificationCode(updatedUser)
        }

        const verificationCode = createNumericCode(6)
        const tokenSalt = createTokenSalt()
        const expiresAt = this.createFutureDate(env.EMAIL_VERIFICATION_TTL)

        const user = await this.authRepository.createRegisteredUser({
            tokenExpiresAt: expiresAt,
            tokenHash: hashToken(verificationCode, tokenSalt),
            tokenSalt,
            userData: {
                email,
                firstName: input.firstName,
                lastName: input.lastName,
                passwordHash,
                preferredCurrencyCode: input.preferredCurrencyCode ?? 'COP',
                role: UserRole.USER,
                status: UserStatus.PENDING_VERIFICATION,
                timezone: input.timezone ?? 'UTC',
            },
        })

        return this.issueAndSendEmailVerificationCode(user, {
            code: verificationCode,
            expiresAt,
            persistToken: false,
        })
    }

    async verifyEmailCode(
        input: VerifyEmailCodeInput,
        sessionContext: SessionContext,
    ) {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user || user.deletedAt) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'EMAIL_VERIFICATION_INVALID',
            )
        }

        if (user.status === UserStatus.ACTIVE) {
            throw new ConflictError(
                'Este correo ya está verificado.',
                'EMAIL_ALREADY_VERIFIED',
            )
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new ForbiddenError('Esta cuenta está inactiva.')
        }

        const verificationRecord =
            await this.authRepository.findLatestEmailVerificationTokenByUserId(user.id)

        if (!verificationRecord || !verificationRecord.tokenSalt) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'EMAIL_VERIFICATION_INVALID',
            )
        }

        if (verificationRecord.expiresAt.getTime() <= Date.now()) {
            throw new UnauthorizedError(
                'El código ya venció. Solicita uno nuevo.',
                'EMAIL_VERIFICATION_EXPIRED',
                {
                    email,
                    expiresAt: verificationRecord.expiresAt.toISOString(),
                },
            )
        }

        if (
            verificationRecord.usedAt ||
            verificationRecord.revokedAt ||
            hashToken(input.code, verificationRecord.tokenSalt) !==
                verificationRecord.tokenHash
        ) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'EMAIL_VERIFICATION_INVALID',
            )
        }

        const verifiedUser =
            await this.authRepository.activateUserAndConsumeVerificationToken(
                verificationRecord.id,
                verificationRecord.userId,
            )

        const tokenPair = await this.createTokenPair(verifiedUser.id, verifiedUser.role)
        await this.authRepository.createRefreshTokenSession({
            ...sessionContext,
            expiresAt: tokenPair.refreshTokenExpiresAt,
            sessionId: tokenPair.sessionId,
            tokenHash: hashToken(tokenPair.refreshToken),
            userId: verifiedUser.id,
        })
        await this.authRepository.touchLastLogin(verifiedUser.id)

        return {
            ...tokenPair,
            user: verifiedUser,
        } satisfies AuthenticatedSessionResult
    }

    async resendEmailCode(input: ResendEmailCodeInput) {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user || user.deletedAt) {
            throw new UnauthorizedError(
                'No hay una verificación de correo pendiente.',
                'EMAIL_VERIFICATION_NOT_FOUND',
            )
        }

        if (user.status === UserStatus.ACTIVE) {
            throw new ConflictError(
                'Este correo ya está verificado.',
                'EMAIL_ALREADY_VERIFIED',
            )
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new ForbiddenError('Esta cuenta está inactiva.')
        }

        return this.issueAndSendEmailVerificationCode(user)
    }

    async requestPasswordReset(
        input: RequestPasswordResetInput,
    ): Promise<PasswordResetRequestAcceptedResult> {
        const email = this.normalizeEmail(input.email)
        const expiresAt = this.createFutureDate(env.PASSWORD_RESET_TTL)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user || user.deletedAt || user.status === UserStatus.INACTIVE) {
            return {
                accepted: true,
                email,
                expiresAt,
            }
        }

        await this.issueAndSendPasswordResetCode(user, expiresAt)

        return {
            accepted: true,
            email,
            expiresAt,
        }
    }

    async verifyPasswordResetCode(
        input: VerifyPasswordResetCodeInput,
    ): Promise<PasswordResetVerificationResult> {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user || user.deletedAt || user.status === UserStatus.INACTIVE) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'PASSWORD_RESET_CODE_INVALID',
            )
        }

        const resetCodeRecord =
            await this.authRepository.findLatestPasswordResetCodeTokenByUserId(
                user.id,
            )

        if (!resetCodeRecord || !resetCodeRecord.tokenSalt) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'PASSWORD_RESET_CODE_INVALID',
            )
        }

        if (resetCodeRecord.expiresAt.getTime() <= Date.now()) {
            throw new UnauthorizedError(
                'El código ya venció. Solicita uno nuevo.',
                'PASSWORD_RESET_CODE_EXPIRED',
                {
                    email,
                    expiresAt: resetCodeRecord.expiresAt.toISOString(),
                },
            )
        }

        if (
            resetCodeRecord.usedAt ||
            resetCodeRecord.revokedAt ||
            hashToken(input.code, resetCodeRecord.tokenSalt) !==
                resetCodeRecord.tokenHash
        ) {
            throw new UnauthorizedError(
                'El código no es válido.',
                'PASSWORD_RESET_CODE_INVALID',
            )
        }

        const resetToken = createOpaqueToken()
        const resetTokenExpiresAt = this.createFutureDate(
            env.PASSWORD_RESET_SESSION_TTL,
        )

        await this.authRepository.consumePasswordResetCodeAndIssueSessionToken({
            codeTokenId: resetCodeRecord.id,
            resetTokenExpiresAt,
            resetTokenHash: hashToken(resetToken),
            userId: user.id,
        })

        return {
            email,
            resetToken,
            resetTokenExpiresAt,
        }
    }

    async resetPassword(input: ResetPasswordInput) {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user || user.deletedAt || user.status === UserStatus.INACTIVE) {
            throw new UnauthorizedError(
                'La autorización para cambiar la contraseña no es válida. Solicita un código nuevo.',
                'PASSWORD_RESET_TOKEN_INVALID',
            )
        }

        const resetSessionRecord =
            await this.authRepository.findLatestPasswordResetSessionTokenByUserId(
                user.id,
            )

        if (!resetSessionRecord || resetSessionRecord.tokenSalt) {
            throw new UnauthorizedError(
                'La autorización para cambiar la contraseña no es válida. Solicita un código nuevo.',
                'PASSWORD_RESET_TOKEN_INVALID',
            )
        }

        if (resetSessionRecord.expiresAt.getTime() <= Date.now()) {
            throw new UnauthorizedError(
                'La autorización para cambiar la contraseña venció. Solicita un código nuevo.',
                'PASSWORD_RESET_TOKEN_EXPIRED',
                {
                    email,
                    expiresAt: resetSessionRecord.expiresAt.toISOString(),
                },
            )
        }

        if (
            resetSessionRecord.usedAt ||
            resetSessionRecord.revokedAt ||
            hashToken(input.resetToken) !== resetSessionRecord.tokenHash
        ) {
            throw new UnauthorizedError(
                'La autorización para cambiar la contraseña no es válida. Solicita un código nuevo.',
                'PASSWORD_RESET_TOKEN_INVALID',
            )
        }

        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)

        await this.authRepository.consumePasswordResetSessionAndUpdatePassword({
            passwordHash,
            resetTokenId: resetSessionRecord.id,
            userId: user.id,
        })

        return {
            passwordReset: true,
        }
    }

    async login(
        input: LoginInput,
        sessionContext: SessionContext,
    ): Promise<AuthenticatedSessionResult | PendingEmailVerificationResult> {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user) {
            throw new UnauthorizedError('Correo o contraseña incorrectos.')
        }

        const passwordMatches = await bcrypt.compare(
            input.password,
            user.passwordHash,
        )

        if (!passwordMatches) {
            throw new UnauthorizedError('Correo o contraseña incorrectos.')
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            return this.issueAndSendEmailVerificationCode(user)
        }

        this.assertUserCanStartSession(user)

        const tokenPair = await this.createTokenPair(user.id, user.role)
        await this.authRepository.createRefreshTokenSession({
            ...sessionContext,
            expiresAt: tokenPair.refreshTokenExpiresAt,
            sessionId: tokenPair.sessionId,
            tokenHash: hashToken(tokenPair.refreshToken),
            userId: user.id,
        })
        await this.authRepository.touchLastLogin(user.id)

        return {
            ...tokenPair,
            user: this.toPublicUser(user),
        }
    }

    async refresh(input: RefreshSessionInput, sessionContext: SessionContext) {
        const rawRefreshToken = input.refreshToken

        if (!rawRefreshToken) {
            throw new UnauthorizedError('Tu sesión expiró. Vuelve a iniciar sesión.')
        }

        const refreshTokenRecord = await this.authRepository.findRefreshTokenByHash(
            hashToken(rawRefreshToken),
        )

        if (!refreshTokenRecord) {
            throw new UnauthorizedError('Tu sesión no es válida. Vuelve a iniciar sesión.')
        }

        if (refreshTokenRecord.revokedAt) {
            await this.authRepository.revokeAllRefreshTokens(refreshTokenRecord.userId)
            throw new UnauthorizedError('Tu sesión se cerró. Vuelve a iniciar sesión.')
        }

        if (refreshTokenRecord.expiresAt.getTime() <= Date.now()) {
            await this.authRepository.revokeRefreshTokenById(refreshTokenRecord.id)
            throw new UnauthorizedError('Tu sesión expiró. Vuelve a iniciar sesión.')
        }

        const tokenClaims = await verifyRefreshToken(rawRefreshToken)

        if (
            tokenClaims.sessionId !== refreshTokenRecord.id ||
            tokenClaims.userId !== refreshTokenRecord.userId ||
            tokenClaims.tokenType !== 'refresh'
        ) {
            await this.authRepository.revokeAllRefreshTokens(refreshTokenRecord.userId)
            throw new UnauthorizedError('Tu sesión no es válida. Vuelve a iniciar sesión.')
        }

        this.assertUserCanStartSession(refreshTokenRecord.user)

        const tokenPair = await this.createTokenPair(
            refreshTokenRecord.userId,
            refreshTokenRecord.user.role,
        )

        await this.authRepository.rotateRefreshTokenSession({
            ...sessionContext,
            currentTokenId: refreshTokenRecord.id,
            newExpiresAt: tokenPair.refreshTokenExpiresAt,
            newSessionId: tokenPair.sessionId,
            newTokenHash: hashToken(tokenPair.refreshToken),
            userId: refreshTokenRecord.userId,
        })
        await this.authRepository.touchLastLogin(refreshTokenRecord.userId)

        return {
            ...tokenPair,
            user: this.toPublicUser(refreshTokenRecord.user),
        }
    }

    async logout(userId: string, refreshToken?: string) {
        if (!refreshToken) {
            return
        }

        const refreshTokenRecord = await this.authRepository.findRefreshTokenByHash(
            hashToken(refreshToken),
        )

        if (!refreshTokenRecord || refreshTokenRecord.userId !== userId) {
            return
        }

        await this.authRepository.revokeRefreshTokenById(refreshTokenRecord.id)
    }

    async logoutAll(userId: string) {
        await this.authRepository.revokeAllRefreshTokens(userId)
    }

    async getAuthenticatedUser(userId: string) {
        const user = await this.authRepository.findActiveUserById(userId)

        if (!user) {
            throw new UnauthorizedError('No encontramos tu usuario. Vuelve a iniciar sesión.')
        }

        return user
    }

    async startOAuth(provider: OAuthProvider): Promise<OAuthStartResult> {
        const state = randomBytes(24).toString('base64url')
        const providerConfig = this.getOAuthProviderConfig(provider)

        return {
            authorizationUrl: `${providerConfig.authorizationUrl}?${providerConfig.createSearchParams(state).toString()}`,
            state,
        }
    }

    async handleOAuthCallback(input: {
        code: string
        intent: OAuthIntent
        provider: OAuthProvider
        state: string
        storedState?: string
    } & SessionContext) {
        if (!input.storedState || input.state !== input.storedState) {
            throw new UnauthorizedError('La solicitud de inicio de sesión no es válida. Intenta de nuevo.')
        }

        const profile = await this.exchangeOAuthCodeForProfile(
            input.provider,
            input.code,
        )

        if (!profile.emailVerified) {
            throw new ForbiddenError(
                'El proveedor no devolvió un correo verificado.',
            )
        }

        const existingOAuthAccount = await this.authRepository.findOAuthAccount(
            profile.provider,
            profile.providerAccountId,
        )

        let user: PublicUser

        if (existingOAuthAccount) {
            if (existingOAuthAccount.user.deletedAt) {
                throw new UnauthorizedError(
                    'Esta cuenta ya no está disponible.',
                )
            }

            if (existingOAuthAccount.user.status === UserStatus.INACTIVE) {
                throw new ForbiddenError('Esta cuenta está inactiva.')
            }

            if (input.intent === 'register') {
                throw new ConflictError(
                    'Ya existe una cuenta con este correo. Inicia sesión en lugar de crear una nueva.',
                    'OAUTH_ACCOUNT_ALREADY_EXISTS',
                    {
                        email: profile.email,
                        provider: profile.provider.toLowerCase(),
                    },
                )
            }

            await this.authRepository.updateOAuthAccountMetadata(
                existingOAuthAccount.id,
                profile,
            )
            user = this.toPublicUser(existingOAuthAccount.user)
        } else {
            const existingUser = await this.authRepository.findUserByEmailForAuth(
                this.normalizeEmail(profile.email),
            )

            if (existingUser) {
                if (existingUser.status === UserStatus.INACTIVE) {
                    throw new ForbiddenError('Esta cuenta está inactiva.')
                }

                if (input.intent === 'register') {
                    throw new ConflictError(
                        'Ya existe una cuenta con este correo. Inicia sesión en lugar de crear una nueva.',
                        'OAUTH_ACCOUNT_ALREADY_EXISTS',
                        {
                            email: profile.email,
                            provider: profile.provider.toLowerCase(),
                        },
                    )
                }

                user = await this.authRepository.linkOAuthAccountToUser(
                    existingUser.id,
                    profile,
                    existingUser.status,
                )
            } else {
                const placeholderPasswordHash = await bcrypt.hash(
                    createOpaqueToken(),
                    PASSWORD_HASH_ROUNDS,
                )
                user = await this.authRepository.createUserFromOAuth(
                    profile,
                    placeholderPasswordHash,
                )
            }
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            return this.issueAndSendEmailVerificationCode(user)
        }

        const tokenPair = await this.createTokenPair(user.id, user.role)
        await this.authRepository.createRefreshTokenSession({
            deviceName: input.deviceName,
            expiresAt: tokenPair.refreshTokenExpiresAt,
            ipAddress: input.ipAddress,
            sessionId: tokenPair.sessionId,
            tokenHash: hashToken(tokenPair.refreshToken),
            userAgent: input.userAgent,
            userId: user.id,
        })
        await this.authRepository.touchLastLogin(user.id)

        return {
            ...tokenPair,
            user,
        }
    }

    private assertUserCanStartSession(user: AuthCredentialsUser | PublicUser) {
        if ('deletedAt' in user && user.deletedAt) {
            throw new UnauthorizedError('Esta cuenta ya no está disponible.')
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            throw new ForbiddenError('Confirma tu correo antes de iniciar sesión.')
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new ForbiddenError('Esta cuenta está inactiva.')
        }
    }

    private async createTokenPair(userId: string, role: UserRole): Promise<TokenPair> {
        const sessionId = randomUUID()
        const { accessToken, accessTokenExpiresInSeconds } =
            await signAccessToken({
                role,
                userId,
            })
        const refreshTokenResult = await signRefreshToken({
            role,
            sessionId,
            userId,
        })

        return {
            accessToken,
            accessTokenExpiresInSeconds,
            refreshToken: refreshTokenResult.refreshToken,
            refreshTokenExpiresAt: refreshTokenResult.refreshTokenExpiresAt,
            refreshTokenMaxAgeMs: refreshTokenResult.refreshTokenMaxAgeMs,
            sessionId,
        }
    }

    private createFutureDate(duration: string) {
        const match = duration.trim().match(/^(\d+)(s|m|h|d)$/i)

        if (!match) {
            throw new Error(
                `Unsupported duration "${duration}". Use a value like 15m, 1h, or 7d.`,
            )
        }

        const amount = Number(match[1])
        const unit = match[2].toLowerCase()
        const multiplier =
            unit === 's'
                ? 1000
                : unit === 'm'
                  ? 60 * 1000
                  : unit === 'h'
                    ? 60 * 60 * 1000
                    : 24 * 60 * 60 * 1000

        return new Date(Date.now() + amount * multiplier)
    }

    private getOAuthProviderConfig(provider: OAuthProvider) {
        if (provider === OAuthProvider.GOOGLE) {
            const clientId = env.GOOGLE_OAUTH_CLIENT_ID
            const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET
            const callbackUrl = env.GOOGLE_OAUTH_CALLBACK_URL

            if (!clientId || !clientSecret || !callbackUrl) {
                throw new ServiceUnavailableError(
                    'El acceso con Google no está disponible.',
                )
            }

            return {
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                callbackUrl,
                clientId,
                clientSecret,
                createSearchParams: (state: string) =>
                    new URLSearchParams({
                        client_id: clientId,
                        redirect_uri: callbackUrl,
                        response_type: 'code',
                        scope: 'openid email profile',
                        state,
                    }),
            }
        }

        const clientId = env.GITHUB_OAUTH_CLIENT_ID
        const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET
        const callbackUrl = env.GITHUB_OAUTH_CALLBACK_URL

        if (!clientId || !clientSecret || !callbackUrl) {
            throw new ServiceUnavailableError('El acceso con GitHub no está disponible.')
        }

        return {
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            callbackUrl,
            clientId,
            clientSecret,
            createSearchParams: (state: string) =>
                new URLSearchParams({
                    client_id: clientId,
                    redirect_uri: callbackUrl,
                    scope: 'read:user user:email',
                    state,
                }),
        }
    }

    private async exchangeOAuthCodeForProfile(
        provider: OAuthProvider,
        code: string,
    ): Promise<NormalizedOAuthProfile> {
        if (provider === OAuthProvider.GOOGLE) {
            return this.exchangeGoogleCodeForProfile(code)
        }

        return this.exchangeGitHubCodeForProfile(code)
    }

    private async exchangeGoogleCodeForProfile(code: string) {
        const providerConfig = this.getOAuthProviderConfig(OAuthProvider.GOOGLE)
        const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
            body: new URLSearchParams({
                client_id: providerConfig.clientId,
                client_secret: providerConfig.clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: providerConfig.callbackUrl,
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
        })

        const tokenData = await this.parseJsonResponse<{
            access_token?: string
        }>(tokenResponse, 'No pudimos completar el acceso con Google.')

        if (!tokenData.access_token) {
            throw new UnauthorizedError('Google no devolvió un acceso válido.')
        }

        const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        })
        const profile = await this.parseJsonResponse<{
            email?: string
            email_verified?: boolean
            family_name?: string
            given_name?: string
            name?: string
            picture?: string
            sub?: string
        }>(profileResponse, 'No pudimos leer tu perfil de Google.')

        if (!profile.sub || !profile.email) {
            throw new UnauthorizedError('Google no devolvió los datos de tu perfil.')
        }

        const splitName = this.splitDisplayName(profile.name)

        return {
            avatarUrl: profile.picture ?? null,
            displayName: profile.name ?? null,
            email: this.normalizeEmail(profile.email),
            emailVerified: Boolean(profile.email_verified),
            firstName: profile.given_name ?? splitName.firstName,
            lastName: profile.family_name ?? splitName.lastName,
            provider: OAuthProvider.GOOGLE,
            providerAccountId: profile.sub,
        }
    }

    private async exchangeGitHubCodeForProfile(code: string) {
        const providerConfig = this.getOAuthProviderConfig(OAuthProvider.GITHUB)
        const tokenResponse = await fetch(GITHUB_TOKEN_ENDPOINT, {
            body: new URLSearchParams({
                client_id: providerConfig.clientId,
                client_secret: providerConfig.clientSecret,
                code,
                redirect_uri: providerConfig.callbackUrl,
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
        })
        const tokenData = await this.parseJsonResponse<{
            access_token?: string
        }>(tokenResponse, 'No pudimos completar el acceso con GitHub.')

        if (!tokenData.access_token) {
            throw new UnauthorizedError('GitHub no devolvió un acceso válido.')
        }

        const headers = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'FinTrack-OS',
        }
        const profileResponse = await fetch(GITHUB_USER_ENDPOINT, { headers })
        const profile = await this.parseJsonResponse<{
            avatar_url?: string
            email?: string | null
            id?: number
            login?: string
            name?: string | null
        }>(profileResponse, 'No pudimos leer tu perfil de GitHub.')

        if (!profile.id) {
            throw new UnauthorizedError('GitHub no devolvió los datos de tu perfil.')
        }

        let email = profile.email ? this.normalizeEmail(profile.email) : ''
        let emailVerified = Boolean(profile.email)

        if (!email) {
            const emailsResponse = await fetch(GITHUB_EMAILS_ENDPOINT, { headers })
            const emails = await this.parseJsonResponse<
                Array<{
                    email: string
                    primary: boolean
                    verified: boolean
                }>
            >(emailsResponse, 'No pudimos leer tu correo de GitHub.')
            const primaryVerifiedEmail =
                emails.find((entry) => entry.primary && entry.verified) ??
                emails.find((entry) => entry.verified)

            if (!primaryVerifiedEmail) {
                throw new ForbiddenError(
                    'GitHub no devolvió un correo verificado.',
                )
            }

            email = this.normalizeEmail(primaryVerifiedEmail.email)
            emailVerified = true
        }

        const splitName = this.splitDisplayName(profile.name ?? profile.login)

        return {
            avatarUrl: profile.avatar_url ?? null,
            displayName: profile.name ?? profile.login ?? null,
            email,
            emailVerified,
            firstName: splitName.firstName,
            lastName: splitName.lastName,
            provider: OAuthProvider.GITHUB,
            providerAccountId: String(profile.id),
        }
    }

    private normalizeEmail(email: string) {
        return email.trim().toLowerCase()
    }

    private async issueAndSendEmailVerificationCode(
        user: PublicUser,
        options?: {
            code?: string
            expiresAt?: Date
            persistToken?: boolean
        },
    ): Promise<PendingEmailVerificationResult & { verificationCode?: string }> {
        const code = options?.code ?? createNumericCode(6)
        const expiresAt = options?.expiresAt ?? this.createFutureDate(env.EMAIL_VERIFICATION_TTL)

        if (options?.persistToken !== false) {
            const tokenSalt = createTokenSalt()

            await this.authRepository.issueEmailVerificationCode({
                userId: user.id,
                tokenExpiresAt: expiresAt,
                tokenHash: hashToken(code, tokenSalt),
                tokenSalt,
            })
        }

        await this.emailService.sendVerificationCodeEmail({
            code,
            email: user.email,
            expiresAt,
            firstName: user.firstName,
        })

        return {
            email: user.email,
            expiresAt,
            requiresEmailVerification: true,
            ...(env.exposeDevAuthTokens ? { verificationCode: code } : {}),
        }
    }

    private async issueAndSendPasswordResetCode(
        user: PublicUser,
        expiresAt = this.createFutureDate(env.PASSWORD_RESET_TTL),
    ) {
        const code = createNumericCode(6)
        const tokenSalt = createTokenSalt()

        await this.authRepository.issuePasswordResetCode({
            userId: user.id,
            tokenExpiresAt: expiresAt,
            tokenHash: hashToken(code, tokenSalt),
            tokenSalt,
        })

        await this.emailService.sendPasswordResetCodeEmail({
            code,
            email: user.email,
            expiresAt,
            firstName: user.firstName,
        })
    }

    private async parseJsonResponse<T>(response: globalThis.Response, message: string) {
        if (!response.ok) {
            const responseText = await response.text()
            const detail = this.extractOAuthErrorDetail(responseText)
            const fullMessage =
                env.NODE_ENV === 'production' || !detail
                    ? message
                    : `${message} ${detail}`

            throw new UnauthorizedError(fullMessage)
        }

        return (await response.json()) as T
    }

    private extractOAuthErrorDetail(responseText: string) {
        if (!responseText) {
            return null
        }

        try {
            const parsed = JSON.parse(responseText) as {
                error?: string
                error_description?: string
            }

            if (parsed.error_description) {
                return `Provider response: ${parsed.error_description}`
            }

            if (parsed.error) {
                return `Provider response: ${parsed.error}`
            }

            return responseText
        } catch {
            return responseText
        }
    }

    private splitDisplayName(value?: string | null) {
        const trimmedValue = value?.trim()

        if (!trimmedValue) {
            return {
                firstName: 'User',
                lastName: null,
            }
        }

        const [firstName, ...lastNameParts] = trimmedValue.split(/\s+/)

        return {
            firstName,
            lastName: lastNameParts.length > 0 ? lastNameParts.join(' ') : null,
        }
    }

    private toPublicUser(
        user: AuthCredentialsUser | (PublicUser & { deletedAt?: Date | null }),
    ) {
        const { deletedAt: _deletedAt, passwordHash: _passwordHash, ...publicUser } =
            user as AuthCredentialsUser & { deletedAt?: Date | null }

        return publicUser
    }
}
