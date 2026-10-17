import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export function PaidCheck({
    concept,
    isPaid,
    onToggle,
}: {
    concept: string
    isPaid: boolean
    onToggle: () => void
}) {
    return (
        <button
            type="button"
            aria-pressed={isPaid}
            aria-label={isPaid ? `${concept}: pagado. Marcar como pendiente` : `Marcar ${concept} como pagado`}
            onClick={onToggle}
            className="group grid size-11 flex-none cursor-pointer place-items-center rounded-lg focus-ring"
        >
            <span
                className={cn(
                    'grid size-[22px] place-items-center rounded-md border-[1.5px] transition-colors duration-150',
                    isPaid ? 'border-ft-pos-dot bg-ft-pos-dot text-white' : 'border-ft-control bg-white text-transparent group-hover:border-ft-ink-3',
                )}
            >
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
        </button>
    )
}
