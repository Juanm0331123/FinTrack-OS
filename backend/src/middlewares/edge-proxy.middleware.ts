import { timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'
import { ForbiddenError, ServiceUnavailableError } from '../utils/app-error.ts'

// Cadena activa: navegador → proyecto Vercel del frontend → proyecto Vercel del backend.
// Solo el proxy autenticado puede fijar clientIp. La plataforma del segundo proyecto sustituye
// X-Forwarded-For por la IP del primer proyecto: contar saltos no recupera al visitante.
// En Vercel TRUST_PROXY=false conserva req.ip como identidad del socket, nunca como visitante.

export const EDGE_SECRET_HEADER = 'x-fintrack-edge-auth'
export const EDGE_CLIENT_IP_HEADER = 'x-fintrack-client-ip'

function hasValidEdgeSecret(req: Request) {
    const expected = env.EDGE_PROXY_SECRET
    const received = req.headers[EDGE_SECRET_HEADER]

    if (!expected || typeof received !== 'string' || !received) {
        return false
    }

    const expectedBuffer = Buffer.from(expected)
    const receivedBuffer = Buffer.from(received)

    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

function forwardedClientIp(req: Request) {
    const header = req.headers[EDGE_CLIENT_IP_HEADER]
    const value = typeof header === 'string' ? header.trim() : undefined

    return value && !value.includes('%') && isIP(value) ? value : null
}

export function clientIpMiddleware(req: Request, _res: Response, next: NextFunction) {
    const edgeVerified = hasValidEdgeSecret(req)

    req.edgeVerified = edgeVerified
    req.clientIp = (edgeVerified ? forwardedClientIp(req) : null) ?? req.ip ?? 'unknown'

    next()
}

export function requireEdgeProxy(req: Request, _res: Response, next: NextFunction) {
    if (req.edgeVerified && env.VERCEL === '1' && !forwardedClientIp(req)) {
        return next(new ServiceUnavailableError(
            'El servicio no está disponible. Intenta de nuevo en unos segundos.',
            'EDGE_CLIENT_IP_MISSING',
        ))
    }

    if (!env.EDGE_PROXY_SECRET || req.edgeVerified) {
        return next()
    }

    return next(
        new ForbiddenError(
            'Accede a FinTrack OS desde su dirección pública.',
            'EDGE_PROXY_REQUIRED',
        ),
    )
}
