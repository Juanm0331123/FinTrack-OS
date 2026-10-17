import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { LoadableContent } from '@/shared/ui/loadable-content'

// Botones del espacio de trabajo (DESIGN.md › Buttons): primary (una acción operativa por vista),
// secondary, ghost (discreta) y danger (destructiva). Foco con contorno real (`focus-ring`);
// deshabilitado y cargando con relleno apagado y tinta secundaria, sin opacidad.
export const ftButtonVariants = cva(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 select-none focus-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-ft-line disabled:bg-ft-muted disabled:text-ft-ink-2 disabled:shadow-none aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        defaultVariants: {
            size: 'md',
            variant: 'secondary',
        },
        variants: {
            size: {
                icon: 'size-11 lg:size-10',
                'icon-sm': 'size-11 lg:size-9',
                md: 'h-11 px-3.5 lg:h-10',
                sm: 'h-11 px-3 text-[13px] lg:h-9',
            },
            variant: {
                danger: 'border border-ft-neg-border bg-white text-ft-neg hover:bg-ft-neg-soft active:bg-ft-neg-soft',
                ghost: 'text-ft-ink-2 hover:bg-ft-muted hover:text-ft-ink active:bg-ft-line-soft disabled:border-transparent disabled:bg-transparent',
                primary:
                    'border border-transparent bg-ft-primary text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] hover:bg-ft-primary-hover active:bg-ft-primary-hover active:shadow-none',
                secondary: 'border border-ft-line bg-white text-ft-ink hover:bg-ft-hover active:bg-ft-muted',
            },
        },
    },
)

export function FtButton({
    asChild = false,
    children,
    className,
    disabled,
    loading,
    loadingLabel,
    size,
    variant,
    ...props
}: ComponentProps<'button'> &
    VariantProps<typeof ftButtonVariants> & {
        asChild?: boolean
        /** Acción en curso: deshabilita (sin envíos duplicados), anuncia aria-busy y sustituye el icono inicial por un indicador sin cambiar el tamaño. */
        loading?: boolean
        /** Etiqueta progresiva durante la carga («Copiando…»); el botón conserva su tamaño. */
        loadingLabel?: ReactNode
    }) {
    if (asChild) {
        return (
            // disabled llega al hijo cuando es un <button> nativo; un enlace no se bloquea con disabled.
            <Slot.Root className={cn(ftButtonVariants({ className, size, variant }))} {...{ disabled }} {...props}>
                {children}
            </Slot.Root>
        )
    }

    return (
        <button
            data-loading={loading || undefined}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            className={cn(ftButtonVariants({ className, size, variant }))}
            {...props}
        >
            {loading === undefined ? (
                children
            ) : (
                <LoadableContent loading={loading} loadingLabel={loadingLabel}>
                    {children}
                </LoadableContent>
            )}
        </button>
    )
}

// Acción o enlace en línea dentro de un texto (p. ej. «Ajustar a mano»): azul con subrayado al pasar.
// Por debajo de 1024px el área táctil crece a ≥ 44px con un pseudo-elemento, sin mover el texto.
export const ftInlineActionClassName =
    'relative cursor-pointer rounded-sm font-medium text-ft-primary hover:underline focus-ring max-lg:after:absolute max-lg:after:-inset-x-1 max-lg:after:-inset-y-3'
