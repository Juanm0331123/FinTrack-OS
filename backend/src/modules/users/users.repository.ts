import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.ts'
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
                          {
                              email: {
                                  contains: filters.search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              firstName: {
                                  contains: filters.search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              lastName: {
                                  contains: filters.search,
                                  mode: 'insensitive',
                              },
                          },
                      ],
                  }
                : {}),
        }

        const skip = (filters.page - 1) * filters.pageSize

        const [data, totalItems] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                select: publicUserSelect,
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: filters.pageSize,
            }),
            prisma.user.count({ where }),
        ])

        return { data, totalItems }
    }

    findActiveById(id: string) {
        return prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            select: publicUserSelect,
        })
    }

    findActiveByEmail(email: string) {
        return prisma.user.findFirst({
            where: {
                email,
                deletedAt: null,
            },
            select: publicUserSelect,
        })
    }

    create(data: Prisma.UserCreateInput) {
        return prisma.user.create({
            data,
            select: publicUserSelect,
        })
    }

    update(id: string, data: Prisma.UserUpdateInput) {
        return prisma.user.update({
            where: {
                id,
            },
            data,
            select: publicUserSelect,
        })
    }

    softDelete(id: string, tombstoneEmail: string) {
        return prisma.user.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                email: tombstoneEmail,
                status: 'INACTIVE',
            },
            select: {
                id: true,
            },
        })
    }
}
