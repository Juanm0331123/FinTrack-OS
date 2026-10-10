import { OAuthProvider } from '@prisma/client'
import type { Request, Response } from 'express'
import { env } from '../../config/env.ts'
import { describeError, logger } from '../../config/logger.ts'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import { AppError } from '../../utils/app-error.ts'
import {
    clearOAuthCookies,
    clearRefreshTokenCookie,
    getCookieValue,
    getOAuthIntentCookieName,
    getOAuthStateCookieName,
    getRefreshTokenFromRequest,
    setOAuthCookies,
    setRefreshTokenCookie,
} from './auth.cookies.ts'
import type {
    ChangePasswordInput,
    ConfirmEmailChangeInput,
    LoginInput,
    RegisterInput,
    RequestEmailChangeInput,
    RequestPasswordResetInput,
    ResendEmailCodeInput,
    ResetPasswordInput,
    VerifyEmailCodeInput,
    VerifyPasswordResetCodeInput,
} from './auth.schemas.ts'
import { AuthService } from './auth.service.ts'
import type { AuthenticatedSessionResult, OAuthIntent, PendingEmailVerificationResult, SessionContext } from './auth.types.ts'

function parseOAuthIntent(value: unknown): OAuthIntent {
    return value === 'register' ? 'register' : 'login'
}

function sessionContext(req: Request, deviceName?: string): SessionContext {
    return {
        deviceName: deviceName ?? null,
        ipAddress: req.clientIp ?? req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
    }
}

function actorOf(req: Request) {
    const { auth } = toAuthenticatedRequest(req)

    return { sessionId: auth.sessionId, userId: auth.user.id }
}

function sessionResponse(res: Response, result: AuthenticatedSessionResult) {
    setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenMaxAgeMs)
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).json(
        ApiResponse.success({
            accessToken: result.accessToken,
            accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
            user: result.user,
        }),
    )
}

function pendingVerificationResponse(res: Response, result: PendingEmailVerificationResult) {
    return res.status(403).json(
        ApiResponse.error('Confirma tu correo antes de iniciar sesión.', undefined, 'EMAIL_VERIFICATION_REQUIRED', {
            email: result.email,
            expiresAt: result.expiresAt.toISOString(),
            ...(result.verificationCode ? { verificationCode: result.verificationCode } : {}),
        }),
    )
}

export class AuthController {
    private readonly authService: AuthService

    constructor(authService = new AuthService()) {
        this.authService = authService
    }

    register = async (req: Request, res: Response) => {
        const result = await this.authService.register(req.body as RegisterInput)

        return res.status(201).json(ApiResponse.success(result))
    }

    verifyEmail = async (req: Request, res: Response) => {
        const body = req.body as VerifyEmailCodeInput
        const result = await this.authService.verifyEmailCode(body, sessionContext(req, body.deviceName))

        return sessionResponse(res, result)
    }

    resendEmailCode = async (req: Request, res: Response) => {
        const result = await this.authService.resendEmailCode(req.body as ResendEmailCodeInput)

        return res.status(200).json(ApiResponse.success(result))
    }

    requestPasswordReset = async (req: Request, res: Response) => {
        const result = await this.authService.requestPasswordReset(req.body as RequestPasswordResetInput)

        return res.status(200).json(ApiResponse.success(result))
    }

    verifyPasswordResetCode = async (req: Request, res: Response) => {
        const result = await this.authService.verifyPasswordResetCode(req.body as VerifyPasswordResetCodeInput)

        res.setHeader('Cache-Control', 'no-store')

        return res.status(200).json(ApiResponse.success(result))
    }

    resetPassword = async (req: Request, res: Response) => {
        const result = await this.authService.resetPassword(req.body as ResetPasswordInput)

        clearRefreshTokenCookie(res)

        return res.status(200).json(ApiResponse.success(result))
    }

    login = async (req: Request, res: Response) => {
        const body = req.body as LoginInput
        const result = await this.authService.login(body, sessionContext(req, body.deviceName))

        if ('requiresEmailVerification' in result) {
            return pendingVerificationResponse(res, result)
        }

        return sessionResponse(res, result)
    }

    refresh = async (req: Request, res: Response) => {
        const body = (req.body ?? {}) as { deviceName?: string }

        try {
            const result = await this.authService.refresh(getRefreshTokenFromRequest(req), sessionContext(req, body.deviceName))

            return sessionResponse(res, result)
        } catch (error) {
            // Una sesión inválida borra la cookie; un reintento concurrente (409) la conserva.
            if (error instanceof AppError && error.statusCode === 401) {
                clearRefreshTokenCookie(res)
            }

            throw error
        }
    }

