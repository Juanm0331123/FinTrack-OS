import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Ingresa tu correo.")
    .email("Ingresa un correo valido."),
  password: z
    .string()
    .min(1, "Ingresa tu contrasena.")
    .min(8, "La contrasena debe tener al menos 8 caracteres."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
