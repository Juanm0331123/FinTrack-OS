import { z } from 'zod'

const optionalTextValue = z
    .union([z.string().trim(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined))

const optionalUrlValue = z
    .union([z.string().trim().url(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined))

const rawEnvSchema = z.object({
    ALLOWED_ORIGINS: z
        .string()
        .default('http://localhost:3000,http://127.0.0.1:3000'),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(15 * 60 * 1000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    API_RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(15 * 60 * 1000),
    COOKIE_DOMAIN: optionalTextValue,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: z.string().default('false'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
    EMAIL_FROM: optionalTextValue,
    EMAIL_PASSWORD: optionalTextValue,
    EMAIL_PROVIDER: z.enum(['gmail', 'resend']).optional(),
    EMAIL_REPLY_TO: optionalTextValue,
    PASSWORD_RESET_SESSION_TTL: z.string().default('10m'),
    PASSWORD_RESET_TTL: z.string().default('10m'),
    EMAIL_VERIFICATION_TTL: z.string().default('10m'),
    EXPOSE_DEV_AUTH_TOKENS: z.string().optional(),
    FRONTEND_APP_URL: optionalUrlValue,
    GITHUB_OAUTH_CALLBACK_URL: optionalUrlValue,
    GITHUB_OAUTH_CLIENT_ID: optionalTextValue,
    GITHUB_OAUTH_CLIENT_SECRET: optionalTextValue,
    GOOGLE_OAUTH_CALLBACK_URL: optionalUrlValue,
    GOOGLE_OAUTH_CLIENT_ID: optionalTextValue,
    GOOGLE_OAUTH_CLIENT_SECRET: optionalTextValue,
    JSON_BODY_LIMIT: z.string().default('1mb'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    REFRESH_TOKEN_COOKIE_NAME: z.string().trim().min(1).default('refresh_token'),
    RESEND_API_KEY: optionalTextValue,
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

function parseBoolean(value: string) {
    return value === 'true'
}

const parsedEnv = rawEnvSchema.parse(process.env)
const exposeDevAuthTokens =
    parsedEnv.EXPOSE_DEV_AUTH_TOKENS !== undefined
        ? parseBoolean(parsedEnv.EXPOSE_DEV_AUTH_TOKENS)
        : parsedEnv.NODE_ENV !== 'production'

if (parsedEnv.JWT_ACCESS_SECRET === parsedEnv.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.')
}

if (parsedEnv.COOKIE_SAME_SITE === 'none' && !parseBoolean(parsedEnv.COOKIE_SECURE)) {
    throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is "none".')
}

if (parsedEnv.EMAIL_PROVIDER === 'resend' && !parsedEnv.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER is "resend".')
}

if (parsedEnv.EMAIL_PROVIDER === 'gmail' && !parsedEnv.EMAIL_PASSWORD) {
    throw new Error('EMAIL_PASSWORD is required when EMAIL_PROVIDER is "gmail".')
}

export const env = {
    ...parsedEnv,
    allowedOrigins: parseAllowedOrigins(parsedEnv.ALLOWED_ORIGINS),
    cookieSecure: parseBoolean(parsedEnv.COOKIE_SECURE),
    exposeDevAuthTokens,
    frontendAppUrl: parsedEnv.FRONTEND_APP_URL ?? parseAllowedOrigins(parsedEnv.ALLOWED_ORIGINS)[0],
    trustProxy: parseTrustProxy(parsedEnv.TRUST_PROXY),
}
