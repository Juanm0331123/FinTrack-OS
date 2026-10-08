import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { env } from '../config/env.ts'
import { ApiResponse } from '../utils/api-response.ts'

export const apiRateLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.API_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
    skip: (req) => req.path === '/health' || req.path.startsWith('/finance/'),
    handler: (_req, res) => {
        return res.status(429).json(
            ApiResponse.error(
                'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
                undefined,
                'RATE_LIMITED',
            ),
        )
    },
})

export const financeRateLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.FINANCE_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    windowMs: env.FINANCE_RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) =>
        (req as { auth?: { user: { id: string } } }).auth?.user.id ??
        ipKeyGenerator(req.ip ?? ''),
    handler: (_req, res) => {
        return res.status(429).json(
            ApiResponse.error(
                'Estás guardando demasiados cambios seguidos. Espera un momento y reintenta.',
                undefined,
                'RATE_LIMITED',
            ),
        )
    },
})

export const authRateLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.AUTH_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    handler: (_req, res) => {
        return res.status(429).json(
            ApiResponse.error(
                'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
                undefined,
                'AUTH_RATE_LIMITED',
            ),
        )
    },
})
