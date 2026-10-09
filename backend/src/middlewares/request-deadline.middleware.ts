import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'
import { logger } from '../config/logger.ts'
import { ApiResponse } from '../utils/api-response.ts'

// Plazo de aplicación por petición, menor que el timeout de Cloud Run: el cliente recibe un 503
// controlado en lugar de un 504 del balanceador. Las consultas siguen acotadas por los timeouts
// de base de datos, así que el trabajo pendiente termina poco después.
export function requestDeadline(req: Request, res: Response, next: NextFunction) {
    const timer = setTimeout(() => {
        if (res.headersSent) {
            return
        }

        logger.warn('request_deadline_exceeded', { method: req.method, timeoutMs: env.REQUEST_TIMEOUT_MS })
        res.setHeader('Retry-After', '5')
        res.status(503).json(
            ApiResponse.error('La solicitud tardó demasiado. Intenta de nuevo.', undefined, 'REQUEST_TIMEOUT'),
        )
    }, env.REQUEST_TIMEOUT_MS)

    timer.unref()
    res.on('close', () => clearTimeout(timer))
    res.on('finish', () => clearTimeout(timer))

    next()
}
