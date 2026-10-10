import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'
import { Pool, type PoolConfig } from 'pg'
import { env } from './env.ts'
import { describeError, logger } from './logger.ts'
import { metrics } from './metrics.ts'

// Presupuestos de base de datos (ver docs/qa-backend-remediacion.md, sección Prisma/Neon):
// - connectionTimeoutMillis acota la espera por una conexión del pool y la conexión nueva.
// - DB_POOL_MAX conexiones por réplica: con Cloud Run máximo 2 réplicas, como mucho 2 × max.
// - statement/lock timeouts se aplican con SET LOCAL al iniciar cada transacción, que sí
//   funciona con el pooler de Neon (PgBouncer en modo transacción rechaza enviarlos como
//   parámetros de arranque). Las consultas sueltas quedan cubiertas por los valores por
//   defecto del rol (ALTER ROLE ... SET statement_timeout), documentados en el runbook.
function createPoolConfig(): PoolConfig {
    return {
        application_name: 'fintrack-api',
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
        idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
        max: env.DB_POOL_MAX,
        ...(env.DB_STARTUP_TIMEOUTS
            ? {
                  idle_in_transaction_session_timeout: env.DB_TRANSACTION_TIMEOUT_MS,
                  lock_timeout: env.DB_LOCK_TIMEOUT_MS,
                  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
              }
            : {}),
    }
}

export const pool = new Pool(createPoolConfig())

pool.on('acquire', () => metrics.recordDbAcquire())
pool.on('error', (error) => {
    metrics.recordDependencyError('postgres', 'pool_error')
    logger.error('db_pool_error', describeError(error))
})

metrics.setPoolGauge(() => ({
    idle: pool.idleCount,
    total: pool.totalCount,
    waiting: pool.waitingCount,
}))

const adapter = new PrismaPg(pool, {
    onConnectionError: (error) => {
        metrics.recordDependencyError('postgres', 'connection_error')
        logger.error('db_connection_error', describeError(error))
    },
})

export const prisma = new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn'] : [],
})

export type TransactionClient = Prisma.TransactionClient

export async function withTransaction<T>(
    work: (transaction: TransactionClient) => Promise<T>,
    options: { isolationLevel?: Prisma.TransactionIsolationLevel } = {},
) {
    return prisma.$transaction(
        async (transaction) => {
            await transaction.$queryRaw`SELECT
                set_config('statement_timeout', ${String(env.DB_STATEMENT_TIMEOUT_MS)}, true),
                set_config('lock_timeout', ${String(env.DB_LOCK_TIMEOUT_MS)}, true)`

            return work(transaction)
        },
        {
            isolationLevel: options.isolationLevel,
            maxWait: env.DB_CONNECTION_TIMEOUT_MS,
            timeout: env.DB_TRANSACTION_TIMEOUT_MS,
        },
    )
}

export async function checkDatabase(timeoutMs: number) {
    let timer: NodeJS.Timeout | undefined

    try {
        await Promise.race([
            pool.query('SELECT 1'),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Database check timed out')), timeoutMs)
            }),
        ])

        return true
    } catch (error) {
        metrics.recordDependencyError('postgres', 'readiness_failed')
        logger.warn('db_readiness_failed', describeError(error))

        return false
    } finally {
        clearTimeout(timer)
    }
}

let disconnectPromise: Promise<void> | null = null

export function disconnectPrisma() {
    disconnectPromise ??= (async () => {
        try {
            await prisma.$disconnect()
        } finally {
            if (!pool.ended) {
                await pool.end()
            }
        }
    })()

    return disconnectPromise
}
