import { z } from 'zod/v4'

export const registerSchema = z
    .object({
        confirmPassword: z
            .string()
            .min(1, 'Confirma tu contrasena.')
            .min(8, 'La contrasena debe tener al menos 8 caracteres.'),
        email: z
            .string()
            .min(1, 'Ingresa tu correo.')
            .email('Ingresa un correo valido.'),
        firstName: z
            .string()
            .trim()
            .min(2, 'Ingresa al menos 2 caracteres para el nombre.'),
        lastName: z.string().trim().optional(),
        password: z
            .string()
            .min(1, 'Ingresa tu contrasena.')
            .min(8, 'La contrasena debe tener al menos 8 caracteres.'),
    })
    .superRefine((values, context) => {
        if (values.password !== values.confirmPassword) {
            context.addIssue({
                code: 'custom',
                message: 'Las contrasenas no coinciden.',
                path: ['confirmPassword'],
            })
        }
    })

export type RegisterFormValues = z.infer<typeof registerSchema>
