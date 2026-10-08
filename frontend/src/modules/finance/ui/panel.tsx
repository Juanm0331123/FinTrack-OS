import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

export function Panel({ className, ...props }: ComponentProps<'section'>) {
    return (
        <section
            className={cn('min-w-0 rounded-xl border border-ft-line bg-ft-card', className)}
            {...props}
        />
    )
}

export function PanelHeader({
    aside,
    className,
    id,
    title,
}: {
    aside?: ReactNode
    className?: string
    id?: string
    title: ReactNode
}) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-4 sm:px-[18px]',
                className,
            )}
        >
            <h2 id={id} className="text-base font-semibold text-ft-ink">
                {title}
            </h2>
            {aside ? <div className="text-[13px] text-ft-ink-3">{aside}</div> : null}
        </div>
    )
}
