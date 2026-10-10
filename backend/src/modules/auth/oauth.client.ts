import { OAuthProvider } from '@prisma/client'
import { z } from 'zod'
import { env } from '../../config/env.ts'
import { logger } from '../../config/logger.ts'
import { metrics, type Dependency } from '../../config/metrics.ts'
import {
    BadGatewayError,
    ForbiddenError,
    ServiceUnavailableError,
    UnauthorizedError,
} from '../../utils/app-error.ts'
import type { NormalizedOAuthProfile } from './auth.types.ts'

// Frontera con Google y GitHub: cada llamada tiene plazo propio, su respuesta se valida en
// runtime y los fallos se clasifican. El canje del código no se reintenta: es de un solo uso.

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

const tokenResponseSchema = z.object({ access_token: z.string().min(1) })

const googleProfileSchema = z.object({
    email: z.email(),
    email_verified: z.union([z.boolean(), z.literal('true'), z.literal('false')]),
    family_name: z.string().max(200).optional(),
    given_name: z.string().max(200).optional(),
    name: z.string().max(300).optional(),
    picture: z.url().max(2000).optional(),
    sub: z.string().min(1).max(255),
})

const githubProfileSchema = z.object({
    avatar_url: z.url().max(2000).nullish(),
    id: z.number().int().positive(),
    login: z.string().min(1).max(255),
    name: z.string().max(300).nullish(),
})

const githubEmailsSchema = z
    .array(z.object({ email: z.email(), primary: z.boolean(), verified: z.boolean() }))
    .max(100)

type ProviderConfig = {
    callbackUrl: string
    clientId: string
    clientSecret: string
}

function providerConfig(provider: OAuthProvider): ProviderConfig {
    const config =
        provider === OAuthProvider.GOOGLE
            ? {
                  callbackUrl: env.GOOGLE_OAUTH_CALLBACK_URL,
                  clientId: env.GOOGLE_OAUTH_CLIENT_ID,
                  clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
              }
            : {
                  callbackUrl: env.GITHUB_OAUTH_CALLBACK_URL,
                  clientId: env.GITHUB_OAUTH_CLIENT_ID,
                  clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
              }

    if (!config.callbackUrl || !config.clientId || !config.clientSecret) {
        throw new ServiceUnavailableError(
            `El acceso con ${provider === OAuthProvider.GOOGLE ? 'Google' : 'GitHub'} no está disponible.`,
            'OAUTH_PROVIDER_NOT_CONFIGURED',
        )
    }

    return config as ProviderConfig
}

function dependencyOf(provider: OAuthProvider): Dependency {
    return provider === OAuthProvider.GOOGLE ? 'oauth_google' : 'oauth_github'
}

function providerName(provider: OAuthProvider) {
    return provider === OAuthProvider.GOOGLE ? 'Google' : 'GitHub'
}

async function callProvider<T>(
    provider: OAuthProvider,
    step: string,
    url: string,
    init: RequestInit,
    schema: z.ZodType<T>,
): Promise<T> {
    let response: Response

    try {
        response = await fetch(url, { ...init, signal: AbortSignal.timeout(env.OAUTH_HTTP_TIMEOUT_MS) })
    } catch (error) {
        const timedOut = (error as Error).name === 'TimeoutError'

        metrics.recordDependencyError(dependencyOf(provider), timedOut ? `${step}_timeout` : `${step}_network`)
        logger.warn('oauth_provider_unreachable', { provider, step, timedOut })

        throw new ServiceUnavailableError(
            `${providerName(provider)} no respondió a tiempo. Intenta de nuevo en unos minutos.`,
            timedOut ? 'OAUTH_PROVIDER_TIMEOUT' : 'OAUTH_PROVIDER_UNAVAILABLE',
        )
    }

    if (!response.ok) {
        await response.body?.cancel()
        metrics.recordDependencyError(dependencyOf(provider), `${step}_http_${response.status}`)
        logger.warn('oauth_provider_rejected', { provider, status: response.status, step })

        if (response.status >= 500) {
            throw new ServiceUnavailableError(
                `${providerName(provider)} no está disponible en este momento. Intenta de nuevo más tarde.`,
                'OAUTH_PROVIDER_UNAVAILABLE',
            )
        }

        throw new UnauthorizedError(
            `No pudimos completar el acceso con ${providerName(provider)}. Intenta de nuevo.`,
            'OAUTH_CODE_REJECTED',
        )
    }

    let body: unknown

    try {
        body = await response.json()
    } catch {
        body = undefined
    }

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
        metrics.recordDependencyError(dependencyOf(provider), `${step}_invalid_response`)
        logger.warn('oauth_provider_invalid_response', {
            issues: parsed.error.issues.map((issue) => issue.path.join('.')),
            provider,
            step,
        })

        throw new BadGatewayError(
            `${providerName(provider)} respondió de forma inesperada. Intenta de nuevo.`,
            'OAUTH_INVALID_RESPONSE',
        )
    }

    return parsed.data
}

