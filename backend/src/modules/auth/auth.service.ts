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
import {
    createOpaqueToken,
    hashToken,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from './auth.tokens.ts'
import type {
    LoginInput,
    RefreshSessionInput,
    RegisterInput,
} from './auth.schemas.ts'
import type {
    AuthCredentialsUser,
    NormalizedOAuthProfile,
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

    constructor(authRepository = new AuthRepository()) {
        this.authRepository = authRepository
    }

    async register(input: RegisterInput) {
        const email = this.normalizeEmail(input.email)
        const existingUser = await this.authRepository.findUserByEmailForAuth(email)

        if (existingUser) {
            throw new ConflictError('An account with that email already exists.')
        }

        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)
        const verificationToken = createOpaqueToken()
        const verificationTokenHash = hashToken(verificationToken)
        const verificationExpiresAt = this.createFutureDate(env.EMAIL_VERIFICATION_TTL)
        const user = await this.authRepository.createRegisteredUser({
            tokenExpiresAt: verificationExpiresAt,
            tokenHash: verificationTokenHash,
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

        return {
            requiresEmailVerification: true,
            user,
            ...(env.exposeDevAuthTokens ? { verificationToken } : {}),
        }
    }

    async verifyEmail(token: string) {
        const tokenHash = hashToken(token)
        const verificationRecord =
            await this.authRepository.findEmailVerificationToken(tokenHash)

        if (!verificationRecord || verificationRecord.user.deletedAt) {
            throw new UnauthorizedError('Invalid email verification token.')
        }

        if (verificationRecord.usedAt) {
            throw new UnauthorizedError('Email verification token has already been used.')
        }

        if (verificationRecord.expiresAt.getTime() <= Date.now()) {
            throw new UnauthorizedError('Email verification token has expired.')
        }

        return this.authRepository.activateUserAndConsumeVerificationToken(
            verificationRecord.id,
            verificationRecord.userId,
        )
    }

    async login(input: LoginInput, sessionContext: SessionContext) {
        const email = this.normalizeEmail(input.email)
        const user = await this.authRepository.findUserByEmailForAuth(email)

        if (!user) {
            throw new UnauthorizedError('Invalid email or password.')
        }

        const passwordMatches = await bcrypt.compare(
            input.password,
            user.passwordHash,
        )

        if (!passwordMatches) {
            throw new UnauthorizedError('Invalid email or password.')
        }

        this.assertUserCanUsePasswordLogin(user)

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
            throw new UnauthorizedError('Refresh token is required.')
        }

        const refreshTokenRecord = await this.authRepository.findRefreshTokenByHash(
            hashToken(rawRefreshToken),
        )

        if (!refreshTokenRecord) {
            throw new UnauthorizedError('Invalid refresh token.')
        }

        if (refreshTokenRecord.revokedAt) {
            await this.authRepository.revokeAllRefreshTokens(refreshTokenRecord.userId)
            throw new UnauthorizedError('Refresh token has been revoked.')
        }

        if (refreshTokenRecord.expiresAt.getTime() <= Date.now()) {
            await this.authRepository.revokeRefreshTokenById(refreshTokenRecord.id)
            throw new UnauthorizedError('Refresh token has expired.')
        }

        const tokenClaims = await verifyRefreshToken(rawRefreshToken)

        if (
            tokenClaims.sessionId !== refreshTokenRecord.id ||
            tokenClaims.userId !== refreshTokenRecord.userId ||
            tokenClaims.tokenType !== 'refresh'
        ) {
            await this.authRepository.revokeAllRefreshTokens(refreshTokenRecord.userId)
            throw new UnauthorizedError('Invalid refresh token.')
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
            throw new UnauthorizedError('Authenticated user was not found.')
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
        provider: OAuthProvider
        state: string
        storedState?: string
    } & SessionContext) {
        if (!input.storedState || input.state !== input.storedState) {
            throw new UnauthorizedError('Invalid OAuth state.')
        }

        const profile = await this.exchangeOAuthCodeForProfile(
            input.provider,
            input.code,
        )

        if (!profile.emailVerified) {
            throw new ForbiddenError(
                'The OAuth provider did not return a verified email address.',
            )
        }

        const existingOAuthAccount = await this.authRepository.findOAuthAccount(
            profile.provider,
            profile.providerAccountId,
        )

        let user: PublicUser

        if (existingOAuthAccount) {
            this.assertUserCanStartSession(existingOAuthAccount.user)
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
                    throw new ForbiddenError('This user account is inactive.')
                }

                user = await this.authRepository.linkOAuthAccountToUser(
                    existingUser.id,
                    profile,
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
            throw new UnauthorizedError('This user account is no longer available.')
        }

        if (user.status === UserStatus.PENDING_VERIFICATION) {
            throw new ForbiddenError('Please verify your email address before signing in.')
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new ForbiddenError('This user account is inactive.')
        }
    }

    private assertUserCanUsePasswordLogin(user: AuthCredentialsUser) {
        this.assertUserCanStartSession(user)
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
            if (
                !env.GOOGLE_OAUTH_CLIENT_ID ||
                !env.GOOGLE_OAUTH_CLIENT_SECRET ||
                !env.GOOGLE_OAUTH_CALLBACK_URL
            ) {
                throw new ServiceUnavailableError(
                    'Google OAuth is not configured.',
                )
            }

            return {
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                callbackUrl: env.GOOGLE_OAUTH_CALLBACK_URL,
                clientId: env.GOOGLE_OAUTH_CLIENT_ID,
                clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
                createSearchParams: (state: string) =>
                    new URLSearchParams({
                        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
                        redirect_uri: env.GOOGLE_OAUTH_CALLBACK_URL,
                        response_type: 'code',
                        scope: 'openid email profile',
                        state,
                    }),
            }
        }

        if (
            !env.GITHUB_OAUTH_CLIENT_ID ||
            !env.GITHUB_OAUTH_CLIENT_SECRET ||
            !env.GITHUB_OAUTH_CALLBACK_URL
        ) {
            throw new ServiceUnavailableError('GitHub OAuth is not configured.')
        }

        return {
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            callbackUrl: env.GITHUB_OAUTH_CALLBACK_URL,
            clientId: env.GITHUB_OAUTH_CLIENT_ID,
            clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
            createSearchParams: (state: string) =>
                new URLSearchParams({
                    client_id: env.GITHUB_OAUTH_CLIENT_ID,
                    redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
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
        }>(tokenResponse, 'Google token exchange failed.')

        if (!tokenData.access_token) {
            throw new UnauthorizedError('Google did not return an access token.')
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
        }>(profileResponse, 'Google user profile fetch failed.')

        if (!profile.sub || !profile.email) {
            throw new UnauthorizedError('Google did not return a usable profile.')
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
        }>(tokenResponse, 'GitHub token exchange failed.')

        if (!tokenData.access_token) {
            throw new UnauthorizedError('GitHub did not return an access token.')
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
        }>(profileResponse, 'GitHub user profile fetch failed.')

        if (!profile.id) {
            throw new UnauthorizedError('GitHub did not return a usable profile.')
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
            >(emailsResponse, 'GitHub email lookup failed.')
            const primaryVerifiedEmail =
                emails.find((entry) => entry.primary && entry.verified) ??
                emails.find((entry) => entry.verified)

            if (!primaryVerifiedEmail) {
                throw new ForbiddenError(
                    'GitHub did not return a verified email address.',
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
