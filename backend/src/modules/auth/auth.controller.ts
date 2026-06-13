import { OAuthProvider } from '@prisma/client'
import type { Request, Response } from 'express'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import { RequestValidationError } from '../../utils/app-error.ts'
import {
    clearOAuthStateCookie,
    clearRefreshTokenCookie,
    getCookieValue,
    getOAuthStateCookieName,
    getRefreshTokenFromRequest,
    setOAuthStateCookie,
    setRefreshTokenCookie,
} from './auth.cookies.ts'
import {
    loginSchema,
    logoutSchema,
    oauthCallbackSchema,
    refreshSessionSchema,
    registerSchema,
    verifyEmailSchema,
} from './auth.schemas.ts'
import { AuthService } from './auth.service.ts'

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
        const user = await this.authService.verifyEmail(body.token)

        return res.status(200).json(ApiResponse.success(user))
    }

    login = async (req: Request, res: Response) => {
        const body = loginSchema.shape.body.parse(req.body)
        const result = await this.authService.login(body, {
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

    startGoogleOAuth = async (_req: Request, res: Response) => {
        const result = await this.authService.startOAuth(OAuthProvider.GOOGLE)

        setOAuthStateCookie(res, OAuthProvider.GOOGLE, result.state)

        return res.redirect(302, result.authorizationUrl)
    }

    startGitHubOAuth = async (_req: Request, res: Response) => {
        const result = await this.authService.startOAuth(OAuthProvider.GITHUB)

        setOAuthStateCookie(res, OAuthProvider.GITHUB, result.state)

        return res.redirect(302, result.authorizationUrl)
    }

    handleGoogleOAuthCallback = async (req: Request, res: Response) => {
        const query = oauthCallbackSchema.shape.query.parse(req.query)

        if (query.error) {
            throw new RequestValidationError(
                query.error_description ?? `Google OAuth failed: ${query.error}.`,
            )
        }

        const storedState = getCookieValue(
            req,
            getOAuthStateCookieName(OAuthProvider.GOOGLE),
        )
        const result = await this.authService.handleOAuthCallback({
            code: query.code!,
            deviceName: 'google-oauth',
            ipAddress: req.ip,
            provider: OAuthProvider.GOOGLE,
            state: query.state!,
            storedState,
            userAgent: req.get('user-agent') ?? null,
        })

        clearOAuthStateCookie(res, OAuthProvider.GOOGLE)
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

    handleGitHubOAuthCallback = async (req: Request, res: Response) => {
        const query = oauthCallbackSchema.shape.query.parse(req.query)

        if (query.error) {
            throw new RequestValidationError(
                query.error_description ?? `GitHub OAuth failed: ${query.error}.`,
            )
        }

        const storedState = getCookieValue(
            req,
            getOAuthStateCookieName(OAuthProvider.GITHUB),
        )
        const result = await this.authService.handleOAuthCallback({
            code: query.code!,
            deviceName: 'github-oauth',
            ipAddress: req.ip,
            provider: OAuthProvider.GITHUB,
            state: query.state!,
            storedState,
            userAgent: req.get('user-agent') ?? null,
        })

        clearOAuthStateCookie(res, OAuthProvider.GITHUB)
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
}
