import { isIP } from 'node:net'
import { z } from 'zod'
import { durationToSeconds, isDuration } from './duration.ts'

const optionalTextValue = z
    .union([z.string().trim(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined))

const optionalUrlValue = z
    .union([z.url().trim(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined))

const durationValue = (fallback: string) =>
    z
        .string()
        .trim()
        .default(fallback)
        .refine(isDuration, 'Usa una duración como 15m, 1h o 7d.')

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback)

const booleanValue = (fallback: 'true' | 'false') =>
    z
        .enum(['true', 'false'], { error: 'Usa true o false.' })
        .default(fallback)
        .transform((value) => value === 'true')

const rawEnvSchema = z.object({
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
    API_RATE_LIMIT_MAX: positiveInt(600),
    API_RATE_LIMIT_WINDOW_MS: positiveInt(5 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: positiveInt(30),
    AUTH_RATE_LIMIT_WINDOW_MS: positiveInt(15 * 60 * 1000),
    AUTH_ACCOUNT_RATE_LIMIT_MAX: positiveInt(10),
    AUTH_REFRESH_RATE_LIMIT_MAX: positiveInt(120),
    AUTH_EMAIL_COOLDOWN_MS: positiveInt(60 * 1000),
    AUTH_EMAIL_HOURLY_MAX: positiveInt(5),
    AUTH_REGISTER_HOURLY_MAX: positiveInt(10),
    AUTH_CODE_MAX_ATTEMPTS: positiveInt(5),
    AUTH_NEUTRAL_RESPONSE_MS: z.coerce.number().int().min(0).max(10_000).default(1200),
    AUTH_RETENTION_DAYS: positiveInt(30),
    FINANCE_READ_RATE_LIMIT_MAX: positiveInt(300),
    FINANCE_RATE_LIMIT_MAX: positiveInt(1200),
    FINANCE_RATE_LIMIT_WINDOW_MS: positiveInt(15 * 60 * 1000),
    COOKIE_DOMAIN: optionalTextValue,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: booleanValue('false'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria.'),
    DB_CONNECTION_TIMEOUT_MS: positiveInt(5000),
    DB_IDLE_TIMEOUT_MS: positiveInt(10_000),
    DB_LOCK_TIMEOUT_MS: positiveInt(3000),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    DB_STARTUP_TIMEOUTS: booleanValue('false'),
    DB_STATEMENT_TIMEOUT_MS: positiveInt(8000),
    DB_TRANSACTION_TIMEOUT_MS: positiveInt(10_000),
    EDGE_PROXY_SECRET: optionalTextValue,
    EMAIL_FROM: optionalTextValue,
    EMAIL_PASSWORD: optionalTextValue,
    EMAIL_PROVIDER: z.enum(['gmail', 'resend', 'outbox']).optional(),
    EMAIL_REPLY_TO: optionalTextValue,
    EMAIL_SEND_TIMEOUT_MS: positiveInt(10_000),
    EMAIL_VERIFICATION_TTL: durationValue('10m'),
    EXPOSE_DEV_AUTH_TOKENS: z.enum(['true', 'false']).optional(),
    FRONTEND_APP_URL: optionalUrlValue,
    GITHUB_OAUTH_CALLBACK_URL: optionalUrlValue,
    GITHUB_OAUTH_CLIENT_ID: optionalTextValue,
    GITHUB_OAUTH_CLIENT_SECRET: optionalTextValue,
    GOOGLE_OAUTH_CALLBACK_URL: optionalUrlValue,
    GOOGLE_OAUTH_CLIENT_ID: optionalTextValue,
    GOOGLE_OAUTH_CLIENT_SECRET: optionalTextValue,
    JSON_BODY_LIMIT: z.string().regex(/^\d+(b|kb|mb)$/i, 'Usa un tamaño como 100kb o 1mb.').default('1mb'),
    JWT_ACCESS_AUDIENCE: z.string().trim().min(1).default('fintrack-api'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres.'),
    JWT_ACCESS_TTL: durationValue('15m'),
    JWT_ISSUER: z.string().trim().min(1).default('fintrack-os'),
    JWT_REFRESH_AUDIENCE: z.string().trim().min(1).default('fintrack-refresh'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres.'),
    JWT_REFRESH_TTL: durationValue('7d'),
    METRICS_LOG_INTERVAL_MS: z.coerce.number().int().min(0).default(60_000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    OAUTH_HTTP_TIMEOUT_MS: positiveInt(8000),
    PASSWORD_RESET_SESSION_TTL: durationValue('10m'),
    PASSWORD_RESET_TTL: durationValue('10m'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().min(0).max(300).default(30),
    REFRESH_TOKEN_COOKIE_NAME: z.string().trim().min(1).default('refresh_token'),
    REQUEST_TIMEOUT_MS: positiveInt(30_000),
    RESEND_API_KEY: optionalTextValue,
    SESSION_ABSOLUTE_TTL: durationValue('30d'),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(9000).default(8000),
    TRUST_PROXY: z.string().trim().optional(),
})

export type RawEnv = z.input<typeof rawEnvSchema>

export type TrustProxySetting = boolean | number | string[]

const SAFE_DATABASE_SSL_MODES = new Set(['verify-full'])

function parseAllowedOrigins(value: string) {
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
}

function isTrustProxyEntry(value: string) {
    if (value === 'loopback' || value === 'linklocal' || value === 'uniquelocal') {
        return true
    }

    const [address, prefix] = value.split('/')

    if (!isIP(address)) {
        return false
    }

    return prefix === undefined || /^\d{1,3}$/.test(prefix)
}

function parseTrustProxy(value: string | undefined): TrustProxySetting {
    if (!value || value === 'false') {
        return false
    }

    if (value === 'true') {
        return true
    }

    if (/^\d+$/.test(value)) {
        return Number(value)
    }

    const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean)

    if (entries.length === 0 || !entries.every(isTrustProxyEntry)) {
        throw new Error(
            'TRUST_PROXY debe ser false, un número de saltos o una lista de IPs/subredes (por ejemplo loopback o 10.0.0.0/8).',
        )
    }

    return entries
}

function isHttpsUrl(value: string) {
    return new URL(value).protocol === 'https:'
}

function describeDatabaseTls(databaseUrl: string) {
    try {
        const url = new URL(databaseUrl)

        return {
            libpqCompat: url.searchParams.get('uselibpqcompat') === 'true',
            sslMode: url.searchParams.get('sslmode'),
        }
    } catch {
        return { libpqCompat: false, sslMode: null }
    }
}

function collectProductionProblems(parsed: z.output<typeof rawEnvSchema>, allowedOrigins: string[]) {
    const problems: string[] = []

    if (!parsed.COOKIE_SECURE) {
        problems.push('COOKIE_SECURE debe ser true.')
    }

    if (parsed.EXPOSE_DEV_AUTH_TOKENS === 'true') {
        problems.push('EXPOSE_DEV_AUTH_TOKENS no puede ser true.')
    }

    if (!parsed.EMAIL_PROVIDER || parsed.EMAIL_PROVIDER === 'outbox') {
        problems.push('EMAIL_PROVIDER debe ser gmail o resend.')
    }

    if (!parsed.FRONTEND_APP_URL || !isHttpsUrl(parsed.FRONTEND_APP_URL)) {
        problems.push('FRONTEND_APP_URL debe ser una URL https.')
    }

    if (allowedOrigins.length === 0 || allowedOrigins.some((origin) => !URL.canParse(origin) || !isHttpsUrl(origin))) {
        problems.push('ALLOWED_ORIGINS solo puede contener orígenes https.')
    }

    for (const key of ['GOOGLE_OAUTH_CALLBACK_URL', 'GITHUB_OAUTH_CALLBACK_URL'] as const) {
        const value = parsed[key]

        if (value && !isHttpsUrl(value)) {
            problems.push(`${key} debe ser una URL https.`)
        }
    }

    const tls = describeDatabaseTls(parsed.DATABASE_URL)

    if (!tls.sslMode || !SAFE_DATABASE_SSL_MODES.has(tls.sslMode) || tls.libpqCompat) {
        problems.push('DATABASE_URL debe usar sslmode=verify-full (TLS con verificación de certificado y host).')
    }

    if (!parsed.EDGE_PROXY_SECRET || parsed.EDGE_PROXY_SECRET.length < 32) {
        problems.push('EDGE_PROXY_SECRET debe tener al menos 32 caracteres.')
    }

    if (parsed.TRUST_PROXY === 'true') {
        problems.push('TRUST_PROXY=true confía en cualquier X-Forwarded-For; usa el número de saltos (Cloud Run: 1).')
    }

    if (parsed.COOKIE_SAME_SITE === 'none') {
        problems.push('COOKIE_SAME_SITE=none no se usa: el frontend comparte origen con la API mediante el rewrite.')
    }

    return problems
}

export function parseEnv(source: Record<string, string | undefined>) {
    const result = rawEnvSchema.safeParse(source)

    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('\n')

        throw new Error(`Configuración inválida:\n${details}`)
    }

    const parsed = result.data
    const allowedOrigins = parseAllowedOrigins(parsed.ALLOWED_ORIGINS)
    const problems: string[] = []

    if (parsed.JWT_ACCESS_SECRET === parsed.JWT_REFRESH_SECRET) {
        problems.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos.')
    }

    if (parsed.COOKIE_SAME_SITE === 'none' && !parsed.COOKIE_SECURE) {
        problems.push('COOKIE_SECURE debe ser true cuando COOKIE_SAME_SITE es "none".')
    }

    if (parsed.EMAIL_PROVIDER === 'resend' && (!parsed.EMAIL_FROM || !parsed.RESEND_API_KEY)) {
        problems.push('EMAIL_FROM y RESEND_API_KEY son obligatorios con EMAIL_PROVIDER=resend.')
    }

    if (parsed.EMAIL_PROVIDER === 'gmail' && !parsed.EMAIL_PASSWORD) {
        problems.push('EMAIL_PASSWORD es obligatorio con EMAIL_PROVIDER=gmail.')
    }

    if (parsed.EMAIL_PROVIDER === 'outbox' && parsed.NODE_ENV !== 'test') {
        problems.push('EMAIL_PROVIDER=outbox solo existe para pruebas automatizadas.')
    }

    if (durationToSeconds(parsed.SESSION_ABSOLUTE_TTL) < durationToSeconds(parsed.JWT_REFRESH_TTL)) {
        problems.push('SESSION_ABSOLUTE_TTL no puede ser menor que JWT_REFRESH_TTL.')
    }

    if (parsed.NODE_ENV === 'production') {
        problems.push(...collectProductionProblems(parsed, allowedOrigins))
    }

    let trustProxy: TrustProxySetting = false

    try {
        trustProxy = parseTrustProxy(parsed.TRUST_PROXY)
    } catch (error) {
        problems.push((error as Error).message)
    }

    if (problems.length > 0) {
        throw new Error(`Configuración insegura o incompleta:\n- ${problems.join('\n- ')}`)
    }

    const exposeDevAuthTokens =
        parsed.EXPOSE_DEV_AUTH_TOKENS !== undefined
            ? parsed.EXPOSE_DEV_AUTH_TOKENS === 'true'
            : parsed.NODE_ENV === 'development'

    return {
        ...parsed,
        allowedOrigins,
        cookieSecure: parsed.COOKIE_SECURE,
        exposeDevAuthTokens,
        frontendAppUrl: parsed.FRONTEND_APP_URL ?? allowedOrigins[0],
        trustProxy,
    }
}

export type Env = ReturnType<typeof parseEnv>
