import type { Server } from 'node:http'
import { markShuttingDown } from './lifecycle.ts'
import { describeError, logger } from './logger.ts'

// Cloud Run envía SIGTERM y mata el proceso 10 s después. El cierre:
// 1. marca readiness en 503 y deja de aceptar conexiones nuevas;
// 2. espera a que terminen las peticiones en curso hasta `timeoutMs - forceCloseMarginMs`;
// 3. corta las conexiones restantes, cierra Prisma y el pool, y sale.
// Si algo se cuelga, un temporizador duro sale con código 1 antes del SIGKILL.
export function createGracefulShutdown(options: {
    closeResources: () => Promise<void>
    exit: (code: number) => void
    forceCloseMarginMs?: number
    server: Server
    timeoutMs: number
}) {
    const forceCloseMarginMs = options.forceCloseMarginMs ?? 1500
    let shutdownPromise: Promise<void> | null = null

    return function shutdown(reason: string) {
        shutdownPromise ??= (async () => {
            const startedAt = Date.now()
            let exitCode = 0

            markShuttingDown()
            logger.info('shutdown_started', { reason, timeoutMs: options.timeoutMs })

            const hardTimer = setTimeout(() => {
                logger.error('shutdown_deadline_exceeded', { elapsedMs: Date.now() - startedAt })
                options.exit(1)
            }, options.timeoutMs)
            const forceTimer = setTimeout(() => {
                logger.warn('shutdown_forcing_connections_closed')
                options.server.closeAllConnections()
            }, Math.max(0, options.timeoutMs - forceCloseMarginMs))

            try {
                await new Promise<void>((resolve) => {
                    options.server.close(() => resolve())
                    options.server.closeIdleConnections()
                })
            } finally {
                clearTimeout(forceTimer)
            }

            try {
                await options.closeResources()
            } catch (error) {
                exitCode = 1
                logger.error('shutdown_resource_close_failed', describeError(error))
            }

            clearTimeout(hardTimer)
            logger.info('shutdown_completed', { elapsedMs: Date.now() - startedAt, exitCode })
            options.exit(exitCode)
        })()

        return shutdownPromise
    }
}
