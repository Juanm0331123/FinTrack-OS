import { Prisma, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { isUniqueViolation } from '../../config/database-errors.ts'
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/app-error.ts'
import { UsersRepository } from './users.repository.ts'
import type { CreateUserInput, ListUsersQueryInput, UpdateUserInput } from './users.schemas.ts'
import { CURRENT_PASSWORD_HASH_VERSION, type ListUsersResult, type PublicUser } from './users.types.ts'

const PASSWORD_HASH_ROUNDS = 12

const emailTaken = () => new ConflictError('Ya existe una cuenta con ese correo.', 'EMAIL_ALREADY_REGISTERED')

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
            throw new NotFoundError('No encontramos ese usuario.')
        }

        return user
    }

    async createUser(input: CreateUserInput) {
        const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)

        try {
            return await this.usersRepository.create({
                email: input.email,
                firstName: input.firstName,
                lastName: input.lastName,
                passwordHash,
                passwordHashVersion: CURRENT_PASSWORD_HASH_VERSION,
                ...(input.preferredCurrencyCode ? { preferredCurrencyCode: input.preferredCurrencyCode } : {}),
                ...(input.role ? { role: input.role } : {}),
                ...(input.status ? { status: input.status } : {}),
                ...(input.timezone ? { timezone: input.timezone } : {}),
            })
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw emailTaken()
            }

            throw error
        }
    }

    async updateUser(id: string, input: UpdateUserInput, actor: PublicUser) {
        await this.getUserById(id)

        if (actor.role !== 'ADMIN' && (input.role !== undefined || input.status !== undefined)) {
            throw new ForbiddenError('No puedes cambiar esos datos del usuario.')
        }

        const data: Prisma.UserUpdateInput = {}

        for (const key of ['firstName', 'lastName', 'preferredCurrencyCode', 'role', 'status', 'timezone'] as const) {
            if (input[key] !== undefined) {
                Object.assign(data, { [key]: input[key] })
            }
        }

        return this.usersRepository.update(id, data, {
            revokeSessions: input.status !== undefined && input.status !== UserStatus.ACTIVE,
        })
    }

    async deleteUser(id: string) {
        await this.getUserById(id)
        await this.usersRepository.softDelete(id, `deleted+${id}@fintrack.local`)

        return { id }
    }
}
