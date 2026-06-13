import type { Request, Response } from 'express'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import {
    createUserSchema,
    listUsersQuerySchema,
    updateUserSchema,
    userIdParamSchema,
} from './users.schemas.ts'
import { UsersService } from './users.service.ts'

export class UsersController {
    private readonly usersService: UsersService

    constructor(usersService = new UsersService()) {
        this.usersService = usersService
    }

    getUsers = async (req: Request, res: Response) => {
        const query = listUsersQuerySchema.shape.query.parse(req.query)
        const result = await this.usersService.getUsers(query)

        return res.status(200).json(ApiResponse.paginated(result.data, result.meta))
    }

    getUserById = async (req: Request, res: Response) => {
        const { id } = userIdParamSchema.shape.params.parse(req.params)
        const user = await this.usersService.getUserById(id)

        return res.status(200).json(ApiResponse.success(user))
    }

    createUser = async (req: Request, res: Response) => {
        const body = createUserSchema.shape.body.parse(req.body)
        const user = await this.usersService.createUser(body)

        return res.status(201).json(ApiResponse.success(user))
    }

    updateUser = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { id } = updateUserSchema.shape.params.parse(req.params)
        const body = updateUserSchema.shape.body.parse(req.body)
        const user = await this.usersService.updateUser(
            id,
            body,
            authenticatedRequest.auth.user,
        )

        return res.status(200).json(ApiResponse.success(user))
    }

    deleteUser = async (req: Request, res: Response) => {
        const { id } = userIdParamSchema.shape.params.parse(req.params)
        const deletedUser = await this.usersService.deleteUser(id)

        return res.status(200).json(ApiResponse.success(deletedUser))
    }
}
