import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { LoadableContent } from './loadable-content'

// Botones públicos (landing y autenticación), DESIGN.md › Components › Buttons:
// - access: accesos públicos claros («Crear mi cuenta», «Iniciar sesión»).
// - outline: acción secundaria. ghost: discreta. destructive: destructiva. link: aspecto de enlace.
// - default: azul sólido; destaca el envío principal del login frente a los accesos de navegación.
// Deshabilitado y cargando usan relleno Panel y tinta secundaria (≥ 6.6:1), nunca opacidad.
const buttonVariants = cva(
    "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none focus-ring active:not-aria-[haspopup]:not-disabled:translate-y-px disabled:pointer-events-none disabled:border-transparent disabled:bg-panel disabled:text-ink-secondary disabled:shadow-none aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                access:
                    'border-access-edge bg-card text-foreground [--focus-offset:3px] hover:border-access-edge-hover hover:bg-access-hover active:bg-access-active aria-expanded:bg-access-active [&_svg]:stroke-[1.7]',
                default: 'bg-primary text-primary-foreground hover:bg-blue-hover',
                outline:
                    'border-border bg-card text-foreground hover:bg-hover-wash aria-expanded:bg-hover-wash',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-panel-strong aria-expanded:bg-panel-strong',
                ghost: 'text-foreground hover:bg-muted-fill aria-expanded:bg-muted-fill disabled:bg-transparent',
                destructive:
                    'border-[var(--negative-edge)] bg-card text-destructive hover:bg-[var(--negative-wash)]',
                link: 'text-primary underline-offset-4 hover:underline disabled:bg-transparent',
            },
            size: {
                default:
                    'h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
                xs: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-9 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
                // Acceso dentro del contenido: 52px, etiqueta compacta de 14px e icono de 20px.
                lg: "h-13 gap-2.5 px-6 text-sm [&_svg:not([class*='size-'])]:size-5",
                icon: 'size-11',
                'icon-xs': "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
                'icon-sm': 'size-7 rounded-[min(var(--radius-md),12px)]',
                'icon-lg': 'size-12',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

type ButtonProps = React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
        /**
         * Acción en curso: deshabilita el botón (evita envíos duplicados), anuncia aria-busy y muestra
         * un indicador en lugar del icono inicial (`data-icon="inline-start"`), con el mismo ancho y alto
         * que en reposo (ver LoadableContent). El nombre accesible sigue siendo la etiqueta. No aplica
         * con `asChild`: el hijo controla su propio contenido.
         */
        loading?: boolean
        /** Etiqueta progresiva durante la carga («Creando cuenta…»); el botón conserva su tamaño. */
        loadingLabel?: React.ReactNode
    }

function Button({
    asChild = false,
    children,
    className,
    disabled,
    loading,
    loadingLabel,
    size = 'default',
    variant = 'default',
    ...props
}: ButtonProps) {
    if (asChild) {
        return (
            <Slot.Root
                data-slot="button"
                data-variant={variant}
                data-size={size}
                className={cn(buttonVariants({ variant, size, className }))}
                // Llega al hijo cuando es un <button> nativo. Un enlace no se bloquea con disabled.
                {...{ disabled }}
                {...props}
            >
                {children}
            </Slot.Root>
        )
    }

    return (
        <button
            data-slot="button"
            data-variant={variant}
            data-size={size}
            data-loading={loading || undefined}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            className={cn(buttonVariants({ variant, size, className }))}
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

export { Button, buttonVariants }
