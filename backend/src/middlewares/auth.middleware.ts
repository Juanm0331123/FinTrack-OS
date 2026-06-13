import type { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import type { PublicUser } from '../modules/users/users.types.ts'
import { UnauthorizedError, ForbiddenError } from '../utils/app-error.ts'
import { AuthRepository } from '../modules/auth/auth.repository.ts'
import { verifyAccessToken } from '../modules/auth/auth.tokens.ts'

const authRepository = new AuthRepository()

export type AuthenticatedRequest = Request & {
    auth: {
        sessionId?: string
        user: PublicUser
    }
}

type RequestWithOptionalAuth = Request & {
    auth?: AuthenticatedRequest['auth']
}

export function toAuthenticatedRequest(req: Request): AuthenticatedRequest {
    const authenticatedRequest = req as RequestWithOptionalAuth

    if (!authenticatedRequest.auth) {
        throw new UnauthorizedError('Authentication is required.')
    }

    return authenticatedRequest as AuthenticatedRequest
}

function extractBearerToken(req: Request) {
    const authorizationHeader = req.get('authorization')

    if (!authorizationHeader) {
        return null
    }

    const [scheme, token] = authorizationHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
        return null
    }

    return token
}

export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    try {
        const accessToken = extractBearerToken(req)

        if (!accessToken) {
            throw new UnauthorizedError('Authentication token is required.')
        }

        const claims = await verifyAccessToken(accessToken)

        if (claims.tokenType !== 'access') {
            throw new UnauthorizedError('Invalid authentication token.')
        }

        const user = await authRepository.findActiveUserById(claims.userId)

        if (!user) {
            throw new UnauthorizedError('Authenticated user was not found.')
        }

        ;(req as RequestWithOptionalAuth).auth = {
            user,
        }

        next()
    } catch (error) {
        next(error)
    }
}

export function requireRole(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const authenticatedRequest = toAuthenticatedRequest(req)

        if (!roles.includes(authenticatedRequest.auth.user.role)) {
            return next(new ForbiddenError('Insufficient permissions.'))
        }

        next()
    }
}

export function requireSelfOrRole(
    paramName: string,
    ...roles: UserRole[]
) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const authenticatedRequest = toAuthenticatedRequest(req)

        if (
            authenticatedRequest.auth.user.id === req.params[paramName] ||
            roles.includes(authenticatedRequest.auth.user.role)
        ) {
            return next()
        }

        return next(new ForbiddenError('Insufficient permissions.'))
    }
}
