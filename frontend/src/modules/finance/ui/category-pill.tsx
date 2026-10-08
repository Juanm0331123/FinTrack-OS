import { cn } from '@/shared/lib/utils'
import { CATEGORY_LABELS } from '../domain/categories'
import type { EntryCategory } from '../domain/types'

export const CATEGORY_STYLES: Record<EntryCategory, { dot: string; fill: string; pill: string; text: string }> = {
    DEBT: {
        dot: 'bg-cat-debt-fill',
        fill: 'bg-cat-debt-fill',
        pill: 'bg-cat-debt-soft text-cat-debt',
        text: 'text-cat-debt',
    },
    FIXED: {
        dot: 'bg-cat-fixed-fill',
        fill: 'bg-cat-fixed-fill',
        pill: 'bg-cat-fixed-soft text-cat-fixed',
        text: 'text-cat-fixed',
    },
    OTHER: {
        dot: 'bg-cat-other-fill',
        fill: 'bg-cat-other-fill',
        pill: 'bg-cat-other-soft text-cat-other',
        text: 'text-cat-other',
    },
    POCKET: {
        dot: 'bg-cat-pocket-fill',
        fill: 'bg-cat-pocket-fill',
        pill: 'bg-cat-pocket-soft text-cat-pocket',
        text: 'text-cat-pocket',
    },
    SAVINGS: {
        dot: 'bg-cat-savings-fill',
        fill: 'bg-cat-savings-fill',
        pill: 'bg-cat-savings-soft text-cat-savings',
        text: 'text-cat-savings',
    },
    SUBSCRIPTION: {
        dot: 'bg-cat-subscription-fill',
        fill: 'bg-cat-subscription-fill',
        pill: 'bg-cat-subscription-soft text-cat-subscription',
        text: 'text-cat-subscription',
    },
}

export function CategoryPill({ category, className }: { category: EntryCategory; className?: string }) {
    const styles = CATEGORY_STYLES[category]

    return (
        <span
            className={cn(
                'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap',
                styles.pill,
                className,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', styles.dot)} />
            {CATEGORY_LABELS[category]}
        </span>
    )
}
