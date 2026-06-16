export type ValidationIssue = {
    field: string
    message: string
}

export type ErrorDetails = Record<string, unknown>

export class AppError extends Error {
    readonly code?: string
    readonly details?: ErrorDetails
    readonly errors?: ValidationIssue[]
    readonly statusCode: number

    constructor(
        message: string,
        statusCode = 500,
        errors?: ValidationIssue[],
        code?: string,
        details?: ErrorDetails,
    ) {
        super(message)
        this.code = code
        this.details = details
        this.errors = errors
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found.', code?: string, details?: ErrorDetails) {
        super(message, 404, undefined, code, details)
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict.', code?: string, details?: ErrorDetails) {
        super(message, 409, undefined, code, details)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized.', code?: string, details?: ErrorDetails) {
        super(message, 401, undefined, code, details)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden.', code?: string, details?: ErrorDetails) {
        super(message, 403, undefined, code, details)
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(
        message = 'Service unavailable.',
        code?: string,
        details?: ErrorDetails,
    ) {
        super(message, 503, undefined, code, details)
    }
}

export class RequestValidationError extends AppError {
    constructor(
        message = 'Validation failed.',
        errors: ValidationIssue[] = [],
        code?: string,
        details?: ErrorDetails,
    ) {
        super(message, 422, errors, code, details)
    }
}
