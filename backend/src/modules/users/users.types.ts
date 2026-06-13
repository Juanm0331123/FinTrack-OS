import type { Prisma, UserRole, UserStatus } from '@prisma/client'

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
