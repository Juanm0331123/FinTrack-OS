'use client'

import { Plus } from 'lucide-react'
import { useMemo } from 'react'

import { monthTiming, summarizePockets, type MonthTiming, type PocketProgress } from '../domain/pockets'
import type { MonthEntry } from '../domain/types'
import { formatMoney } from '../lib/format'
import { Panel, PanelHeader } from '../ui/panel'
import { PocketBar, PocketHeadline, PocketStatusPill, pocketDetail } from './pocket-parts'

const LIST_COLUMNS = 'xl:grid xl:grid-cols-[minmax(150px,1fr)_minmax(140px,1.4fr)_auto_minmax(150px,auto)_auto] xl:gap-x-5'

const ROW_LAYOUT =
    'grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:"name_remaining"_"bar_bar"_"detail_action"] xl:col-span-full xl:grid-cols-subgrid xl:[grid-template-areas:"name_bar_detail_remaining_action"]'

function PocketRow({
    onSpend,
    pocket,
    timing,
}: {
    onSpend: (entryId: string) => void
    pocket: PocketProgress
    timing: MonthTiming
}) {
    return (
        <li className="xl:col-span-full xl:grid xl:grid-cols-subgrid">
            <button
                type="button"
                onClick={() => onSpend(pocket.entryId)}
                className={`grid w-full cursor-pointer items-center gap-x-5 gap-y-2 px-4 py-3 text-left transition-colors duration-150 outline-none hover:bg-ft-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ft-focus sm:px-[18px] ${ROW_LAYOUT}`}
            >
                <span className="flex min-w-0 items-center gap-2 [grid-area:name]">
                    <span className="truncate font-semibold text-ft-ink">{pocket.concept}</span>
                    <PocketStatusPill pocket={pocket} timing={timing} />
                </span>
                <PocketBar className="[grid-area:bar]" pocket={pocket} timing={timing} />
                <span className="min-w-0 text-[12.5px] text-ft-ink-3 tabular [grid-area:detail]">
                    {pocketDetail(pocket, timing)}
                </span>
                <PocketHeadline className="justify-end [grid-area:remaining]" pocket={pocket} timing={timing} />
                <span className="inline-flex items-center justify-end gap-1 text-[13px] font-semibold whitespace-nowrap text-ft-primary [grid-area:action]">
                    <Plus className="size-3.5" aria-hidden="true" />
                    Registrar gasto
                </span>
            </button>
        </li>
    )
}

export function PocketsCard({
    entries,
    onSpend,
    todayIso,
    yearMonth,
}: {
    entries: readonly MonthEntry[]
    onSpend: (entryId: string) => void
    todayIso: string
    yearMonth: string
}) {
    const { pockets, totals } = useMemo(() => summarizePockets(entries), [entries])
    const timing = useMemo(() => monthTiming(yearMonth, todayIso), [todayIso, yearMonth])

    if (pockets.length === 0) {
        return null
    }

    return (
        <Panel aria-labelledby="pockets-title">
            <PanelHeader
                id="pockets-title"
                title="Bolsillos"
                aside={
                    <>
                        Usado <span className="font-semibold text-ft-ink tabular">{formatMoney(totals.spent)}</span> de{' '}
                        <span className="tabular">{formatMoney(totals.budget)}</span>
                    </>
                }
            />
            <ul className={`divide-y divide-ft-line-soft border-t border-ft-line ${LIST_COLUMNS}`}>
                {pockets.map((pocket) => (
                    <PocketRow key={pocket.entryId} pocket={pocket} timing={timing} onSpend={onSpend} />
                ))}
            </ul>
        </Panel>
    )
}
