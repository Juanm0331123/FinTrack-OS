import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { NextFunction, Request, Response } from 'express'
import { logger } from '../config/logger.ts'
import { metrics } from '../config/metrics.ts'
import { redactUrl } from '../config/redact.ts'
import { runWithRequestContext } from '../config/request-context.ts'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/
const UUID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi
const YEAR_MONTH_SEGMENT = /\/\d{4}-\d{2}(?=\/|$)/g

function acceptRequestId(value: string | undefined) {
    return value && REQUEST_ID_PATTERN.test(value) ? value : null
}

function parseTraceId(value: string | undefined) {
    const traceId = value?.split('/')[0]

    return traceId && /^[0-9a-f]{32}$/i.test(traceId) ? traceId : undefined
}

// Ruta normalizada de cardinalidad acotada: los identificadores se reemplazan por marcadores.
export function routeKey(req: Request, statusCode: number) {
    const path = req.originalUrl.split('?')[0]

    if (statusCode === 404 && !req.route) {
        return `${req.method} unmatched`
    }

    return `${req.method} ${path.replace(UUID_SEGMENT, '/:id').replace(YEAR_MONTH_SEGMENT, '/:yearMonth')}`
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = acceptRequestId(req.get('x-request-id')) ?? randomUUID()
    const traceId = parseTraceId(req.get('x-cloud-trace-context'))
    const startedAt = performance.now()
    let finished = false

    res.setHeader('X-Request-Id', requestId)
    metrics.requestStarted()

    const finish = () => {
        if (finished) {
            return
        }

        finished = true
        metrics.requestFinished()

        const durationMs = Math.round(performance.now() - startedAt)
        const route = routeKey(req, res.statusCode)

        metrics.recordRequest(route, res.statusCode, durationMs)
        runWithRequestContext({ requestId, traceId }, () => {
            logger.info('http_request', {
                aborted: !res.writableFinished,
                clientIp: req.clientIp ?? req.ip,
                durationMs,
                method: req.method,
                path: redactUrl(req.originalUrl),
                responseBytes: Number(res.getHeader('content-length') ?? 0),
                route,
                status: res.statusCode,
                userAgent: req.get('user-agent')?.slice(0, 200),
            })
        })
    }

    res.on('finish', finish)
    res.on('close', finish)

    runWithRequestContext({ requestId, traceId }, next)
}
