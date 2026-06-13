import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { env } from './env.ts'

const globalForPrisma = globalThis as typeof globalThis & {
    pgPool?: Pool
    prisma?: PrismaClient
}

const pool =
    globalForPrisma.pgPool ??
    new Pool({
        connectionString: env.DATABASE_URL,
    })

const adapter = new PrismaPg(pool)

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })

if (env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool
    globalForPrisma.prisma = prisma
}

export async function disconnectPrisma() {
    await prisma.$disconnect()
    await pool.end()
}
