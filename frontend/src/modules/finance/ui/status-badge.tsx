import { cn } from '@/shared/lib/utils'

export type PaymentState = 'late' | 'paid' | 'pending'

const LABELS: Record<PaymentState, string> = {
    late: 'Vencido',
    paid: 'Pagado',
    pending: 'Pendiente',
}

const STYLES: Record<PaymentState, { badge: string; dot: string }> = {
    late: {
        badge: 'border-ft-neg-border bg-ft-neg-soft text-ft-neg',
        dot: 'bg-ft-neg-dot',
    },
    paid: {
        badge: 'border-ft-pos-border bg-ft-pos-soft text-ft-pos',
        dot: 'bg-ft-pos-dot',
    },
    pending: {
        badge: 'border-ft-line bg-white text-ft-ink-2',
        dot: 'bg-ft-ink-4',
    },
}

export function paymentStateOf(isPaid: boolean, isLate: boolean): PaymentState {
    return isPaid ? 'paid' : isLate ? 'late' : 'pending'
}

export function StatusBadge({
    className,
    concept,
    onToggle,
    state,
}: {
    className?: string
    concept: string
    onToggle: () => void
    state: PaymentState
}) {
    const styles = STYLES[state]

    return (
        <button
            type="button"
            aria-pressed={state === 'paid'}
            aria-label={state === 'paid' ? `${concept}: pagado. Marcar como pendiente` : `${concept}: ${LABELS[state].toLowerCase()}. Marcar como pagado`}
            onClick={onToggle}
            className={cn(
                'relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus max-sm:after:absolute max-sm:after:-inset-2',
                styles.badge,
                className,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', styles.dot)} />
            {LABELS[state]}
        </button>
    )
}
