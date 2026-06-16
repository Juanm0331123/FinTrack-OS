import { OAuthProvider } from '@prisma/client'
import type { Request, Response } from 'express'
import { env } from '../../config/env.ts'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import { AppError } from '../../utils/app-error.ts'
import {
    clearOAuthIntentCookie,
    clearOAuthStateCookie,
    clearRefreshTokenCookie,
    getCookieValue,
    getOAuthIntentCookieName,
    getOAuthStateCookieName,
    getRefreshTokenFromRequest,
    setOAuthIntentCookie,
    setOAuthStateCookie,
    setRefreshTokenCookie,
} from './auth.cookies.ts'
import {
    loginSchema,
    logoutSchema,
    oauthCallbackSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
    resendEmailCodeSchema,
    refreshSessionSchema,
    registerSchema,
    verifyEmailSchema,
    verifyPasswordResetCodeSchema,
} from './auth.schemas.ts'
import { AuthService } from './auth.service.ts'

function parseOAuthIntent(value: unknown) {
    return value === 'register' ? 'register' : 'login'
}

export class AuthController {
    private readonly authService: AuthService

    constructor(authService = new AuthService()) {
        this.authService = authService
    }

    register = async (req: Request, res: Response) => {
        const body = registerSchema.shape.body.parse(req.body)
        const result = await this.authService.register(body)

        return res.status(201).json(ApiResponse.success(result))
    }

    verifyEmail = async (req: Request, res: Response) => {
        const body = verifyEmailSchema.shape.body.parse(req.body)
        const result = await this.authService.verifyEmailCode(body, {
            deviceName: body.deviceName,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
        })

        setRefreshTokenCookie(
            res,
            result.refreshToken,
            result.refreshTokenMaxAgeMs,
        )

        return res.status(200).json(
            ApiResponse.success({
                accessToken: result.accessToken,
                accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
                user: result.user,
            }),
        )
    }

    resendEmailCode = async (req: Request, res: Response) => {
        const body = resendEmailCodeSchema.shape.body.parse(req.body)
        const result = await this.authService.resendEmailCode(body)

        return res.status(200).json(ApiResponse.success(result))
    }

    requestPasswordReset = async (req: Request, res: Response) => {
        const body = requestPasswordResetSchema.shape.body.parse(req.body)
        const result = await this.authService.requestPasswordReset(body)

        return res.status(200).json(ApiResponse.success(result))
    }

    verifyPasswordResetCode = async (req: Request, res: Response) => {
        const body = verifyPasswordResetCodeSchema.shape.body.parse(req.body)
        const result = await this.authService.verifyPasswordResetCode(body)

        return res.status(200).json(ApiResponse.success(result))
    }

    resetPassword = async (req: Request, res: Response) => {
        const body = resetPasswordSchema.shape.body.parse(req.body)
        const result = await this.authService.resetPassword(body)

        return res.status(200).json(ApiResponse.success(result))
    }

    login = async (req: Request, res: Response) => {
        const body = loginSchema.shape.body.parse(req.body)
        const result = await this.authService.login(body, {
            deviceName: body.deviceName,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') ?? null,
        })

        if ('requiresEmailVerification' in result) {
            return res.status(403).json(
                ApiResponse.error(
                    'Please verify your email address before signing in.',
                    undefined,
                    'EMAIL_VERIFICATION_REQUIRED',
                    {
                        email: result.email,
                        expiresAt: result.expiresAt.toISOString(),
                        ...(Object.hasOwn(result, 'verificationCode')
                            ? {
                                  verificationCode: (
                                      result as {
                                          verificationCode?: string
                                      }
                                  ).verificationCode,
                              }
                            : {}),
                    },
                ),
            )
        }

        setRefreshTokenCookie(
            res,
            result.refreshToken,
            result.refreshTokenMaxAgeMs,
        )

        return res.status(200).json(
            ApiResponse.success({
                accessToken: result.accessToken,
                accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
                user: result.user,
            }),
        )
    }

    refresh = async (req: Request, res: Response) => {
        const body = refreshSessionSchema.shape.body.parse(req.body ?? {})
        const refreshToken =
            body.refreshToken ??
            getRefreshTokenFromRequest(req) ??
            req.get('x-refresh-token') ??
            undefined
        const result = await this.authService.refresh(
            {
                deviceName: body.deviceName,
                refreshToken,
            },
            {
                deviceName: body.deviceName,
                ipAddress: req.ip,
                userAgent: req.get('user-agent') ?? null,
            },
        )

        setRefreshTokenCookie(
            res,
            result.refreshToken,
            result.refreshTokenMaxAgeMs,
        )

        return res.status(200).json(
            ApiResponse.success({
                accessToken: result.accessToken,
                accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
                user: result.user,
            }),
        )
    }

    logout = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = logoutSchema.shape.body.parse(req.body ?? {})
        const userId = authenticatedRequest.auth.user.id

        await this.authService.logout(
            userId,
            body.refreshToken ??
                getRefreshTokenFromRequest(authenticatedRequest) ??
                authenticatedRequest.get('x-refresh-token') ??
                undefined,
        )
        clearRefreshTokenCookie(res)

