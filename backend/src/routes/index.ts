import { Router, type Request, type Response } from 'express'
import { isShuttingDown } from '../config/lifecycle.ts'
import { checkDatabase } from '../config/prisma.ts'
import { authRoutes } from '../modules/auth/auth.routes.ts'
import { financeRoutes } from '../modules/finance/finance.routes.ts'
import { usersRoutes } from '../modules/users/users.routes.ts'
import { ApiResponse } from '../utils/api-response.ts'

const READINESS_DB_TIMEOUT_MS = 2000

export const apiRoutes = Router()

// Liveness: el proceso responde. No consulta dependencias, para que una caída de Neon no haga
// que Cloud Run reinicie instancias sanas en bucle.
function liveness(_req: Request, res: Response) {
    return res.status(200).json(ApiResponse.success({ status: 'ok' }))
}

apiRoutes.get('/health', liveness)
apiRoutes.get('/health/live', liveness)

// Readiness: el proceso puede atender tráfico que requiere base de datos. Comprobación acotada,
// sin detalles internos en la respuesta.
apiRoutes.get('/health/ready', async (_req, res) => {
    if (isShuttingDown()) {
        return res.status(503).json(ApiResponse.error('El servicio se está deteniendo.', undefined, 'SHUTTING_DOWN'))
    }

    if (!(await checkDatabase(READINESS_DB_TIMEOUT_MS))) {
        res.setHeader('Retry-After', '5')

        return res.status(503).json(ApiResponse.error('El servicio no está listo.', undefined, 'NOT_READY'))
    }

    return res.status(200).json(ApiResponse.success({ status: 'ready' }))
})

apiRoutes.use('/auth', authRoutes)
apiRoutes.use('/finance', financeRoutes)
apiRoutes.use('/users', usersRoutes)
