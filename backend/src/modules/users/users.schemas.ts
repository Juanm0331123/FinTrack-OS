import { UserRole, UserStatus } from '@prisma/client'
import { z } from 'zod'
import { emailSchema, newPasswordSchema } from '../auth/auth.schemas.ts'

const firstNameSchema = z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100, 'El nombre no puede superar 100 caracteres.')

const lastNameSchema = z
    .string()
    .trim()
    .min(1, 'El apellido no puede estar vacío.')
    .max(100, 'El apellido no puede superar 100 caracteres.')

const currencyCodeSchema = z
    .string()
    .trim()
    .length(3, 'La moneda debe tener 3 caracteres.')
    .transform((value) => value.toUpperCase())

const timezoneSchema = z
    .string()
    .trim()
    .min(1, 'La zona horaria es obligatoria.')
    .max(100, 'La zona horaria no puede superar 100 caracteres.')

export const createUserSchema = z.object({
    body: z
        .object({
            email: emailSchema,
            firstName: firstNameSchema,
            lastName: lastNameSchema.optional().nullable(),
            password: newPasswordSchema,
            preferredCurrencyCode: currencyCodeSchema.optional(),
            role: z.enum(UserRole).optional(),
            status: z.enum(UserStatus).optional(),
            timezone: timezoneSchema.optional(),
        })
        .strict(),
})

export const updateUserSchema = z.object({
    params: z.object({
        id: z.uuid('ID inválido.'),
    }),
    // El correo y la contraseña no se cambian aquí: requieren reautenticación y confirmación
    // (POST /api/auth/password y /api/auth/email-change).
    body: z
        .object({
            firstName: firstNameSchema.optional(),
            lastName: lastNameSchema.optional().nullable(),
            preferredCurrencyCode: currencyCodeSchema.optional(),
            role: z.enum(UserRole).optional(),
            status: z.enum(UserStatus).optional(),
            timezone: timezoneSchema.optional(),
        })
        .strict()
        .refine((data) => Object.keys(data).length > 0, {
            message: 'Debes enviar al menos un campo para actualizar.',
            path: [],
        }),
})

export const userIdParamSchema = z.object({
    params: z.object({
        id: z.uuid('ID inválido.'),
    }),
})

export const listUsersQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        role: z.enum(UserRole).optional(),
        search: z
            .string()
            .trim()
            .min(1, 'La búsqueda no puede estar vacía.')
            .max(255, 'La búsqueda no puede superar 255 caracteres.')
            .optional(),
        status: z.enum(UserStatus).optional(),
    }),
})

export type CreateUserInput = z.infer<typeof createUserSchema>['body']
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>['query']
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body']
export type UserIdParamInput = z.infer<typeof userIdParamSchema>['params']
