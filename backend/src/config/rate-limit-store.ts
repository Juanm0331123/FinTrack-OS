import { MemoryStore, type ClientRateLimitInfo, type Options, type Store } from 'express-rate-limit'
import { describeError, logger } from './logger.ts'
import { metrics } from './metrics.ts'
import { prisma } from './prisma.ts'

// Contadores compartidos entre réplicas (Cloud Run 0–2 instancias) y que sobreviven a reinicios
// y al escalado a cero. Se guardan en la misma base PostgreSQL: no hay servicios nuevos.
//
// Ante un fallo del almacén compartido se usa un MemoryStore local por réplica: la aplicación
// sigue atendiendo y conserva un límite (por instancia) en vez de quedar desprotegida.

const CLEANUP_EVERY_INCREMENTS = 500
const FAILURE_LOG_INTERVAL_MS = 60_000

let incrementsSinceCleanup = 0

type BucketRow = { hits: number; reset_at: Date }

function cleanupExpiredBuckets() {
    incrementsSinceCleanup = 0
    void prisma.$executeRaw`DELETE FROM "rate_limit_buckets"
        WHERE "reset_at" < (now() AT TIME ZONE 'UTC') - INTERVAL '1 hour'`.catch((error: unknown) => {
        logger.warn('rate_limit_cleanup_failed', describeError(error))
    })
}

export class PostgresRateLimitStore implements Store {
    readonly localKeys = false
    readonly prefix: string
    private windowMs = 60_000

    constructor(prefix: string) {
        this.prefix = `${prefix}:`
    }

    init(options: Options) {
        this.windowMs = options.windowMs
    }

    private key(key: string) {
        return `${this.prefix}${key}`.slice(0, 200)
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        const rows = await prisma.$queryRaw<BucketRow[]>`SELECT "hits", "reset_at" FROM "rate_limit_buckets"
            WHERE "key" = ${this.key(key)} AND "reset_at" > (now() AT TIME ZONE 'UTC')`

        return rows[0] ? { resetTime: rows[0].reset_at, totalHits: rows[0].hits } : undefined
    }

    async increment(key: string): Promise<ClientRateLimitInfo> {
        // Una sola sentencia atómica: reinicia la ventana vencida o suma un intento.
        const rows = await prisma.$queryRaw<BucketRow[]>`INSERT INTO "rate_limit_buckets" ("key", "hits", "reset_at")
            VALUES (${this.key(key)}, 1, (now() AT TIME ZONE 'UTC') + ${this.windowMs} * INTERVAL '1 millisecond')
            ON CONFLICT ("key") DO UPDATE SET
                "hits" = CASE WHEN "rate_limit_buckets"."reset_at" <= (now() AT TIME ZONE 'UTC')
                    THEN 1 ELSE "rate_limit_buckets"."hits" + 1 END,
                "reset_at" = CASE WHEN "rate_limit_buckets"."reset_at" <= (now() AT TIME ZONE 'UTC')
                    THEN EXCLUDED."reset_at" ELSE "rate_limit_buckets"."reset_at" END
            RETURNING "hits", "reset_at"`

        incrementsSinceCleanup += 1

        if (incrementsSinceCleanup >= CLEANUP_EVERY_INCREMENTS) {
            cleanupExpiredBuckets()
        }

        return { resetTime: rows[0].reset_at, totalHits: rows[0].hits }
    }

    async decrement(key: string) {
        await prisma.$executeRaw`UPDATE "rate_limit_buckets" SET "hits" = GREATEST("hits" - 1, 0)
            WHERE "key" = ${this.key(key)} AND "reset_at" > (now() AT TIME ZONE 'UTC')`
    }

    async resetKey(key: string) {
        await prisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "key" = ${this.key(key)}`
    }
}

export class ResilientRateLimitStore implements Store {
    readonly localKeys = false
    readonly prefix: string
    private readonly fallback = new MemoryStore()
    private lastFailureLogAt = 0
    private readonly primary: Store

    constructor(primary: Store & { prefix?: string }) {
        this.primary = primary
        this.prefix = primary.prefix ?? ''
    }

    init(options: Options) {
        this.primary.init?.(options)
        this.fallback.init(options)
    }

    private reportFailure(operation: string, error: unknown) {
        metrics.recordDependencyError('rate_limit_store', operation)

        if (Date.now() - this.lastFailureLogAt > FAILURE_LOG_INTERVAL_MS) {
            this.lastFailureLogAt = Date.now()
            logger.error('rate_limit_store_degraded', { ...describeError(error), operation, prefix: this.prefix })
        }
    }

    async get(key: string) {
        try {
            return await this.primary.get?.(key)
        } catch (error) {
            this.reportFailure('get', error)

            return this.fallback.get(key)
        }
    }

    async increment(key: string) {
        try {
            return await this.primary.increment(key)
        } catch (error) {
            this.reportFailure('increment', error)

            return this.fallback.increment(key)
        }
    }

    async decrement(key: string) {
        try {
            await this.primary.decrement(key)
        } catch (error) {
            this.reportFailure('decrement', error)
            this.fallback.decrement(key)
        }
    }

    async resetKey(key: string) {
        this.fallback.resetKey(key)

        try {
            await this.primary.resetKey(key)
        } catch (error) {
            this.reportFailure('reset', error)
        }
    }

    shutdown() {
        this.fallback.shutdown()
    }
}

export function createSharedStore(prefix: string) {
    return new ResilientRateLimitStore(new PostgresRateLimitStore(prefix))
}
