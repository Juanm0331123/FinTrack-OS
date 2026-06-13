import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'
import { RequestValidationError } from '../utils/app-error.ts'

function setRequestValue(
    req: Request,
    key: 'body' | 'params' | 'query',
    value: unknown,
) {
    Object.defineProperty(req, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    })
}

export function validate(schema: ZodTypeAny) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const result = await schema.parseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
            })

            if (result?.body !== undefined) {
                setRequestValue(req, 'body', result.body)
            }

            if (result?.params !== undefined) {
                setRequestValue(req, 'params', result.params)
            }

            if (result?.query !== undefined) {
                setRequestValue(req, 'query', result.query)
            }

            return next()
        } catch (error) {
            if (error instanceof ZodError) {
                return next(
                    new RequestValidationError(
                        'Validation failed.',
                        error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    ),
                )
            }

            return next(error)
        }
    }
}
