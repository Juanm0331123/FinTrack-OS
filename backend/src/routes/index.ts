import { Router } from 'express'
import { env } from '../config/env.ts'
import { authRoutes } from '../modules/auth/auth.routes.ts'
import { financeRoutes } from '../modules/finance/finance.routes.ts'
import { usersRoutes } from '../modules/users/users.routes.ts'
import { ApiResponse } from '../utils/api-response.ts'

export const apiRoutes = Router()

apiRoutes.get('/health', (_req, res) => {
    return res.status(200).json(
        ApiResponse.success({
            environment: env.NODE_ENV,
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
        }),
    )
})

apiRoutes.use('/auth', authRoutes)
apiRoutes.use('/', financeRoutes)
apiRoutes.use('/users', usersRoutes)
