import { randomBytes } from 'node:crypto'
import { allowedTestHosts, assertSafeTestDatabaseUrl } from './test-database.ts'

// Se importa antes que cualquier módulo de la aplicación: fija un entorno de prueba completo
// e independiente del .env local (que puede apuntar a datos reales).
const databaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, allowedTestHosts()).toString()

export const TEST_ORIGIN = 'http://app.fintrack.test'
export const TEST_PASSWORD = 'Clave-segura-2026'

const defaults: Record<string, string> = {
    ALLOWED_ORIGINS: TEST_ORIGIN,
    AUTH_NEUTRAL_RESPONSE_MS: '40',
    COOKIE_SECURE: 'false',
    DATABASE_URL: databaseUrl,
    DB_CONNECTION_TIMEOUT_MS: '1500',
    DB_LOCK_TIMEOUT_MS: '500',
    // Igual que producción con el pooler de Neon: timeouts por SET LOCAL, no por parámetros de arranque.
    DB_STARTUP_TIMEOUTS: 'false',
    DIRECT_URL: databaseUrl,
    EMAIL_PROVIDER: 'outbox',
    EXPOSE_DEV_AUTH_TOKENS: 'false',
    FRONTEND_APP_URL: TEST_ORIGIN,
    GITHUB_OAUTH_CALLBACK_URL: 'http://api.fintrack.test/api/auth/oauth/github/callback',
    GITHUB_OAUTH_CLIENT_ID: 'github-test-client',
    GITHUB_OAUTH_CLIENT_SECRET: 'github-test-secret',
    GOOGLE_OAUTH_CALLBACK_URL: 'http://api.fintrack.test/api/auth/oauth/google/callback',
    GOOGLE_OAUTH_CLIENT_ID: 'google-test-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-test-secret',
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
    METRICS_LOG_INTERVAL_MS: '0',
    NODE_ENV: 'test',
    OAUTH_HTTP_TIMEOUT_MS: '300',
    // Permite simular IPs de cliente distintas con X-Forwarded-For desde el loopback.
    TRUST_PROXY: 'loopback',
}

for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value
}

// Estas variables deben venir del entorno de prueba aunque el shell tenga otras.
process.env.DATABASE_URL = databaseUrl
process.env.DIRECT_URL = databaseUrl
process.env.NODE_ENV = 'test'
