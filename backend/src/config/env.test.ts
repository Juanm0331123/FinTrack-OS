import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseEnv } from './env-schema.ts'

const ACCESS_SECRET = 'a'.repeat(48)
const REFRESH_SECRET = 'r'.repeat(48)

const DEVELOPMENT = {
    DATABASE_URL: 'postgresql://dev:dev@localhost:5432/fintrack_dev',
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
}

const SAFE_PRODUCTION = {
    ALLOWED_ORIGINS: 'https://fintrack.example.app',
    COOKIE_SECURE: 'true',
    DATABASE_URL: 'postgresql://app:secret@ep-example-pooler.neon.tech/neondb?sslmode=verify-full',
    EDGE_PROXY_SECRET: 'e'.repeat(40),
    EMAIL_FROM: 'FinTrack OS <correo@example.app>',
    EMAIL_PASSWORD: 'app-password',
    EMAIL_PROVIDER: 'gmail',
    EXPOSE_DEV_AUTH_TOKENS: 'false',
    FRONTEND_APP_URL: 'https://fintrack.example.app',
    GOOGLE_OAUTH_CALLBACK_URL: 'https://fintrack.example.app/api/auth/oauth/google/callback',
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    NODE_ENV: 'production',
    TRUST_PROXY: '1',
}

function productionErrors(overrides: Record<string, string | undefined>) {
    try {
        parseEnv({ ...SAFE_PRODUCTION, ...overrides })
    } catch (error) {
        return (error as Error).message
    }

    return null
}

describe('parseEnv in development', () => {
    it('starts with only the database and two distinct secrets', () => {
        const env = parseEnv(DEVELOPMENT)

        assert.equal(env.NODE_ENV, 'development')
        assert.equal(env.cookieSecure, false)
        assert.equal(env.exposeDevAuthTokens, true)
        assert.equal(env.trustProxy, false)
    })

    it('rejects equal access and refresh secrets', () => {
        assert.throws(
            () => parseEnv({ ...DEVELOPMENT, JWT_REFRESH_SECRET: ACCESS_SECRET }),
            /deben ser distintos/,
        )
    })

    it('rejects malformed durations at startup instead of on the first login', () => {
        assert.throws(() => parseEnv({ ...DEVELOPMENT, JWT_ACCESS_TTL: '15 minutes' }), /JWT_ACCESS_TTL/)
    })

    it('rejects an absolute session lifetime shorter than the idle lifetime', () => {
        assert.throws(
            () => parseEnv({ ...DEVELOPMENT, JWT_REFRESH_TTL: '7d', SESSION_ABSOLUTE_TTL: '1d' }),
            /SESSION_ABSOLUTE_TTL/,
        )
    })

    it('keeps the test outbox out of non-test environments', () => {
        assert.throws(() => parseEnv({ ...DEVELOPMENT, EMAIL_PROVIDER: 'outbox' }), /solo existe para pruebas/)
    })

    it('parses trust proxy hop counts and subnet lists, rejecting garbage', () => {
        assert.equal(parseEnv({ ...DEVELOPMENT, TRUST_PROXY: '1' }).trustProxy, 1)
        assert.deepEqual(parseEnv({ ...DEVELOPMENT, TRUST_PROXY: 'loopback, 10.0.0.0/8' }).trustProxy, [
            'loopback',
            '10.0.0.0/8',
        ])
        assert.throws(() => parseEnv({ ...DEVELOPMENT, TRUST_PROXY: 'everything' }), /TRUST_PROXY/)
    })
})

describe('parseEnv in production', () => {
    it('starts with a safe production configuration', () => {
        const env = parseEnv(SAFE_PRODUCTION)

        assert.equal(env.cookieSecure, true)
        assert.equal(env.exposeDevAuthTokens, false)
        assert.equal(env.trustProxy, 1)
    })

    it('does not expose development codes when the flag is omitted', () => {
        assert.equal(parseEnv({ ...SAFE_PRODUCTION, EXPOSE_DEV_AUTH_TOKENS: undefined }).exposeDevAuthTokens, false)
    })

    const dangerous: Array<[string, Record<string, string | undefined>, RegExp]> = [
        ['cookies without Secure', { COOKIE_SECURE: 'false' }, /COOKIE_SECURE/],
        ['exposed development codes', { EXPOSE_DEV_AUTH_TOKENS: 'true' }, /EXPOSE_DEV_AUTH_TOKENS/],
        ['an http frontend', { FRONTEND_APP_URL: 'http://fintrack.example.app' }, /FRONTEND_APP_URL/],
        ['an http allowed origin', { ALLOWED_ORIGINS: 'https://ok.app,http://localhost:3000' }, /ALLOWED_ORIGINS/],
        [
            'an http OAuth callback',
            { GOOGLE_OAUTH_CALLBACK_URL: 'http://fintrack.example.app/api/auth/oauth/google/callback' },
            /GOOGLE_OAUTH_CALLBACK_URL/,
        ],
        ['a database without TLS', { DATABASE_URL: 'postgresql://app:s@db.example/neondb?sslmode=disable' }, /sslmode/],
        ['a database without sslmode', { DATABASE_URL: 'postgresql://app:s@db.example/neondb' }, /sslmode/],
        ['TLS without verification', { DATABASE_URL: 'postgresql://app:s@db.example/neondb?sslmode=no-verify' }, /sslmode/],
        [
            'libpq require semantics (no certificate check)',
            { DATABASE_URL: 'postgresql://app:s@db.example/neondb?sslmode=verify-full&uselibpqcompat=true' },
            /sslmode/,
        ],
        ['a missing edge secret', { EDGE_PROXY_SECRET: undefined }, /EDGE_PROXY_SECRET/],
        ['trusting every proxy', { TRUST_PROXY: 'true' }, /TRUST_PROXY/],
        ['the console email fallback', { EMAIL_PROVIDER: undefined }, /EMAIL_PROVIDER/],
    ]

    for (const [label, overrides, expected] of dangerous) {
        it(`refuses to start with ${label}`, () => {
            const message = productionErrors(overrides)

            assert.ok(message, `production accepted ${label}`)
            assert.match(message, expected)
        })
    }

    it('lists every problem at once so the operator fixes them in one pass', () => {
        const message = productionErrors({ COOKIE_SECURE: 'false', EXPOSE_DEV_AUTH_TOKENS: 'true' }) ?? ''

        assert.match(message, /COOKIE_SECURE/)
        assert.match(message, /EXPOSE_DEV_AUTH_TOKENS/)
    })
})
