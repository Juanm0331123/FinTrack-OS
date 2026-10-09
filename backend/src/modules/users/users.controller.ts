import type { Request, Response } from 'express'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import type { CreateUserInput, ListUsersQueryInput, UpdateUserInput } from './users.schemas.ts'
import { UsersService } from './users.service.ts'

function idParam(req: Request) {
    return String((req.params as Record<string, string>).id)
}

export class UsersController {
    private readonly usersService: UsersService

    constructor(usersService = new UsersService()) {
        this.usersService = usersService
    }

    getUsers = async (req: Request, res: Response) => {
        const result = await this.usersService.getUsers(req.query as unknown as ListUsersQueryInput)

        return res.status(200).json(ApiResponse.paginated(result.data, result.meta))
    }

    getUserById = async (req: Request, res: Response) => {
        const user = await this.usersService.getUserById(idParam(req))

        return res.status(200).json(ApiResponse.success(user))
    }

    createUser = async (req: Request, res: Response) => {
        const user = await this.usersService.createUser(req.body as CreateUserInput)

        return res.status(201).json(ApiResponse.success(user))
    }

    updateUser = async (req: Request, res: Response) => {
        const user = await this.usersService.updateUser(
            idParam(req),
            req.body as UpdateUserInput,
            toAuthenticatedRequest(req).auth.user,
        )

        return res.status(200).json(ApiResponse.success(user))
    }

    deleteUser = async (req: Request, res: Response) => {
        const deletedUser = await this.usersService.deleteUser(idParam(req))

        return res.status(200).json(ApiResponse.success(deletedUser))
    }
}
