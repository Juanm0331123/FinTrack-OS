import compression from 'compression'
import cors, { type CorsOptions } from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.ts'
import { errorMiddleware } from './middlewares/error.middleware.ts'
import { apiRateLimiter } from './middlewares/rate-limit.middleware.ts'
import { apiRoutes } from './routes/index.ts'
import { ApiResponse } from './utils/api-response.ts'
import { ForbiddenError } from './utils/app-error.ts'

const corsOptions: CorsOptions = {
    origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(new ForbiddenError('Origin not allowed by CORS.'))
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    optionsSuccessStatus: 204,
}

export const app = express()

app.set('trust proxy', env.trustProxy)

app.use(helmet())
app.use(cors(corsOptions))
app.use(compression())
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use(express.json({ limit: env.JSON_BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: env.URLENCODED_BODY_LIMIT }))

app.use('/api', apiRateLimiter, apiRoutes)

app.use((_req, res) => {
    return res.status(404).json(ApiResponse.error('Route not found.'))
})

app.use(errorMiddleware)
