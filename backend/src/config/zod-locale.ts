import { z } from 'zod'

// Mensajes de validación por defecto en español; los schemas con mensaje propio lo conservan.
z.config(z.locales.es())
z.config({
    customError: (issue) => {
        if (issue.code === 'unrecognized_keys') {
            return issue.keys.length === 1
                ? `Campo no permitido: ${issue.keys[0]}.`
                : `Campos no permitidos: ${issue.keys.join(', ')}.`
        }

        return undefined
    },
})
