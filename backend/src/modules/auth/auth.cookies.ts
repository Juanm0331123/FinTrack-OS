import type { CookieOptions, Request, Response } from 'express'
import { OAuthProvider } from '@prisma/client'
import { env } from '../../config/env.ts'

function createCookieOptions(path: string, maxAge?: number): CookieOptions {
    return {
        domain: env.COOKIE_DOMAIN,
        httpOnly: true,
        maxAge,
        path,
        sameSite: env.COOKIE_SAME_SITE,
        secure: env.cookieSecure,
    }
}

function parseCookieHeader(cookieHeader?: string) {
    if (!cookieHeader) {
        return new Map<string, string>()
    }

    return cookieHeader.split(';').reduce((accumulator, chunk) => {
        const [name, ...valueParts] = chunk.trim().split('=')

        if (!name) {
            return accumulator
        }

        accumulator.set(name, decodeURIComponent(valueParts.join('=')))
        return accumulator
    }, new Map<string, string>())
}

export function getCookieValue(req: Request, name: string) {
    return parseCookieHeader(req.headers.cookie).get(name)
}

export function getRefreshTokenFromRequest(req: Request) {
    return getCookieValue(req, env.REFRESH_TOKEN_COOKIE_NAME)
}

export function setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    maxAgeMs: number,
) {
    res.cookie(
        env.REFRESH_TOKEN_COOKIE_NAME,
        refreshToken,
        createCookieOptions('/api/auth', maxAgeMs),
    )
}

export function clearRefreshTokenCookie(res: Response) {
    res.clearCookie(
        env.REFRESH_TOKEN_COOKIE_NAME,
        createCookieOptions('/api/auth'),
    )
}

export function getOAuthStateCookieName(provider: OAuthProvider) {
    return `oauth_state_${provider.toLowerCase()}`
}

export function setOAuthStateCookie(
    res: Response,
    provider: OAuthProvider,
    state: string,
) {
    res.cookie(
        getOAuthStateCookieName(provider),
        state,
        createCookieOptions(`/api/auth/oauth/${provider.toLowerCase()}`, 10 * 60 * 1000),
    )
}

export function clearOAuthStateCookie(res: Response, provider: OAuthProvider) {
    res.clearCookie(
        getOAuthStateCookieName(provider),
        createCookieOptions(`/api/auth/oauth/${provider.toLowerCase()}`),
    )
}
