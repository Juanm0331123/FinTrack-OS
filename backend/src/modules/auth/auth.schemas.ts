import { z } from 'zod'

const emailSchema = z
    .string()
    .trim()
    .email('Email invalido.')
    .max(255, 'El email no puede superar 255 caracteres.')

const passwordSchema = z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres.')
    .max(72, 'La contrasena no puede superar 72 caracteres.')

const firstNameSchema = z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100, 'El nombre no puede superar 100 caracteres.')

const lastNameSchema = z
    .string()
    .trim()
    .min(1, 'El apellido no puede estar vacio.')
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

const deviceNameSchema = z
    .string()
    .trim()
    .min(1, 'El nombre del dispositivo no puede estar vacio.')
    .max(150, 'El nombre del dispositivo no puede superar 150 caracteres.')

const refreshTokenSchema = z
    .string()
    .trim()
    .min(1, 'El refresh token es obligatorio.')
    .max(4096, 'El refresh token es demasiado largo.')

export const registerSchema = z.object({
    body: z
        .object({
            email: emailSchema,
            firstName: firstNameSchema,
            lastName: lastNameSchema.optional().nullable(),
            password: passwordSchema,
            preferredCurrencyCode: currencyCodeSchema.optional(),
            timezone: timezoneSchema.optional(),
        })
        .strict(),
})

export const loginSchema = z.object({
    body: z
        .object({
            deviceName: deviceNameSchema.optional(),
            email: emailSchema,
            password: passwordSchema,
        })
        .strict(),
})

export const verifyEmailSchema = z.object({
    body: z
        .object({
            code: z
                .string()
                .trim()
                .regex(/^\d{6}$/, 'El codigo debe tener 6 digitos.'),
            deviceName: deviceNameSchema.optional(),
            email: emailSchema,
        })
        .strict(),
})

export const resendEmailCodeSchema = z.object({
    body: z
        .object({
            email: emailSchema,
        })
        .strict(),
})

export const requestPasswordResetSchema = z.object({
    body: z
        .object({
            email: emailSchema,
        })
        .strict(),
})

export const verifyPasswordResetCodeSchema = z.object({
    body: z
        .object({
            code: z
                .string()
                .trim()
                .regex(/^\d{6}$/, 'El codigo debe tener 6 digitos.'),
            email: emailSchema,
        })
        .strict(),
})

export const resetPasswordSchema = z.object({
    body: z
        .object({
            email: emailSchema,
            password: passwordSchema,
            resetToken: z
                .string()
                .trim()
                .min(1, 'El token de recuperacion es obligatorio.')
                .max(255, 'El token de recuperacion es demasiado largo.'),
        })
        .strict(),
})

export const legacyVerifyEmailSchema = z.object({
    body: z
        .object({
            token: z
                .string()
                .trim()
                .min(1, 'El token es obligatorio.')
                .max(255, 'El token no puede superar 255 caracteres.'),
        })
        .strict(),
})

export const refreshSessionSchema = z.object({
    body: z
        .object({
            deviceName: deviceNameSchema.optional(),
            refreshToken: refreshTokenSchema.optional(),
        })
        .strict(),
})

export const logoutSchema = z.object({
    body: z
        .object({
            refreshToken: refreshTokenSchema.optional(),
        })
        .strict(),
})

export const oauthCallbackSchema = z.object({
    query: z
        .object({
            code: z.string().trim().min(1).optional(),
            error: z.string().trim().min(1).optional(),
            error_description: z.string().trim().min(1).optional(),
            state: z.string().trim().min(1).optional(),
        })
        .refine((value) => Boolean(value.error) || Boolean(value.code && value.state), {
            message: 'OAuth callback query invalida.',
            path: [],
        }),
})

export type LoginInput = z.infer<typeof loginSchema>['body']
export type LogoutInput = z.infer<typeof logoutSchema>['body']
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>['body']
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>['body']
export type RegisterInput = z.infer<typeof registerSchema>['body']
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body']
export type ResendEmailCodeInput = z.infer<typeof resendEmailCodeSchema>['body']
export type VerifyEmailCodeInput = z.infer<typeof verifyEmailSchema>['body']
export type VerifyPasswordResetCodeInput = z.infer<
    typeof verifyPasswordResetCodeSchema
>['body']
