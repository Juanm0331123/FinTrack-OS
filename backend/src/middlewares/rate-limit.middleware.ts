import { createHash } from 'node:crypto'
import type { Request, Response } from 'express'
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit'
import { env } from '../config/env.ts'
import { createSharedStore } from '../config/rate-limit-store.ts'
import { ApiResponse } from '../utils/api-response.ts'

// Presupuestos separados por operación (ver docs/qa-backend-remediacion.md, rate limiting):
// - Perímetro (memoria por réplica): corta abuso barato antes de autenticar o tocar la base.
// - Autenticación y correo (PostgreSQL compartido): fuerza bruta e envío de correos, por IP y por
//   cuenta, coherentes entre réplicas y reinicios.
// - Finanzas (memoria por réplica, por usuario): cuotas funcionales de lectura y escritura.
// Los límites por IP son amplios para no castigar NAT; los dirigidos a una cuenta son estrictos.

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

type LimitedResponse = { code: string; message: string }

function clientKey(req: Request) {
    return ipKeyGenerator(req.clientIp ?? req.ip ?? 'unknown')
}

export function normalizedEmailKey(req: Request) {
    const email = (req.body as { email?: unknown } | undefined)?.email

    if (typeof email !== 'string' || !email.trim()) {
        return null
    }

    return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)
}

function authenticatedUserKey(req: Request) {
    return req.auth?.user.id ?? `ip:${clientKey(req)}`
}

function retryAfterSeconds(req: Request) {
    const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime

    return resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 60
}

function limitedHandler(response: LimitedResponse) {
    return (req: Request, res: Response) => {
        const seconds = retryAfterSeconds(req)

        res.setHeader('Retry-After', String(seconds))

        return res
            .status(429)
            .json(ApiResponse.error(response.message, undefined, response.code, { retryAfterSeconds: seconds }))
    }
}

function createLimiter(
    options: {
        key: (req: Request) => string | null
        limit: number
        name: string
        response: LimitedResponse
        shared: boolean
        windowMs: number
    } & Pick<Partial<Options>, 'requestWasSuccessful' | 'skipSuccessfulRequests'>,
) {
    return rateLimit({
        handler: limitedHandler(options.response),
        identifier: options.name,
        keyGenerator: (req) => options.key(req) ?? 'none',
        legacyHeaders: false,
        limit: options.limit,
        requestWasSuccessful: options.requestWasSuccessful,
        skip: (req) => options.key(req) === null,
        skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
        standardHeaders: 'draft-8',
        ...(options.shared ? { store: createSharedStore(options.name) } : {}),
        windowMs: options.windowMs,
    })
}

const TOO_MANY_REQUESTS: LimitedResponse = {
    code: 'RATE_LIMITED',
    message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
}

const AUTH_LIMITED: LimitedResponse = {
    code: 'AUTH_RATE_LIMITED',
    message: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
}

const EMAIL_LIMITED: LimitedResponse = {
    code: 'EMAIL_RATE_LIMITED',
    message: 'Ya enviamos un código hace poco. Espera un momento antes de pedir otro.',
}

export const perimeterRateLimiter = createLimiter({
    key: (req) => (req.path.startsWith('/health') ? null : clientKey(req)),
    limit: env.API_RATE_LIMIT_MAX,
    name: 'perimeter',
    response: TOO_MANY_REQUESTS,
    shared: false,
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
})

// Corta clientes que insisten con credenciales inválidas antes de verificar JWT o consultar la base.
export const invalidCredentialRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_RATE_LIMIT_MAX * 2,
    name: 'invalid-bearer',
    requestWasSuccessful: (_req, res) => res.statusCode !== 401,
    response: AUTH_LIMITED,
    shared: false,
    skipSuccessfulRequests: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const financeReadRateLimiter = createLimiter({
    key: (req) => (req.method === 'GET' ? authenticatedUserKey(req) : null),
    limit: env.FINANCE_READ_RATE_LIMIT_MAX,
    name: 'finance-read',
    response: {
        code: 'RATE_LIMITED',
        message: 'Estás recargando tu información muy seguido. Espera un momento y reintenta.',
    },
    shared: false,
    windowMs: env.FINANCE_RATE_LIMIT_WINDOW_MS,
})

export const financeWriteRateLimiter = createLimiter({
    key: (req) => (req.method === 'GET' ? null : authenticatedUserKey(req)),
    limit: env.FINANCE_RATE_LIMIT_MAX,
    name: 'finance-write',
    response: {
        code: 'RATE_LIMITED',
        message: 'Estás guardando demasiados cambios seguidos. Espera un momento y reintenta.',
    },
    shared: false,
    windowMs: env.FINANCE_RATE_LIMIT_WINDOW_MS,
})

export const loginIpRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_RATE_LIMIT_MAX,
    name: 'login-ip',
    response: AUTH_LIMITED,
    shared: true,
    skipSuccessfulRequests: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const loginAccountRateLimiter = createLimiter({
    key: normalizedEmailKey,
    limit: env.AUTH_ACCOUNT_RATE_LIMIT_MAX,
    name: 'login-account',
    response: AUTH_LIMITED,
    shared: true,
    skipSuccessfulRequests: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const codeVerificationRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_RATE_LIMIT_MAX,
    name: 'code-ip',
    response: AUTH_LIMITED,
    shared: true,
    skipSuccessfulRequests: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const registerRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_REGISTER_HOURLY_MAX,
    name: 'register-ip',
    response: AUTH_LIMITED,
    shared: true,
    windowMs: HOUR,
})

export const emailCooldownRateLimiter = createLimiter({
    key: normalizedEmailKey,
    limit: 1,
    name: 'email-cooldown',
    response: EMAIL_LIMITED,
    shared: true,
    windowMs: env.AUTH_EMAIL_COOLDOWN_MS,
})

export const emailHourlyRateLimiter = createLimiter({
    key: normalizedEmailKey,
    limit: env.AUTH_EMAIL_HOURLY_MAX,
    name: 'email-hourly',
    response: EMAIL_LIMITED,
    shared: true,
    windowMs: HOUR,
})

export const emailSenderIpRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_EMAIL_HOURLY_MAX * 6,
    name: 'email-ip',
    response: EMAIL_LIMITED,
    shared: true,
    windowMs: HOUR,
})

export const refreshRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_REFRESH_RATE_LIMIT_MAX,
    name: 'refresh-ip',
    response: AUTH_LIMITED,
    shared: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const oauthRateLimiter = createLimiter({
    key: clientKey,
    limit: env.AUTH_RATE_LIMIT_MAX * 2,
    name: 'oauth-ip',
    response: AUTH_LIMITED,
    shared: true,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
})

export const credentialChangeRateLimiter = createLimiter({
    key: authenticatedUserKey,
    limit: env.AUTH_ACCOUNT_RATE_LIMIT_MAX,
    name: 'credential-change',
    response: AUTH_LIMITED,
    shared: true,
    skipSuccessfulRequests: true,
    windowMs: HOUR,
})
