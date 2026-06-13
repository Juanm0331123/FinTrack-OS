import rateLimit from 'express-rate-limit'
import { env } from '../config/env.ts'
import { ApiResponse } from '../utils/api-response.ts'

export const apiRateLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.API_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
    skip: (req) => req.path === '/health',
    handler: (_req, res) => {
        return res.status(429).json(
            ApiResponse.error('Too many requests. Please try again later.'),
        )
    },
})
