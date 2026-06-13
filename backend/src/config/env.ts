import { z } from 'zod'

const rawEnvSchema = z.object({
    ALLOWED_ORIGINS: z
        .string()
        .default('http://localhost:3000,http://127.0.0.1:3000'),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    API_RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(15 * 60 * 1000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
    JSON_BODY_LIMIT: z.string().default('1mb'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    TRUST_PROXY: z.string().optional(),
    URLENCODED_BODY_LIMIT: z.string().default('1mb'),
})

function parseAllowedOrigins(value: string) {
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
}

function parseTrustProxy(value?: string) {
    if (!value) {
        return false
    }

    if (value === 'true') {
        return true
    }

    if (value === 'false') {
        return false
    }

    const numeric = Number(value)

    if (Number.isInteger(numeric) && numeric >= 0) {
        return numeric
    }

    return value
}

const parsedEnv = rawEnvSchema.parse(process.env)

export const env = {
    ...parsedEnv,
    allowedOrigins: parseAllowedOrigins(parsedEnv.ALLOWED_ORIGINS),
    trustProxy: parseTrustProxy(parsedEnv.TRUST_PROXY),
}
