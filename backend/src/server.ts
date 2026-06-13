import 'dotenv/config'
import { app } from './app.ts'
import { env } from './config/env.ts'
import { disconnectPrisma } from './config/prisma.ts'

const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`)
})

async function shutdown(signal: string) {
    console.log(`Received ${signal}. Shutting down gracefully...`)

    server.close(async () => {
        await disconnectPrisma()
        process.exit(0)
    })
}

process.once('SIGINT', () => {
    void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
})
