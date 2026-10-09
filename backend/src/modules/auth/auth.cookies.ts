import type { CookieOptions, Request, Response } from 'express'
import { OAuthProvider } from '@prisma/client'
import { env } from '../../config/env.ts'

const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000
const MAX_COOKIE_HEADER_LENGTH = 8192

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

// Lee solo la cookie pedida y decodifica únicamente su valor. Una cookie ajena malformada
// (percent-encoding inválido) se ignora en vez de provocar un error interno.
export function getCookieValue(req: Request, name: string) {
    const header = req.headers.cookie

    if (!header || header.length > MAX_COOKIE_HEADER_LENGTH) {
        return undefined
    }

    for (const chunk of header.split(';')) {
        const separator = chunk.indexOf('=')

        if (separator === -1 || chunk.slice(0, separator).trim() !== name) {
            continue
        }

        const rawValue = chunk.slice(separator + 1).trim().replace(/^"(.*)"$/, '$1')

        try {
            return decodeURIComponent(rawValue)
        } catch {
            return undefined
        }
    }

    return undefined
}

export function getRefreshTokenFromRequest(req: Request) {
    return getCookieValue(req, env.REFRESH_TOKEN_COOKIE_NAME)
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, maxAgeMs: number) {
    res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, createCookieOptions('/api/auth', maxAgeMs))
}

export function clearRefreshTokenCookie(res: Response) {
    res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, createCookieOptions('/api/auth'))
}

export function getOAuthStateCookieName(provider: OAuthProvider) {
    return `oauth_state_${provider.toLowerCase()}`
}

export function getOAuthIntentCookieName(provider: OAuthProvider) {
    return `oauth_intent_${provider.toLowerCase()}`
}

function oauthCookiePath(provider: OAuthProvider) {
    return `/api/auth/oauth/${provider.toLowerCase()}`
}

export function setOAuthCookies(res: Response, provider: OAuthProvider, state: string, intent: 'login' | 'register') {
    res.cookie(getOAuthStateCookieName(provider), state, createCookieOptions(oauthCookiePath(provider), OAUTH_COOKIE_MAX_AGE_MS))
    res.cookie(getOAuthIntentCookieName(provider), intent, createCookieOptions(oauthCookiePath(provider), OAUTH_COOKIE_MAX_AGE_MS))
}

export function clearOAuthCookies(res: Response, provider: OAuthProvider) {
    res.clearCookie(getOAuthStateCookieName(provider), createCookieOptions(oauthCookiePath(provider)))
    res.clearCookie(getOAuthIntentCookieName(provider), createCookieOptions(oauthCookiePath(provider)))
}
