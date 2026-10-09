import type { Prisma, UserRole, UserStatus } from '@prisma/client'

// 1 = hash heredado (contraseñas de más de 72 bytes truncadas por bcrypt); 2 = hash creado con
// la regla vigente de máximo 72 bytes.
export const CURRENT_PASSWORD_HASH_VERSION = 2

export const publicUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
    role: true,
    preferredCurrencyCode: true,
    timezone: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{
    select: typeof publicUserSelect
}>

export type ListUsersQuery = {
    page: number
    pageSize: number
    role?: UserRole
    search?: string
    status?: UserStatus
}

export type ListUsersResult = {
    data: PublicUser[]
    meta: {
        page: number
        pageSize: number
        totalItems: number
        totalPages: number
    }
}
