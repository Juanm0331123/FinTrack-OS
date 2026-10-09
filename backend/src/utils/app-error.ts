export type ValidationIssue = {
    field: string
    message: string
}

export type ErrorDetails = Record<string, unknown>

// Cada error público lleva un código estable que el frontend puede interpretar sin depender
// del texto. Los mensajes son de cara al usuario, en español (es-CO).
export class AppError extends Error {
    readonly code: string
    readonly details?: ErrorDetails
    readonly errors?: ValidationIssue[]
    readonly headers?: Record<string, string>
    readonly statusCode: number

    constructor(
        message: string,
        statusCode = 500,
        errors?: ValidationIssue[],
        code = 'INTERNAL_ERROR',
        details?: ErrorDetails,
        headers?: Record<string, string>,
    ) {
        super(message)
        this.code = code
        this.details = details
        this.errors = errors
        this.headers = headers
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'La solicitud no es válida.', code = 'BAD_REQUEST', details?: ErrorDetails) {
        super(message, 400, undefined, code, details)
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'No encontramos ese recurso.', code = 'NOT_FOUND', details?: ErrorDetails) {
        super(message, 404, undefined, code, details)
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Hay un conflicto con los datos.', code = 'CONFLICT', details?: ErrorDetails) {
        super(message, 409, undefined, code, details)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Inicia sesión para continuar.', code = 'UNAUTHORIZED', details?: ErrorDetails) {
        super(message, 401, undefined, code, details)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'No tienes permiso para hacer esto.', code = 'FORBIDDEN', details?: ErrorDetails) {
        super(message, 403, undefined, code, details)
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(
        message = 'El servicio no está disponible. Intenta de nuevo en unos segundos.',
        code = 'SERVICE_UNAVAILABLE',
        details?: ErrorDetails,
        retryAfterSeconds?: number,
    ) {
        super(
            message,
            503,
            undefined,
            code,
            details,
            retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : undefined,
        )
    }
}

export class BadGatewayError extends AppError {
    constructor(message = 'Un servicio externo respondió de forma inesperada.', code = 'BAD_GATEWAY', details?: ErrorDetails) {
        super(message, 502, undefined, code, details)
    }
}

export class RequestValidationError extends AppError {
    constructor(
        message = 'Revisa los datos enviados.',
        errors: ValidationIssue[] = [],
        code = 'VALIDATION_ERROR',
        details?: ErrorDetails,
    ) {
        super(message, 422, errors, code, details)
    }
}