        return res.status(200).json(ApiResponse.success({ loggedOut: true }))
    }

    logoutAll = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const userId = authenticatedRequest.auth.user.id
        await this.authService.logoutAll(userId)
        clearRefreshTokenCookie(res)

        return res.status(200).json(
            ApiResponse.success({ revokedAllSessions: true }),
        )
    }

    me = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const userId = authenticatedRequest.auth.user.id
        const user = await this.authService.getAuthenticatedUser(userId)

        return res.status(200).json(ApiResponse.success(user))
    }

    startGoogleOAuth = async (req: Request, res: Response) => {
        const result = await this.authService.startOAuth(OAuthProvider.GOOGLE)
        const intent = parseOAuthIntent(req.query.intent)

        setOAuthStateCookie(res, OAuthProvider.GOOGLE, result.state)
        setOAuthIntentCookie(res, OAuthProvider.GOOGLE, intent)

        return res.redirect(302, result.authorizationUrl)
    }

    startGitHubOAuth = async (req: Request, res: Response) => {
        const result = await this.authService.startOAuth(OAuthProvider.GITHUB)
        const intent = parseOAuthIntent(req.query.intent)

        setOAuthStateCookie(res, OAuthProvider.GITHUB, result.state)
        setOAuthIntentCookie(res, OAuthProvider.GITHUB, intent)

        return res.redirect(302, result.authorizationUrl)
    }

    handleGoogleOAuthCallback = async (req: Request, res: Response) => {
        return this.handleOAuthCallback(req, res, OAuthProvider.GOOGLE, 'google-oauth')
    }

    handleGitHubOAuthCallback = async (req: Request, res: Response) => {
        return this.handleOAuthCallback(req, res, OAuthProvider.GITHUB, 'github-oauth')
    }

    private async handleOAuthCallback(
        req: Request,
        res: Response,
        provider: OAuthProvider,
        deviceName: string,
    ) {
        const query = oauthCallbackSchema.shape.query.parse(req.query)

        if (query.error) {
            const intent = parseOAuthIntent(
                getCookieValue(req, getOAuthIntentCookieName(provider)),
            )
            clearOAuthStateCookie(res, provider)
            clearOAuthIntentCookie(res, provider)

            return res.redirect(
                302,
                this.buildFrontendOAuthRedirectUrl({
                    code: 'OAUTH_CALLBACK_ERROR',
                    intent,
                    message:
                        query.error_description ??
                        `${provider} OAuth failed: ${query.error}.`,
                    provider: provider.toLowerCase(),
                    status: 'error',
                }),
            )
        }

        const storedState = getCookieValue(
            req,
            getOAuthStateCookieName(provider),
        )
        const storedIntent = parseOAuthIntent(
            getCookieValue(req, getOAuthIntentCookieName(provider)),
        )

        try {
            const result = await this.authService.handleOAuthCallback({
                code: query.code!,
                deviceName,
                intent: storedIntent,
                ipAddress: req.ip,
                provider,
                state: query.state!,
                storedState,
                userAgent: req.get('user-agent') ?? null,
            })

            clearOAuthStateCookie(res, provider)
            clearOAuthIntentCookie(res, provider)

            if ('requiresEmailVerification' in result) {
                return res.redirect(
                    302,
                    this.buildFrontendOAuthRedirectUrl({
                        email: result.email,
                        expiresAt: result.expiresAt.toISOString(),
                        intent: storedIntent,
                        provider: provider.toLowerCase(),
                        status: 'pending_verification',
                        ...(Object.hasOwn(result, 'verificationCode')
                            ? {
                                  verificationCode: (
                                      result as {
                                          verificationCode?: string
                                      }
                                  ).verificationCode,
                              }
                            : {}),
                    }),
                )
            }

            setRefreshTokenCookie(
                res,
                result.refreshToken,
                result.refreshTokenMaxAgeMs,
            )

            return res.redirect(
                302,
                this.buildFrontendOAuthRedirectUrl({
                    accessToken: result.accessToken,
                    accessTokenExpiresInSeconds: String(
                        result.accessTokenExpiresInSeconds,
                    ),
                    intent: storedIntent,
                    provider: provider.toLowerCase(),
                    status: 'success',
                    user: JSON.stringify(result.user),
                }),
            )
        } catch (error) {
            clearOAuthStateCookie(res, provider)
            clearOAuthIntentCookie(res, provider)

            return res.redirect(
                302,
                this.buildFrontendOAuthRedirectUrl({
                    code:
                        error instanceof AppError && error.code
                            ? error.code
                            : 'OAUTH_CALLBACK_ERROR',
                    expiresAt:
                        error instanceof AppError &&
                        typeof error.details?.expiresAt === 'string'
                            ? error.details.expiresAt
                            : undefined,
                    intent: storedIntent,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'OAuth authentication failed.',
                    ...(error instanceof AppError &&
                    typeof error.details?.email === 'string'
                        ? { email: error.details.email }
                        : {}),
                    provider: provider.toLowerCase(),
                    status: 'error',
                }),
            )
        }
    }

    private buildFrontendOAuthRedirectUrl(
        params: Record<string, string | undefined>,
    ) {
        const redirectUrl = new URL('/auth/oauth/callback', env.frontendAppUrl)
        const hashParams = new URLSearchParams()

        for (const [key, value] of Object.entries(params)) {
            if (value) {
                hashParams.set(key, value)
            }
        }

        redirectUrl.hash = hashParams.toString()
        return redirectUrl.toString()
    }
}
