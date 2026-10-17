import * as React from 'react'

import { cn } from '@/shared/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground transition-[border-color,box-shadow] duration-150 focus-field file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-ink-tertiary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-focus-halo aria-invalid:border-destructive aria-invalid:focus-visible:ring-[var(--negative-wash)] read-only:bg-hover-wash disabled:cursor-not-allowed disabled:border-edge disabled:bg-hover-wash disabled:text-ink-secondary md:text-sm',
                className,
            )}
            {...props}
        />
    )
}

export { Input }