    logout = async (req: Request, res: Response) => {
        await this.authService.logout(actorOf(req), getRefreshTokenFromRequest(req))
        clearRefreshTokenCookie(res)

        return res.status(200).json(ApiResponse.success({ loggedOut: true }))
    }

    logoutAll = async (req: Request, res: Response) => {
        await this.authService.logoutAll(actorOf(req))
        clearRefreshTokenCookie(res)

        return res.status(200).json(ApiResponse.success({ revokedAllSessions: true }))
    }

    me = async (req: Request, res: Response) => {
        const user = await this.authService.getAuthenticatedUser(actorOf(req).userId)

        return res.status(200).json(ApiResponse.success(user))
    }

    changePassword = async (req: Request, res: Response) => {
        const result = await this.authService.changePassword(actorOf(req), req.body as ChangePasswordInput)

        return res.status(200).json(ApiResponse.success(result))
    }

    requestEmailChange = async (req: Request, res: Response) => {
        const result = await this.authService.requestEmailChange(actorOf(req), req.body as RequestEmailChangeInput)

        return res.status(200).json(ApiResponse.success(result))
    }

    confirmEmailChange = async (req: Request, res: Response) => {
        const result = await this.authService.confirmEmailChange(actorOf(req), req.body as ConfirmEmailChangeInput)

        return res.status(200).json(ApiResponse.success(result))
    }

    startGoogleOAuth = (req: Request, res: Response) => this.startOAuth(req, res, OAuthProvider.GOOGLE)

    startGitHubOAuth = (req: Request, res: Response) => this.startOAuth(req, res, OAuthProvider.GITHUB)

    handleGoogleOAuthCallback = (req: Request, res: Response) => this.handleOAuthCallback(req, res, OAuthProvider.GOOGLE)

    handleGitHubOAuthCallback = (req: Request, res: Response) => this.handleOAuthCallback(req, res, OAuthProvider.GITHUB)

    private startOAuth(req: Request, res: Response, provider: OAuthProvider) {
        const result = this.authService.startOAuth(provider)

        setOAuthCookies(res, provider, result.state, parseOAuthIntent((req.query as { intent?: string }).intent))

        return res.redirect(302, result.authorizationUrl)
    }

    // El resultado vuelve al frontend en el fragmento de la URL, nunca con tokens: si el acceso
    // terminó, la cookie de refresh ya quedó fijada y el frontend obtiene el access token con
    // /auth/refresh. Así ningún token aparece en URLs, historial ni logs.
    private async handleOAuthCallback(req: Request, res: Response, provider: OAuthProvider) {
        const query = req.query as { code?: string; error?: string; state?: string }
        const intent = parseOAuthIntent(getCookieValue(req, getOAuthIntentCookieName(provider)))
        const providerName = provider.toLowerCase()

        clearOAuthCookies(res, provider)

        if (query.error) {
            return res.redirect(
                302,
                this.frontendCallbackUrl({
                    code: 'OAUTH_CALLBACK_ERROR',
                    intent,
                    message: 'Cancelaste o no autorizaste el acceso con el proveedor.',
                    provider: providerName,
                    status: 'error',
                }),
            )
        }

        try {
            const result = await this.authService.handleOAuthCallback(
                {
                    code: query.code ?? '',
                    intent,
                    provider,
                    state: query.state ?? '',
                    storedState: getCookieValue(req, getOAuthStateCookieName(provider)),
                },
                sessionContext(req, `${providerName}-oauth`),
            )

            if ('requiresEmailVerification' in result) {
                return res.redirect(
                    302,
                    this.frontendCallbackUrl({
                        email: result.email,
                        expiresAt: result.expiresAt.toISOString(),
                        intent,
                        provider: providerName,
                        status: 'pending_verification',
                        verificationCode: result.verificationCode,
                    }),
                )
            }

            setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenMaxAgeMs)

            return res.redirect(302, this.frontendCallbackUrl({ intent, provider: providerName, status: 'success' }))
        } catch (error) {
            const appError = error instanceof AppError ? error : null

            if (!appError || appError.statusCode >= 500) {
                logger.error('oauth_callback_failed', { ...describeError(error), provider: providerName })
            }

            return res.redirect(
                302,
                this.frontendCallbackUrl({
                    code: appError?.code ?? 'OAUTH_CALLBACK_ERROR',
                    intent,
                    message: appError?.message ?? 'No pudimos completar el inicio de sesión. Intenta de nuevo.',
                    provider: providerName,
                    status: 'error',
                }),
            )
        }
    }

    private frontendCallbackUrl(params: Record<string, string | undefined>) {
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
