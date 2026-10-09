import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'
import { ForbiddenError } from '../utils/app-error.ts'

// Defensa CSRF para endpoints autenticados con la cookie de refresh. SameSite=Lax ya impide el
// envío de la cookie en POST entre sitios; esta comprobación lo hace explícito y no depende del
// navegador: una petición de navegador entre sitios trae Origin o Sec-Fetch-Site. Los clientes
// que no son navegador (sin esas cabeceras) no son vector de CSRF.
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
    const origin = req.get('origin')
    const fetchSite = req.get('sec-fetch-site')

    if (fetchSite === 'cross-site' || (origin && !env.allowedOrigins.includes(origin))) {
        return next(new ForbiddenError('Origen no permitido.', 'ORIGIN_NOT_ALLOWED'))
    }

    return next()
}
