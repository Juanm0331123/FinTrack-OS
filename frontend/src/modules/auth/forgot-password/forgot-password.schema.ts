import { z } from 'zod'

export const forgotPasswordRequestSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Ingresa un correo válido.')
        .max(255, 'El correo no puede superar 255 caracteres.'),
})

export const forgotPasswordResetSchema = z
    .object({
        confirmPassword: z.string(),
        password: z
            .string()
            .min(8, 'La contraseña debe tener al menos 8 caracteres.')
            .max(72, 'La contraseña no puede superar 72 caracteres.'),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: 'Las contraseñas no coinciden.',
        path: ['confirmPassword'],
    })

export type ForgotPasswordRequestValues = z.infer<
    typeof forgotPasswordRequestSchema
>
export type ForgotPasswordResetValues = z.infer<
    typeof forgotPasswordResetSchema
>
