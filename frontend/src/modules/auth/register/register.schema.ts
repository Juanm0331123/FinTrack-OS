import { z } from 'zod/v4'

import { fitsPasswordBytes, PASSWORD_TOO_LONG_MESSAGE } from '../password-rules'

export const registerSchema = z
    .object({
        confirmPassword: z
            .string()
            .min(1, 'Confirma tu contraseña.')
            .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
        email: z
            .string()
            .min(1, 'Ingresa tu correo.')
            .email('Ingresa un correo válido.'),
        firstName: z
            .string()
            .trim()
            .min(2, 'Ingresa al menos 2 caracteres para el nombre.'),
        lastName: z.string().trim().optional(),
        password: z
            .string()
            .min(1, 'Ingresa tu contraseña.')
            .min(8, 'La contraseña debe tener al menos 8 caracteres.')
            .refine(fitsPasswordBytes, PASSWORD_TOO_LONG_MESSAGE),
    })
    .superRefine((values, context) => {
        if (values.password !== values.confirmPassword) {
            context.addIssue({
                code: 'custom',
                message: 'Las contraseñas no coinciden.',
                path: ['confirmPassword'],
            })
        }
    })

export type RegisterFormValues = z.infer<typeof registerSchema>
