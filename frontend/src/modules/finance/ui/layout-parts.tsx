import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

export function PageHeader({
    actions,
    badge,
    subtitle,
    title,
    titleClassName,
}: {
    actions?: ReactNode
    badge?: ReactNode
    subtitle?: ReactNode
    title: ReactNode
    titleClassName?: string
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className={cn('text-2xl font-semibold tracking-[-0.02em] text-ft-ink sm:text-[26px]', titleClassName)}>
                        {title}
                    </h1>
                    {badge}
                </div>
                {subtitle ? <p className="mt-0.5 text-sm text-ft-ink-3">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}

export function Meter({ className, label, value }: { className?: string; label: string; value: number }) {
    const width = Math.max(0, Math.min(100, value))

    return (
        <div
            role="img"
            aria-label={label}
            className={cn('h-1.5 overflow-hidden rounded-full bg-[#eaecf0]', className)}
        >
            <span
                className="block h-full rounded-full bg-ft-pos-dot transition-[width] duration-300"
                style={{ width: `${width}%` }}
            />
        </div>
    )
}

export function EmptyState({
    action,
    children,
    title,
}: {
    action?: ReactNode
    children?: ReactNode
    title: string
}) {
    return (
        <div className="flex flex-col items-start gap-3 px-5 py-8 sm:px-6">
            <h2 className="text-lg font-semibold text-ft-ink">{title}</h2>
            {children ? <div className="max-w-xl text-sm leading-6 text-ft-ink-2">{children}</div> : null}
            {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
        </div>
    )
}

export function StatusPill({ tone, children }: { children: ReactNode; tone: 'neg' | 'pos' | 'warn' }) {
    return (
        <span
            className={cn(
                'inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold',
                tone === 'pos' && 'bg-ft-pos-soft text-ft-pos',
                tone === 'neg' && 'bg-ft-neg-soft text-ft-neg',
                tone === 'warn' && 'bg-ft-warn-soft text-ft-warn',
            )}
        >
            {children}
        </span>
    )
}
