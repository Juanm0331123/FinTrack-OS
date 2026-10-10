import type { NextFunction, Request, Response } from 'express'
import { classifyDatabaseError } from '../config/database-errors.ts'
import { env } from '../config/env.ts'
import { describeError, logger } from '../config/logger.ts'
import { metrics } from '../config/metrics.ts'
import { ApiResponse } from '../utils/api-response.ts'
import { AppError } from '../utils/app-error.ts'

type PublicError = {
    code: string
    message: string
    retryAfterSeconds?: number
    status: number
}

// Errores conocidos de body-parser/raw-body. Nunca se devuelve ni registra su mensaje: el de
// JSON inválido incluye un fragmento del cuerpo (que puede contener una contraseña).
const PARSER_ERRORS: Record<string, PublicError> = {
    'charset.unsupported': {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'La codificación del contenido no es compatible. Usa UTF-8.',
        status: 415,
    },
    'encoding.unsupported': {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'La codificación del contenido no es compatible.',
        status: 415,
    },
    'entity.parse.failed': {
        code: 'MALFORMED_JSON',
        message: 'El cuerpo de la solicitud no es un JSON válido.',
        status: 400,
    },
    'entity.too.large': {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'La solicitud es demasiado grande.',
        status: 413,
    },
    'entity.verify.failed': {
        code: 'BAD_REQUEST',
        message: 'La solicitud no es válida.',
        status: 400,
    },
    'parameters.too.many': {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'La solicitud tiene demasiados parámetros.',
        status: 413,
    },
    'request.aborted': {
        code: 'BAD_REQUEST',
        message: 'La solicitud se interrumpió antes de completarse.',
        status: 400,
    },
    'request.size.invalid': {
        code: 'BAD_REQUEST',
        message: 'El tamaño de la solicitud no coincide con su contenido.',
        status: 400,
    },
}

const DATABASE_ERRORS: Record<string, PublicError> = {
    busy: {
        code: 'DB_BUSY',
        message: 'Otra operación está usando estos datos. Intenta de nuevo en unos segundos.',
        retryAfterSeconds: 2,
        status: 503,
    },
    foreign_key: {
        code: 'REFERENCE_CONFLICT',
        message: 'Uno de los datos relacionados ya no existe o pertenece a otro registro.',
        status: 409,
    },
    not_found: {
        code: 'NOT_FOUND',
        message: 'No encontramos ese registro.',
        status: 404,
    },
    unavailable: {
        code: 'DB_UNAVAILABLE',
        message: 'El servicio está ocupado. Intenta de nuevo en unos segundos.',
        retryAfterSeconds: 3,
        status: 503,
    },
    unique: {
        code: 'CONFLICT',
        message: 'Ya existe un registro con esos datos.',
        status: 409,
    },
}

const INTERNAL_ERROR: PublicError = {
    code: 'INTERNAL_ERROR',
    message: 'Algo falló en el servidor. Intenta de nuevo.',
    status: 500,
}

function parserError(error: unknown) {
    const type = (error as { type?: unknown } | null)?.type

    return typeof type === 'string' ? PARSER_ERRORS[type] : undefined
}

function genericHttpError(error: unknown): PublicError | undefined {
    const status = (error as { status?: unknown; statusCode?: unknown } | null)?.status

    if (typeof status === 'number' && status >= 400 && status < 500) {
        return { code: 'BAD_REQUEST', message: 'La solicitud no es válida.', status }
    }

    return undefined
}

function send(res: Response, error: PublicError, extra?: { details?: Record<string, unknown> }) {
    if (error.retryAfterSeconds) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds))
    }

    return res.status(error.status).json(ApiResponse.error(error.message, undefined, error.code, extra?.details))
}

export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
    if (res.headersSent) {
        logger.warn('error_after_headers_sent', describeError(error))
        res.destroy()
        return
    }

    if (error instanceof AppError) {
        for (const [name, value] of Object.entries(error.headers ?? {})) {
            res.setHeader(name, value)
        }

        if (error.statusCode >= 500) {
            logger.error('request_failed', { ...describeError(error), errorCode: error.code })
        }

        return res
            .status(error.statusCode)
            .json(ApiResponse.error(error.message, error.errors, error.code, error.details))
    }

    const parsed = parserError(error)

    if (parsed) {
        logger.info('request_rejected_by_parser', { parserType: (error as { type: string }).type, status: parsed.status })

        return send(res, parsed)
    }

    const databaseKind = classifyDatabaseError(error)

    if (databaseKind) {
        const publicError = DATABASE_ERRORS[databaseKind]

        if (publicError.status >= 500) {
            metrics.recordDependencyError('postgres', databaseKind)
            logger.error('database_error', { ...describeError(error), databaseKind, route: req.route?.path })
        }

        return send(res, publicError)
    }

    const httpError = genericHttpError(error)

    if (httpError) {
        return send(res, httpError)
    }

    logger.error('unhandled_error', describeError(error))

    return send(res, {
        ...INTERNAL_ERROR,
        message:
            env.NODE_ENV === 'development' && error instanceof Error
                ? `${INTERNAL_ERROR.message} (${error.message})`
                : INTERNAL_ERROR.message,
    })
}
