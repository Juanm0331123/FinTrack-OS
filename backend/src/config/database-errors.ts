import { Prisma } from '@prisma/client'

export type DatabaseErrorKind =
    | 'busy'
    | 'foreign_key'
    | 'not_found'
    | 'unavailable'
    | 'unique'

// Códigos de PostgreSQL que indican contención temporal: la operación puede reintentarse.
const BUSY_SQLSTATES = new Set(['40001', '40P01', '55P03', '57014'])
const UNAVAILABLE_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2028'])
const UNAVAILABLE_MESSAGES = [
    'timeout exceeded when trying to connect',
    'Connection terminated',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
]

function driverSqlState(error: Prisma.PrismaClientKnownRequestError) {
    const cause = (error.meta?.driverAdapterError as { cause?: { originalCode?: unknown } } | undefined)?.cause

    return typeof cause?.originalCode === 'string' ? cause.originalCode : undefined
}

export function classifyDatabaseError(error: unknown): DatabaseErrorKind | null {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const sqlState = driverSqlState(error)

        if (sqlState && BUSY_SQLSTATES.has(sqlState)) {
            return 'busy'
        }

        if (error.code === 'P2002') {
            return 'unique'
        }

        if (error.code === 'P2003') {
            return 'foreign_key'
        }

        if (error.code === 'P2025') {
            return 'not_found'
        }

        if (UNAVAILABLE_PRISMA_CODES.has(error.code)) {
            return 'unavailable'
        }

        return null
    }

    if (
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientRustPanicError
    ) {
        return 'unavailable'
    }

    if (error instanceof Error && UNAVAILABLE_MESSAGES.some((message) => error.message.includes(message))) {
        return 'unavailable'
    }

    return null
}

export function isUniqueViolation(error: unknown) {
    return classifyDatabaseError(error) === 'unique'
}

export function isForeignKeyViolation(error: unknown) {
    return classifyDatabaseError(error) === 'foreign_key'
}
