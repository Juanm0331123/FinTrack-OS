import Link from 'next/link'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

// Enlace de texto público (DESIGN.md › Buttons › Text link): navegación con semántica de enlace,
// azul con subrayado al pasar, foco visible y objetivo táctil de 44px por debajo de 1024px.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
    return (
        <Link
            className={cn(
                'inline-flex items-center rounded-sm font-medium text-primary underline-offset-4 focus-ring hover:underline max-lg:min-h-11',
                className,
            )}
            {...props}
        />
    )
}
