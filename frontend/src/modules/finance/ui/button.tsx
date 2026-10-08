import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

export const ftButtonVariants = cva(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        defaultVariants: {
            size: 'md',
            variant: 'secondary',
        },
        variants: {
            size: {
                icon: 'size-11 sm:size-10',
                'icon-sm': 'size-11 sm:size-9',
                md: 'h-11 px-3.5 sm:h-10',
                sm: 'h-11 px-3 text-[13px] sm:h-9',
            },
            variant: {
                danger: 'border border-ft-neg-border bg-white text-ft-neg hover:bg-ft-neg-soft',
                ghost: 'text-ft-ink-3 hover:bg-ft-muted hover:text-ft-ink',
                primary:
                    'bg-ft-primary text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] hover:bg-ft-primary-hover',
                secondary: 'border border-ft-line bg-white text-ft-ink hover:bg-ft-hover',
            },
        },
    },
)

export function FtButton({
    asChild = false,
    className,
    size,
    variant,
    ...props
}: ComponentProps<'button'> & VariantProps<typeof ftButtonVariants> & { asChild?: boolean }) {
    const Component = asChild ? Slot.Root : 'button'

    return <Component className={cn(ftButtonVariants({ className, size, variant }))} {...props} />
}
