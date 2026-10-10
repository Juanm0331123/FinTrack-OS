import { randomUUID } from 'node:crypto'
import { SessionRevokeReason, UserStatus, type Prisma } from '@prisma/client'
import { prisma, withTransaction } from '../../config/prisma.ts'
import { publicUserSelect, type ListUsersQuery } from './users.types.ts'

export class UsersRepository {
    async findAll(filters: ListUsersQuery) {
        const where: Prisma.UserWhereInput = {
            deletedAt: null,
            ...(filters.role ? { role: filters.role } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.search
                ? {
                      OR: [
                          { email: { contains: filters.search, mode: 'insensitive' } },
                          { firstName: { contains: filters.search, mode: 'insensitive' } },
                          { lastName: { contains: filters.search, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        }
        const skip = (filters.page - 1) * filters.pageSize
        const [data, totalItems] = await prisma.$transaction([
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                select: publicUserSelect,
                skip,
                take: filters.pageSize,
                where,
            }),
            prisma.user.count({ where }),
        ])

        return { data, totalItems }
    }

    findActiveById(id: string) {
        return prisma.user.findFirst({ select: publicUserSelect, where: { deletedAt: null, id } })
    }

    create(data: Prisma.UserCreateInput) {
        return prisma.user.create({ data, select: publicUserSelect })
    }

    update(id: string, data: Prisma.UserUpdateInput, options: { revokeSessions: boolean }) {
        return withTransaction(async (transaction) => {
            // Un cambio de estado rota el sello: un login que ya validó la contraseña no puede
            // abrir sesión con el estado anterior (RAUTH-02).
            const user = await transaction.user.update({
                data: data.status !== undefined ? { ...data, securityStamp: randomUUID() } : data,
                select: publicUserSelect,
                where: { id },
            })

            if (options.revokeSessions) {
                await transaction.authSession.updateMany({
                    data: { revokedAt: new Date(), revokeReason: SessionRevokeReason.LOGOUT_ALL },
                    where: { revokedAt: null, userId: id },
                })
            }

            return user
        })
    }

    softDelete(id: string, tombstoneEmail: string) {
        return withTransaction(async (transaction) => {
            await transaction.user.update({
                data: {
                    deletedAt: new Date(),
                    email: tombstoneEmail,
                    securityStamp: randomUUID(),
                    status: UserStatus.INACTIVE,
                },
                where: { id },
            })
            await transaction.authSession.updateMany({
                data: { revokedAt: new Date(), revokeReason: SessionRevokeReason.LOGOUT_ALL },
                where: { revokedAt: null, userId: id },
            })
        })
    }
}
