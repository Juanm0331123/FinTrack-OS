import { CircleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

// Mensajes de error de formularios públicos (DESIGN.md › Fields): texto en Negative con icono, para
// que el error no dependa solo del color. FieldError va asociado a su campo por `aria-describedby`;
// FormAlert anuncia un error de todo el formulario.

export function FieldError({ children, className, ...props }: ComponentProps<'p'>) {
    return (
        <p className={cn('flex items-start gap-1.5 text-sm text-destructive', className)} {...props}>
            <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
            <span>{children}</span>
        </p>
    )
}

export function FormAlert({ children, className, ...props }: ComponentProps<'p'>) {
    return (
        <p
            role="alert"
            className={cn(
                'flex items-start gap-2 rounded-xl border border-[var(--negative-edge)] bg-[var(--negative-wash)] px-3 py-2.5 text-sm text-destructive',
                className,
            )}
            {...props}
        >
            <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
            <span>{children}</span>
        </p>
    )
}
