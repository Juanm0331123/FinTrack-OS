import { cn } from '@/shared/lib/utils'
import { dailyAllowance, pocketPace, type MonthTiming, type PocketProgress } from '../domain/pockets'
import { formatCompactMoney, formatMoney } from '../lib/format'

type Tone = 'neg' | 'neutral' | 'pos' | 'warn'

const PILL_STYLES: Record<Tone, string> = {
    neg: 'bg-ft-neg-soft text-ft-neg',
    neutral: 'bg-ft-muted text-ft-ink-2',
    pos: 'bg-ft-pos-soft text-ft-pos',
    warn: 'bg-ft-warn-soft text-ft-warn',
}

const BADGE_STYLES: Record<Tone, { badge: string; dot: string }> = {
    neg: { badge: 'border-ft-neg-border bg-ft-neg-soft text-ft-neg', dot: 'bg-ft-neg-dot' },
    neutral: { badge: 'border-ft-line bg-white text-ft-ink-2', dot: 'bg-ft-ink-4' },
    pos: { badge: 'border-ft-pos-border bg-ft-pos-soft text-ft-pos', dot: 'bg-ft-pos-dot' },
    warn: { badge: 'border-ft-warn-border bg-ft-warn-soft text-ft-warn', dot: 'bg-ft-warn-dot' },
}

const BAR_STYLES: Record<Tone, string> = {
    neg: 'bg-ft-neg-dot',
    neutral: 'bg-ft-pos-dot',
    pos: 'bg-ft-pos-dot',
    warn: 'bg-ft-warn-dot',
}

export function pocketStatus(pocket: PocketProgress, timing: MonthTiming): { label: string; tone: Tone } {
    if (pocket.budget === 0) {
        return { label: 'Sin presupuesto', tone: pocket.spent > 0 ? 'warn' : 'neutral' }
    }

    switch (pocketPace(pocket, timing)) {
        case 'over':
            return { label: 'Excedido', tone: 'neg' }
        case 'ahead':
            return { label: 'Vas rápido', tone: 'warn' }
        case 'done':
            return { label: 'Agotado', tone: 'neutral' }
        case 'unused':
            return { label: timing.phase === 'past' ? 'Sin gastos' : 'Sin gastos aún', tone: 'neutral' }
        case 'on-track':
            return timing.phase === 'past' ? { label: 'Sobró', tone: 'pos' } : { label: 'Vas bien', tone: 'pos' }
    }
}

export function pocketHeadline(pocket: PocketProgress, timing: MonthTiming) {
    if (pocket.budget === 0) {
        return { label: 'Usado', negative: false, value: pocket.spent }
    }

    if (pocket.overspent > 0) {
        return { label: 'Te pasaste', negative: true, value: pocket.overspent }
    }

    if (timing.phase === 'past') {
        return pocket.spendCount > 0
            ? { label: 'Sobró', negative: false, value: pocket.remaining }
            : { label: 'Presupuesto', negative: false, value: pocket.budget }
    }

    return { label: 'Quedan', negative: false, value: pocket.remaining }
}

export function pocketDetail(pocket: PocketProgress, timing: MonthTiming) {
    if (pocket.budget === 0) {
        return 'Sin presupuesto definido'
    }

    if (timing.phase === 'past' && pocket.spendCount === 0) {
        return 'Sin gastos registrados'
    }

    const allowance = dailyAllowance(pocket, timing)
    const used = `Usado ${formatMoney(pocket.spent)} de ${formatMoney(pocket.budget)}`

    return allowance === null ? used : `${used} · ≈ ${formatMoney(allowance)} por día`
}

export function PocketStatusPill({
    className,
    pocket,
    timing,
}: {
    className?: string
    pocket: PocketProgress
    timing: MonthTiming
}) {
    const status = pocketStatus(pocket, timing)

    return (
        <span
            className={cn(
                'inline-flex h-[22px] flex-none items-center rounded-full px-2 text-xs font-semibold whitespace-nowrap',
                PILL_STYLES[status.tone],
                className,
            )}
        >
            {status.label}
        </span>
    )
}

export function PocketBar({
    className,
    pocket,
    timing,
}: {
    className?: string
    pocket: PocketProgress
    timing: MonthTiming
}) {
    const { tone } = pocketStatus(pocket, timing)
    const percent = Math.round(pocket.share * 100)

    return (
        <span
            role="img"
            aria-label={pocket.budget > 0 ? `Usado ${percent}% del presupuesto` : 'Sin presupuesto definido'}
            className={cn('block h-1.5 overflow-hidden rounded-full bg-ft-muted', className)}
        >
            <span
                className={cn('block h-full rounded-full transition-[width] duration-300', BAR_STYLES[tone])}
                style={{ width: `${percent}%` }}
            />
        </span>
    )
}

export function PocketHeadline({
    className,
    pocket,
    size = 'md',
    timing,
}: {
    className?: string
    pocket: PocketProgress
    size?: 'lg' | 'md'
    timing: MonthTiming
}) {
    const headline = pocketHeadline(pocket, timing)

    return (
        <span className={cn('flex items-baseline gap-1.5', className)}>
            <span className="text-[12.5px] text-ft-ink-3">{headline.label}</span>
            <span
                className={cn(
                    'font-semibold tracking-[-0.01em] whitespace-nowrap tabular',
                    size === 'lg' ? 'text-[22px]' : 'text-base',
                    headline.negative ? 'text-ft-neg' : 'text-ft-ink',
                )}
            >
                {formatMoney(headline.value)}
            </span>
        </span>
    )
}

export function PocketBadge({
    concept,
    onClick,
    pocket,
    timing,
}: {
    concept: string
    onClick: () => void
    pocket: PocketProgress
    timing: MonthTiming
}) {
    const { tone } = pocketStatus(pocket, timing)
    const styles = BADGE_STYLES[tone]
    const headline = pocketHeadline(pocket, timing)
    const text =
        pocket.spendCount === 0 && pocket.overspent === 0
            ? 'Sin gastos'
            : `${pocket.overspent > 0 ? 'Excedido' : headline.label} ${formatCompactMoney(headline.value)}`
    const spoken =
        pocket.spendCount === 0 && pocket.overspent === 0
            ? `sin gastos registrados de ${formatMoney(pocket.budget)}`
            : `${headline.label.toLowerCase()} ${formatMoney(headline.value)}. ${pocketDetail(pocket, timing)}`

    return (
        <button
            type="button"
            aria-label={`${concept}: ${spoken}. Registrar gasto`}
            onClick={onClick}
            className={cn(
                'relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus max-sm:after:absolute max-sm:after:-inset-2',
                styles.badge,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', styles.dot)} />
            <span className="tabular">{text}</span>
        </button>
    )
}
