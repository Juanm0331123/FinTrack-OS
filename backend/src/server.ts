import { app } from './app.ts'
import { env } from './config/env.ts'
import { createGracefulShutdown } from './config/graceful-shutdown.ts'
import { describeError, logger } from './config/logger.ts'
import { startMetricsReporter } from './config/metrics.ts'
import { disconnectPrisma } from './config/prisma.ts'

const server = app.listen(env.PORT, () => {
    logger.info('server_started', { environment: env.NODE_ENV, port: env.PORT })
})

// Recepción del request acotada; el trabajo del handler lo acota requestDeadline.
server.requestTimeout = env.REQUEST_TIMEOUT_MS + 5000
server.headersTimeout = 15_000

const stopMetrics = startMetricsReporter(env.METRICS_LOG_INTERVAL_MS)

const shutdown = createGracefulShutdown({
    closeResources: async () => {
        stopMetrics()
        await disconnectPrisma()
    },
    exit: (code) => process.exit(code),
    server,
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
})

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', describeError(reason))
})

process.on('uncaughtException', (error) => {
    logger.error('uncaught_exception', describeError(error))
    void shutdown('uncaughtException', { exitCode: 1 })
})
