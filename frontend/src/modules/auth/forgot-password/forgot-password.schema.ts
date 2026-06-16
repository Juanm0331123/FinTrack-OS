import { z } from 'zod'

export const forgotPasswordRequestSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Ingresa un correo valido.')
        .max(255, 'El correo no puede superar 255 caracteres.'),
})

export const forgotPasswordResetSchema = z
    .object({
        confirmPassword: z.string(),
        password: z
            .string()
            .min(8, 'La contrasena debe tener al menos 8 caracteres.')
            .max(72, 'La contrasena no puede superar 72 caracteres.'),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: 'Las contrasenas no coinciden.',
        path: ['confirmPassword'],
    })

export type ForgotPasswordRequestValues = z.infer<
    typeof forgotPasswordRequestSchema
>
export type ForgotPasswordResetValues = z.infer<
    typeof forgotPasswordResetSchema
>
