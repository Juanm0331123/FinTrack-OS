import { Router } from 'express'
import { validate } from '../../middlewares/validate.middleware.ts'
import { UsersController } from './users.controller.ts'
import { UsersRepository } from './users.repository.ts'
import {
    createUserSchema,
    listUsersQuerySchema,
    updateUserSchema,
    userIdParamSchema,
} from './users.schemas.ts'
import { UsersService } from './users.service.ts'

const router = Router()
const usersRepository = new UsersRepository()
const usersService = new UsersService(usersRepository)
const usersController = new UsersController(usersService)

router.get('/', validate(listUsersQuerySchema), usersController.getUsers)

router.get('/:id', validate(userIdParamSchema), usersController.getUserById)

router.post('/', validate(createUserSchema), usersController.createUser)

router.patch('/:id', validate(updateUserSchema), usersController.updateUser)

router.delete('/:id', validate(userIdParamSchema), usersController.deleteUser)

export { router as usersRoutes }
