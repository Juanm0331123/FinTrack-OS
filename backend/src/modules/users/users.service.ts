import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ConflictError, NotFoundError } from '../../utils/app-error.ts'
import { UsersRepository } from './users.repository.ts'
import type {
    CreateUserInput,
    ListUsersQueryInput,
    UpdateUserInput,
} from './users.schemas.ts'
import type { ListUsersResult } from './users.types.ts'

export class UsersService {
    private readonly usersRepository: UsersRepository

    constructor(usersRepository = new UsersRepository()) {
        this.usersRepository = usersRepository
    }

    async getUsers(input: ListUsersQueryInput): Promise<ListUsersResult> {
        const page = input.page ?? 1
        const pageSize = input.pageSize ?? 10
        const search = input.search?.trim()
        const result = await this.usersRepository.findAll({
            page,
            pageSize,
            ...(input.role ? { role: input.role } : {}),
            ...(search ? { search } : {}),
            ...(input.status ? { status: input.status } : {}),
        })

        return {
            data: result.data,
            meta: {
                page,
                pageSize,
                totalItems: result.totalItems,
                totalPages: Math.max(1, Math.ceil(result.totalItems / pageSize)),
            },
        }
    }

    async getUserById(id: string) {
        const user = await this.usersRepository.findActiveById(id)

        if (!user) {
            throw new NotFoundError('User not found.')
        }

        return user
    }

    async createUser(input: CreateUserInput) {
        const email = this.normalizeEmail(input.email)
        const existingUser = await this.usersRepository.findActiveByEmail(email)

        if (existingUser) {
            throw new ConflictError('Email already exists.')
        }

        const passwordHash = await bcrypt.hash(input.password, 12)

        return this.usersRepository.create({
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            passwordHash,
            ...(input.preferredCurrencyCode
                ? { preferredCurrencyCode: input.preferredCurrencyCode }
                : {}),
            ...(input.role ? { role: input.role } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.timezone ? { timezone: input.timezone } : {}),
        })
    }

    async updateUser(id: string, input: UpdateUserInput) {
        await this.getUserById(id)
        const data: Prisma.UserUpdateInput = {}

        if (input.email) {
            const normalizedEmail = this.normalizeEmail(input.email)
            const existingUser = await this.usersRepository.findActiveByEmail(normalizedEmail)

            if (existingUser && existingUser.id !== id) {
                throw new ConflictError('Email already exists.')
            }

            data.email = normalizedEmail
        }

        if (input.firstName !== undefined) {
            data.firstName = input.firstName
        }

        if (input.lastName !== undefined) {
            data.lastName = input.lastName
        }

        if (input.password) {
            data.passwordHash = await bcrypt.hash(input.password, 12)
        }

        if (input.preferredCurrencyCode !== undefined) {
            data.preferredCurrencyCode = input.preferredCurrencyCode
        }

        if (input.role !== undefined) {
            data.role = input.role
        }

        if (input.status !== undefined) {
            data.status = input.status
        }

        if (input.timezone !== undefined) {
            data.timezone = input.timezone
        }

        return this.usersRepository.update(id, data)
    }

    async deleteUser(id: string) {
        await this.getUserById(id)
        const tombstoneEmail = this.buildDeletedEmail(id)

        await this.usersRepository.softDelete(id, tombstoneEmail)

        return { id }
    }

    private buildDeletedEmail(userId: string) {
        return `deleted+${userId}@fintrack.local`
    }

    private normalizeEmail(email: string) {
        return email.trim().toLowerCase()
    }
}
