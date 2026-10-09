import { timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'
import { ForbiddenError } from '../utils/app-error.ts'

// Cadena prevista: navegador → Vercel (proxy de Next) → Google Front End → Cloud Run.
// El proxy de Next añade un secreto compartido y la IP real del cliente, que Vercel obtiene sin
// permitir que el cliente la falsifique. Sin ese secreto (acceso directo a run.app), la API no
// atiende tráfico de negocio y la IP solo sale de `req.ip`, calculada con TRUST_PROXY.

export const EDGE_SECRET_HEADER = 'x-fintrack-edge-auth'
export const EDGE_CLIENT_IP_HEADER = 'x-fintrack-client-ip'

function hasValidEdgeSecret(req: Request) {
    const expected = env.EDGE_PROXY_SECRET
    const received = req.get(EDGE_SECRET_HEADER)

    if (!expected || !received) {
        return false
    }

    const expectedBuffer = Buffer.from(expected)
    const receivedBuffer = Buffer.from(received)

    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

export function clientIpMiddleware(req: Request, _res: Response, next: NextFunction) {
    const edgeVerified = hasValidEdgeSecret(req)
    const forwardedClientIp = req.get(EDGE_CLIENT_IP_HEADER)?.trim()

    req.edgeVerified = edgeVerified
    req.clientIp = edgeVerified && forwardedClientIp && isIP(forwardedClientIp) ? forwardedClientIp : (req.ip ?? 'unknown')

    next()
}

export function requireEdgeProxy(req: Request, _res: Response, next: NextFunction) {
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
