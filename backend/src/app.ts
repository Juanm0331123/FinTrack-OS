import './config/zod-locale.ts'
import compression from 'compression'
import cors, { type CorsOptions } from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { env } from './config/env.ts'
import { clientIpMiddleware, requireEdgeProxy } from './middlewares/edge-proxy.middleware.ts'
import { errorMiddleware } from './middlewares/error.middleware.ts'
import { invalidCredentialRateLimiter, perimeterRateLimiter } from './middlewares/rate-limit.middleware.ts'
import { requestContextMiddleware } from './middlewares/request-context.middleware.ts'
import { requestDeadline } from './middlewares/request-deadline.middleware.ts'
import { apiRoutes } from './routes/index.ts'
import { ApiResponse } from './utils/api-response.ts'
import { ForbiddenError } from './utils/app-error.ts'

const corsOptions: CorsOptions = {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    optionsSuccessStatus: 204,
    origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(new ForbiddenError('Origen no permitido.', 'ORIGIN_NOT_ALLOWED'))
    },
}

function isHealthPath(req: Request) {
    return req.path === '/health' || req.path.startsWith('/health/')
}

function unlessHealth(middleware: (req: Request, res: Response, next: NextFunction) => unknown) {
    return (req: Request, res: Response, next: NextFunction) => (isHealthPath(req) ? next() : middleware(req, res, next))
}

function noStore(_req: Request, res: Response, next: NextFunction) {
    res.setHeader('Cache-Control', 'no-store')
    next()
}

export const app = express()

app.set('trust proxy', env.trustProxy)
app.disable('x-powered-by')

app.use(requestContextMiddleware)
app.use(clientIpMiddleware)
// Antes de CORS y del perímetro: también sus rechazos (403, 429) llevan no-store.
app.use('/api', noStore)
app.use(helmet())
app.use(cors(corsOptions))

// Protección perimetral antes de cualquier trabajo costoso: sin secreto de borde no hay tráfico
// de negocio, y el límite por IP corta ráfagas antes de parsear, verificar JWT o consultar la base.
app.use('/api', unlessHealth(requireEdgeProxy), perimeterRateLimiter, requestDeadline)
app.use(compression())
app.use(express.json({ limit: env.JSON_BODY_LIMIT }))
app.use('/api', unlessHealth(invalidCredentialRateLimiter), apiRoutes)

app.use((_req, res) => res.status(404).json(ApiResponse.error('No encontramos esa ruta.', undefined, 'NOT_FOUND')))

app.use(errorMiddleware)
