import { z } from 'zod'

// bcrypt solo usa los primeros 72 bytes de la contraseña. Contar caracteres no basta: una tilde
// ocupa 2 bytes y un emoji 4. Las contraseñas nuevas se limitan por bytes para que dos claves
// distintas nunca produzcan el mismo hash.
export const BCRYPT_MAX_PASSWORD_BYTES = 72
const LEGACY_LOGIN_MAX_LENGTH = 512

export function utf8ByteLength(value: string) {
    return Buffer.byteLength(value, 'utf8')
}

export const emailSchema = z
    .string({ error: 'El correo es obligatorio.' })
    .trim()
    .max(255, 'El correo no puede superar 255 caracteres.')
    .pipe(z.email('Correo inválido.'))
    .transform((value) => value.toLowerCase())

export const newPasswordSchema = z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .refine(
        (value) => utf8ByteLength(value) <= BCRYPT_MAX_PASSWORD_BYTES,
        'La contraseña es demasiado larga: usa máximo 72 bytes (las tildes y los emojis ocupan más de uno).',
    )

// En el login se acepta la longitud que permitía la versión anterior para que las cuentas
// existentes puedan autenticarse; el servicio exige actualizar las que superan 72 bytes.
const loginPasswordSchema = z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.')
    .max(LEGACY_LOGIN_MAX_LENGTH, 'La contraseña es demasiado larga.')

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
    .regex(/^[A-Za-z]{3}$/, 'La moneda debe tener 3 letras.')
    .transform((value) => value.toUpperCase())

const timezoneSchema = z
    .string()
    .trim()
    .min(1, 'La zona horaria es obligatoria.')
    .max(100, 'La zona horaria no puede superar 100 caracteres.')

const deviceNameSchema = z
    .string()
    .trim()
    .min(1, 'El nombre del dispositivo no puede estar vacío.')
    .max(150, 'El nombre del dispositivo no puede superar 150 caracteres.')

const sixDigitCodeSchema = z
    .string({ error: 'El código es obligatorio.' })
    .trim()
    .regex(/^\d{6}$/, 'El código debe tener 6 dígitos.')

export const registerSchema = z.object({
    body: z
        .object({
            email: emailSchema,
            firstName: firstNameSchema,
            lastName: lastNameSchema.optional().nullable(),
            password: newPasswordSchema,
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
            password: loginPasswordSchema,
        })
        .strict(),
})

export const verifyEmailSchema = z.object({
    body: z
        .object({
            code: sixDigitCodeSchema,
            deviceName: deviceNameSchema.optional(),
            email: emailSchema,
            // Obligatoria cuando el código lo emitió un registro o login con contraseña.
            password: loginPasswordSchema.optional(),
        })
        .strict(),
})

export const resendEmailCodeSchema = z.object({
    body: z.object({ email: emailSchema }).strict(),
})

export const requestPasswordResetSchema = z.object({
    body: z.object({ email: emailSchema }).strict(),
})

export const verifyPasswordResetCodeSchema = z.object({
    body: z.object({ code: sixDigitCodeSchema, email: emailSchema }).strict(),
})

export const resetPasswordSchema = z.object({
    body: z
        .object({
            email: emailSchema,
            password: newPasswordSchema,
            resetToken: z
                .string({ error: 'La autorización de recuperación es obligatoria.' })
                .trim()
                .min(1, 'La autorización de recuperación es obligatoria.')
                .max(255, 'La autorización de recuperación no es válida.'),
        })
        .strict(),
})

// El refresh token solo viaja en la cookie HttpOnly: nunca en el cuerpo ni en cabeceras.
export const refreshSessionSchema = z.object({
    body: z.object({ deviceName: deviceNameSchema.optional() }).strict().optional(),
})

export const logoutSchema = z.object({
    body: z.object({}).strict().optional(),
})

export const changePasswordSchema = z.object({
    body: z
        .object({
            currentPassword: loginPasswordSchema,
            newPassword: newPasswordSchema,
        })
        .strict()
        .refine((value) => value.currentPassword !== value.newPassword, {
            message: 'La nueva contraseña debe ser distinta de la actual.',
            path: ['newPassword'],
        }),
})

export const requestEmailChangeSchema = z.object({
    body: z
        .object({
            currentPassword: loginPasswordSchema,
            newEmail: emailSchema,
        })
        .strict(),
})

export const confirmEmailChangeSchema = z.object({
    body: z.object({ code: sixDigitCodeSchema }).strict(),
})

export const oauthStartSchema = z.object({
    query: z
        .object({ intent: z.enum(['login', 'register']).default('login') })
        .strip(),
})

export const oauthCallbackSchema = z.object({
    query: z
        .object({
            code: z.string().trim().min(1).max(2048).optional(),
            error: z.string().trim().min(1).max(200).optional(),
            error_description: z.string().trim().max(500).optional(),
            state: z.string().trim().min(1).max(200).optional(),
        })
        .strip()
        .refine((value) => Boolean(value.error) || Boolean(value.code && value.state), {
            message: 'La respuesta del proveedor no es válida.',
            path: [],
        }),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body']
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
export type RegisterInput = z.infer<typeof registerSchema>['body']
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>['body']
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>['body']
export type ResendEmailCodeInput = z.infer<typeof resendEmailCodeSchema>['body']
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body']
export type VerifyEmailCodeInput = z.infer<typeof verifyEmailSchema>['body']
export type VerifyPasswordResetCodeInput = z.infer<typeof verifyPasswordResetCodeSchema>['body']
