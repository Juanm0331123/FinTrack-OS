import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { ApiResponse } from '../utils/api-response.ts'
import { AppError, ConflictError, NotFoundError } from '../utils/app-error.ts'

export function errorMiddleware(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (error instanceof AppError) {
        return res
            .status(error.statusCode)
            .json(ApiResponse.error(error.message, error.errors))
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(', ')
                : 'resource'

            return res
                .status(409)
                .json(ApiResponse.error(new ConflictError(`Unique constraint violation on ${target}.`).message))
        }

        if (error.code === 'P2025') {
            return res
                .status(404)
                .json(ApiResponse.error(new NotFoundError('Record not found.').message))
        }
    }

    console.error(error)

    if (error instanceof Error) {
        return res.status(500).json(
            ApiResponse.error(
                process.env.NODE_ENV === 'production'
                    ? 'Internal server error.'
                    : error.message,
            ),
        )
    }

    return res.status(500).json(ApiResponse.error('Internal server error.'))
}
