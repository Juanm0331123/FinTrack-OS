import { cn } from '@/shared/lib/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../domain/categories'
import type { AccountTotal } from '../domain/month-sheet'
import type { EntryCategory } from '../domain/types'
import { formatMoney } from '../lib/format'
import { CATEGORY_STYLES } from '../ui/category-pill'
import { Panel, PanelHeader } from '../ui/panel'

export function CategoryBreakdown({ totals }: { totals: Record<EntryCategory, number> }) {
    const max = Math.max(1, ...CATEGORY_ORDER.map((category) => totals[category]))

    return (
        <Panel aria-labelledby="by-category-title">
            <PanelHeader id="by-category-title" title="Por categoría" />
            <ul className="flex flex-col gap-3 px-4 pb-[18px] sm:px-[18px]">
                {CATEGORY_ORDER.map((category) => (
                    <li key={category}>
                        <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                            <span className="text-ft-ink-2">{CATEGORY_LABELS[category]}</span>
                            <span className="font-semibold text-ft-ink tabular">{formatMoney(totals[category])}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ft-muted" aria-hidden="true">
                            <span
                                className={cn('block h-full rounded-full', CATEGORY_STYLES[category].fill)}
                                style={{ width: `${(totals[category] / max) * 100}%` }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </Panel>
    )
}

export function AccountBreakdown({ totals }: { totals: AccountTotal[] }) {
    return (
        <Panel aria-labelledby="by-account-title">
            <PanelHeader id="by-account-title" title="Por cuenta" />
            <ul className="px-4 pb-3 sm:px-[18px]">
                {totals.map((account) => (
                    <li
                        key={account.id ?? 'unassigned'}
                        className="flex min-h-[42px] items-center justify-between gap-3 border-b border-ft-line-soft text-sm last:border-b-0"
                    >
                        <span className={account.total === 0 ? 'text-ft-ink-3' : 'text-ft-ink'}>
                            {account.name}
                            {account.archived ? <span className="text-ft-ink-3"> · archivada</span> : null}
                        </span>
                        <span className="font-semibold text-ft-ink tabular">{formatMoney(account.total)}</span>
                    </li>
                ))}
            </ul>
        </Panel>
    )
}
