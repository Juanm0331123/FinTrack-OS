import { Router } from 'express'
import {
    requireAuth,
    requireRole,
    requireSelfOrRole,
} from '../../middlewares/auth.middleware.ts'
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

router.use(requireAuth)

router.get(
    '/',
    requireRole('ADMIN'),
    validate(listUsersQuerySchema),
    usersController.getUsers,
)

router.get(
    '/:id',
    validate(userIdParamSchema),
    requireSelfOrRole('id', 'ADMIN'),
    usersController.getUserById,
)

router.post(
    '/',
    requireRole('ADMIN'),
    validate(createUserSchema),
    usersController.createUser,
)

router.patch(
    '/:id',
    validate(updateUserSchema),
    requireSelfOrRole('id', 'ADMIN'),
    usersController.updateUser,
)

router.delete(
    '/:id',
    validate(userIdParamSchema),
    requireSelfOrRole('id', 'ADMIN'),
    usersController.deleteUser,
)

export { router as usersRoutes }
