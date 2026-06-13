export type ValidationIssue = {
    field: string
    message: string
}

export class AppError extends Error {
    readonly errors?: ValidationIssue[]
    readonly statusCode: number

    constructor(
        message: string,
        statusCode = 500,
        errors?: ValidationIssue[],
    ) {
        super(message)
        this.errors = errors
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found.') {
        super(message, 404)
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict.') {
        super(message, 409)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden.') {
        super(message, 403)
    }
}

export class RequestValidationError extends AppError {
    constructor(message = 'Validation failed.', errors: ValidationIssue[] = []) {
        super(message, 422, errors)
    }
}