function splitDisplayName(value?: string | null) {
    const trimmed = value?.trim()

    if (!trimmed) {
        return { firstName: 'Usuario', lastName: null }
    }

    const [firstName, ...rest] = trimmed.split(/\s+/)

    return { firstName: firstName.slice(0, 100), lastName: rest.length ? rest.join(' ').slice(0, 100) : null }
}

export class OAuthClient {
    authorizationUrl(provider: OAuthProvider, state: string) {
        const config = providerConfig(provider)
        const params =
            provider === OAuthProvider.GOOGLE
                ? new URLSearchParams({
                      client_id: config.clientId,
                      redirect_uri: config.callbackUrl,
                      response_type: 'code',
                      scope: 'openid email profile',
                      state,
                  })
                : new URLSearchParams({
                      allow_signup: 'true',
                      client_id: config.clientId,
                      redirect_uri: config.callbackUrl,
                      scope: 'read:user user:email',
                      state,
                  })

        return `${provider === OAuthProvider.GOOGLE ? GOOGLE_AUTHORIZE_URL : GITHUB_AUTHORIZE_URL}?${params}`
    }

    exchangeCode(provider: OAuthProvider, code: string) {
        return provider === OAuthProvider.GOOGLE ? this.exchangeGoogleCode(code) : this.exchangeGitHubCode(code)
    }

    private async exchangeGoogleCode(code: string): Promise<NormalizedOAuthProfile> {
        const config = providerConfig(OAuthProvider.GOOGLE)
        const token = await callProvider(
            OAuthProvider.GOOGLE,
            'token',
            GOOGLE_TOKEN_URL,
            {
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: config.callbackUrl,
                }),
                headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                method: 'POST',
            },
            tokenResponseSchema,
        )
        const profile = await callProvider(
            OAuthProvider.GOOGLE,
            'profile',
            GOOGLE_USERINFO_URL,
            { headers: { Authorization: `Bearer ${token.access_token}` } },
            googleProfileSchema,
        )

        if (profile.email_verified !== true && profile.email_verified !== 'true') {
            throw new ForbiddenError('Google no devolvió un correo verificado.', 'OAUTH_EMAIL_NOT_VERIFIED')
        }

        const split = splitDisplayName(profile.name)

        return {
            avatarUrl: profile.picture ?? null,
            displayName: profile.name ?? null,
            email: profile.email.trim().toLowerCase(),
            firstName: profile.given_name?.trim().slice(0, 100) || split.firstName,
            lastName: profile.family_name?.trim().slice(0, 100) || split.lastName,
            provider: OAuthProvider.GOOGLE,
            providerAccountId: profile.sub,
        }
    }

    private async exchangeGitHubCode(code: string): Promise<NormalizedOAuthProfile> {
        const config = providerConfig(OAuthProvider.GITHUB)
        const token = await callProvider(
            OAuthProvider.GITHUB,
            'token',
            GITHUB_TOKEN_URL,
            {
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    redirect_uri: config.callbackUrl,
                }),
                headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                method: 'POST',
            },
            tokenResponseSchema,
        )
        const headers = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token.access_token}`,
            'User-Agent': 'FinTrack-OS',
        }
        const profile = await callProvider(OAuthProvider.GITHUB, 'profile', GITHUB_USER_URL, { headers }, githubProfileSchema)
        // El correo público del perfil no prueba verificación: se usa la lista de correos con su estado.
        const emails = await callProvider(OAuthProvider.GITHUB, 'emails', GITHUB_EMAILS_URL, { headers }, githubEmailsSchema)
        const verified = emails.find((entry) => entry.primary && entry.verified) ?? emails.find((entry) => entry.verified)

        if (!verified) {
            throw new ForbiddenError('GitHub no devolvió un correo verificado.', 'OAUTH_EMAIL_NOT_VERIFIED')
        }

        const split = splitDisplayName(profile.name ?? profile.login)

        return {
            avatarUrl: profile.avatar_url ?? null,
            displayName: profile.name ?? profile.login,
            email: verified.email.trim().toLowerCase(),
            firstName: split.firstName,
            lastName: split.lastName,
            provider: OAuthProvider.GITHUB,
            providerAccountId: String(profile.id),
        }
    }
}
