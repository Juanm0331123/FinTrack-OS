import { monitorEventLoopDelay } from 'node:perf_hooks'
import { logger } from './logger.ts'

// Métricas en proceso, de cardinalidad acotada: las rutas se agregan por patrón de Express
// (nunca por URL concreta) y existe un tope de series. Se publican como un log estructurado
// periódico que Cloud Logging puede convertir en métricas basadas en logs.

const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000]
const MAX_ROUTE_SERIES = 80

type RouteStats = {
    count: number
    errors4xx: number
    errors5xx: number
    histogram: number[]
    maxMs: number
    sumMs: number
}

export type Dependency = 'email' | 'oauth_github' | 'oauth_google' | 'postgres' | 'rate_limit_store'

type PoolGauge = () => { idle: number; total: number; waiting: number }

const routes = new Map<string, RouteStats>()
const dependencyErrors = new Map<string, number>()
const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 })
let inFlight = 0
let dbAcquires = 0
let poolGauge: PoolGauge | null = null

eventLoopDelay.enable()

function emptyStats(): RouteStats {
    return { count: 0, errors4xx: 0, errors5xx: 0, histogram: LATENCY_BUCKETS_MS.map(() => 0).concat(0), maxMs: 0, sumMs: 0 }
}

export const metrics = {
    recordDbAcquire() {
        dbAcquires += 1
    },

    recordDependencyError(dependency: Dependency, kind: string) {
        const key = `${dependency}:${kind}`

        dependencyErrors.set(key, (dependencyErrors.get(key) ?? 0) + 1)
    },

    recordRequest(route: string, statusCode: number, durationMs: number) {
        const key = routes.has(route) || routes.size < MAX_ROUTE_SERIES ? route : 'other'
        const stats = routes.get(key) ?? emptyStats()
        const bucket = LATENCY_BUCKETS_MS.findIndex((limit) => durationMs <= limit)

        stats.count += 1
        stats.sumMs += durationMs
        stats.maxMs = Math.max(stats.maxMs, durationMs)
        stats.histogram[bucket === -1 ? LATENCY_BUCKETS_MS.length : bucket] += 1

        if (statusCode >= 500) {
            stats.errors5xx += 1
        } else if (statusCode >= 400) {
            stats.errors4xx += 1
        }

        routes.set(key, stats)
    },

    requestFinished() {
        inFlight = Math.max(0, inFlight - 1)
    },

    requestStarted() {
        inFlight += 1
    },

    setPoolGauge(gauge: PoolGauge) {
        poolGauge = gauge
    },

    snapshot() {
        return {
            dbAcquires,
            dependencyErrors: Object.fromEntries(dependencyErrors),
            eventLoopDelayP99Ms: Math.round(eventLoopDelay.percentile(99) / 1e6),
            inFlight,
            latencyBucketsMs: LATENCY_BUCKETS_MS,
            pool: poolGauge?.() ?? null,
            routes: Object.fromEntries(
                [...routes].map(([route, stats]) => [
                    route,
                    { ...stats, avgMs: stats.count ? Math.round(stats.sumMs / stats.count) : 0 },
                ]),
            ),
        }
    },

    resetInterval() {
        routes.clear()
        dependencyErrors.clear()
        eventLoopDelay.reset()
    },
}

export function startMetricsReporter(intervalMs: number) {
    if (intervalMs <= 0) {
        return () => undefined
    }

    const timer = setInterval(() => {
        const snapshot = metrics.snapshot()

        if (Object.keys(snapshot.routes).length > 0 || Object.keys(snapshot.dependencyErrors).length > 0) {
            logger.info('metrics', snapshot)
        }

        metrics.resetInterval()
    }, intervalMs)

    timer.unref()

    return () => clearInterval(timer)
}
