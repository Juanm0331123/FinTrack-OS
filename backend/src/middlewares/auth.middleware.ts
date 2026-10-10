import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '@prisma/client'
import { AuthRepository } from '../modules/auth/auth.repository.ts'
import { verifyAccessToken } from '../modules/auth/auth.tokens.ts'
import type { PublicUser } from '../modules/users/users.types.ts'
import { ForbiddenError, UnauthorizedError } from '../utils/app-error.ts'

const authRepository = new AuthRepository()

export type AuthenticatedRequest = Request & {
    auth: {
        sessionId: string
        user: PublicUser
    }
}

export function toAuthenticatedRequest(req: Request): AuthenticatedRequest {
    if (!req.auth) {
        throw new UnauthorizedError('Inicia sesión para continuar.', 'SESSION_MISSING')
    }

    return req as AuthenticatedRequest
}

function extractBearerToken(req: Request) {
    const [scheme, token, extra] = req.get('authorization')?.split(' ') ?? []

    return scheme === 'Bearer' && token && !extra ? token : null
}

// Verifica el JWT y, en la misma consulta que carga al usuario, que su sesión siga abierta.
// Así logout, logout-all, recuperación y cambios de credenciales invalidan de inmediato los
// access tokens emitidos, sin esperar a que venzan.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const accessToken = extractBearerToken(req)

        if (!accessToken) {
            throw new UnauthorizedError('Inicia sesión para continuar.', 'SESSION_MISSING')
        }

        const claims = await verifyAccessToken(accessToken)
        const session = await authRepository.findActiveSessionUser(claims.sessionId, claims.userId, new Date())

        if (!session) {
            throw new UnauthorizedError('Tu sesión se cerró. Vuelve a iniciar sesión.', 'SESSION_REVOKED')
        }

        req.auth = { sessionId: claims.sessionId, user: session.user }

        next()
    } catch (error) {
        next(error)
    }
}

export function requireRole(...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const authenticatedRequest = toAuthenticatedRequest(req)

        if (!roles.includes(authenticatedRequest.auth.user.role)) {
            return next(new ForbiddenError('No tienes permiso para hacer esto.'))
        }

        next()
    }
}

export function requireSelfOrRole(paramName: string, ...roles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const authenticatedRequest = toAuthenticatedRequest(req)

        if (authenticatedRequest.auth.user.id === req.params[paramName] || roles.includes(authenticatedRequest.auth.user.role)) {
            return next()
        }

        return next(new ForbiddenError('No tienes permiso para hacer esto.'))
    }
}
