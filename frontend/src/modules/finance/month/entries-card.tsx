'use client'

import { Plus, Search } from 'lucide-react'
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { isEntryOverdue } from '../domain/calendar'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../domain/categories'
import { sumAmounts } from '../domain/money'
import { isPocket, monthTiming, pocketProgress, type MonthTiming } from '../domain/pockets'
import type { EntryCategory, MoneyAccount, MonthEntry } from '../domain/types'
import { formatMoney } from '../lib/format'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { CategoryPill, CATEGORY_STYLES } from '../ui/category-pill'
import { FieldError, focusNextInGroup, Segmented, useAmountDraft } from '../ui/fields'
import { Panel, PanelHeader } from '../ui/panel'
import { paymentStateOf, StatusBadge } from '../ui/status-badge'
import { PocketBadge } from './pocket-parts'

type Filter = 'ALL' | EntryCategory

const FILTER_OPTIONS: ReadonlyArray<{ label: string; value: Filter }> = [
    { label: 'Todas', value: 'ALL' },
    ...CATEGORY_ORDER.map((category) => ({ label: CATEGORY_LABELS[category], value: category })),
]

const UNASSIGNED = 'Sin cuenta asignada'

function normalize(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
}

type RowHandlers = {
    onAmount: (id: string, amount: number | null) => void
    onEdit: (id: string) => void
    onSpend: (id: string) => void
    onToggle: (id: string, isPaid: boolean) => void
}

function EntryState({
    entry,
    handlers,
    isLate,
    timing,
}: {
    entry: MonthEntry
    handlers: RowHandlers
    isLate: boolean
    timing: MonthTiming
}) {
    if (isPocket(entry)) {
        return (
            <PocketBadge
                concept={entry.concept}
                pocket={pocketProgress(entry)}
                timing={timing}
                onClick={() => handlers.onSpend(entry.id)}
            />
        )
    }

    return (
        <StatusBadge
            concept={entry.concept}
            state={paymentStateOf(entry.isPaid, isLate)}
            onToggle={() => handlers.onToggle(entry.id, entry.isPaid)}
        />
    )
}

const AmountCell = memo(function AmountCell({
    concept,
    id,
    onAmount,
    value,
}: {
    concept: string
    id: string
    onAmount: RowHandlers['onAmount']
    value: number | null
}) {
    const errorId = `amount-error-${id}`
    const { error, inputProps } = useAmountDraft(value, (amount) => onAmount(id, amount))

    return (
        <>
            <input
                {...inputProps}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                data-input-group="entry-amounts"
                aria-label={`Valor de ${concept}`}
                aria-describedby={error ? errorId : undefined}
                placeholder="Sin valor"
                onKeyDown={(event) => focusNextInGroup(event, 'entry-amounts')}
                onFocus={(event) => event.currentTarget.select()}
                className={cn(
                    'h-11 w-full rounded-[7px] border bg-transparent px-2 text-right lg:h-9 text-sm font-semibold text-ft-ink tabular outline-none transition-[border-color,box-shadow] duration-150 hover:border-ft-line focus:border-ft-focus focus:bg-white focus:ring-[3px] focus:ring-ft-focus-soft',
                    error ? 'border-ft-neg' : 'border-transparent',
                )}
            />
            <FieldError id={errorId} message={error} />
        </>
    )
})

const EntryRow = memo(function EntryRow({
    accountName,
    entry,
    handlers,
    isLate,
    timing,
}: {
    accountName: string
    entry: MonthEntry
    handlers: RowHandlers
    isLate: boolean
    timing: MonthTiming
}) {
    return (
        <tr className="border-b border-ft-line-soft transition-colors duration-150 last:border-b-0 hover:bg-ft-hover">
            <td className="py-2 pr-3 pl-[18px]">
                <button
                    type="button"
                    onClick={() => handlers.onEdit(entry.id)}
                    className="block min-h-11 w-full min-w-0 cursor-pointer rounded-md text-left outline-none focus-visible:outline-2 focus-visible:outline-ft-focus lg:min-h-0"
                >
                    <span className="block truncate font-semibold text-ft-ink">{entry.concept}</span>
                    <span className="block truncate text-[12.5px] text-ft-ink-3">
                        {accountName}
                        {entry.note ? ` · ${entry.note}` : ''}
                    </span>
                    <span className="sr-only">Editar</span>
                </button>
            </td>
            <td className="px-3 py-2">
                <CategoryPill category={entry.category} />
            </td>
            <td className="px-3 py-2 text-ft-ink-2 tabular">{entry.dueDay ? `Día ${entry.dueDay}` : 'Sin día'}</td>
            <td className="px-3 py-2">
                <EntryState entry={entry} handlers={handlers} isLate={isLate} timing={timing} />
            </td>
            <td className="py-2 pr-[18px] pl-3">
                <AmountCell concept={entry.concept} id={entry.id} value={entry.amount} onAmount={handlers.onAmount} />
            </td>
        </tr>
    )
})

const EntryListItem = memo(function EntryListItem({
    accountName,
    entry,
    handlers,
    isLate,
    timing,
}: {
    accountName: string
    entry: MonthEntry
    handlers: RowHandlers
    isLate: boolean
    timing: MonthTiming
}) {
    const styles = CATEGORY_STYLES[entry.category]

    return (
        <li className="flex items-center gap-3 border-b border-ft-line-soft px-4 py-2.5 last:border-b-0">
            <button
                type="button"
                onClick={() => handlers.onEdit(entry.id)}
                className="min-h-11 min-w-0 flex-1 cursor-pointer text-left outline-none focus-visible:outline-2 focus-visible:outline-ft-focus"
            >
                <span className="block truncate font-semibold text-ft-ink">{entry.concept}</span>
                <span className={cn('flex items-center gap-1.5 truncate text-[12.5px]', isLate ? 'font-medium text-ft-neg' : 'text-ft-ink-3')}>
                    <span aria-hidden="true" className={cn('size-1.5 flex-none rounded-full', styles.dot)} />
                    <span className="sr-only">{CATEGORY_LABELS[entry.category]}.</span>
                    {entry.dueDay ? (isLate ? `Vencido · día ${entry.dueDay}` : `Día ${entry.dueDay}`) : 'Sin día'} · {accountName}
                </span>
            </button>
            <div className="flex flex-col items-end gap-1">
                <span className="text-[15px] font-semibold text-ft-ink tabular">
                    {entry.amount === null ? 'Sin valor' : formatMoney(entry.amount)}
                </span>
                <EntryState entry={entry} handlers={handlers} isLate={isLate} timing={timing} />
            </div>
        </li>
    )
})

export function EntriesCard({
    accounts,
    billsTotal,
    entries,
    onAdd,
    onEdit,
    onSpend,
    paidTotal,
    todayIso,
    yearMonth,
}: {
    accounts: readonly MoneyAccount[]
    billsTotal: number
    entries: readonly MonthEntry[]
    onAdd: () => void
    onEdit: (id: string) => void
    onSpend: (id: string) => void
    paidTotal: number
    todayIso: string
    yearMonth: string
}) {
    const actions = useWorkbookActions()
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<Filter>('ALL')
    const deferredQuery = useDeferredValue(query)
    const accountNames = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts])

    const onToggle = useCallback(
        (id: string, isPaid: boolean) => actions.updateEntry(yearMonth, id, { isPaid: !isPaid }),
        [actions, yearMonth],
    )
    const onAmount = useCallback(
        (id: string, amount: number | null) => actions.updateEntry(yearMonth, id, { amount }),
        [actions, yearMonth],
    )
    const handlers = useMemo<RowHandlers>(
        () => ({ onAmount, onEdit, onSpend, onToggle }),
        [onAmount, onEdit, onSpend, onToggle],
    )
    const timing = useMemo(() => monthTiming(yearMonth, todayIso), [todayIso, yearMonth])

    const rows = useMemo(() => {
        const needle = normalize(deferredQuery.trim())

        return entries
            .filter((entry) => {
                if (filter !== 'ALL' && entry.category !== filter) {
                    return false
                }

                if (!needle) {
                    return true
                }

                const account = entry.accountId ? (accountNames.get(entry.accountId) ?? '') : UNASSIGNED

                return normalize(`${entry.concept} ${account} ${entry.note ?? ''}`).includes(needle)
            })
            .sort((left, right) => (left.dueDay ?? 99) - (right.dueDay ?? 99) || left.sortOrder - right.sortOrder)
    }, [accountNames, deferredQuery, entries, filter])

    const shownTotal = sumAmounts(rows)
    const accountNameOf = (entry: MonthEntry) =>
        entry.accountId ? (accountNames.get(entry.accountId) ?? UNASSIGNED) : UNASSIGNED

    return (
        <Panel aria-labelledby="entries-title" className="flex-[999_1_560px]">
            <PanelHeader
                id="entries-title"
                title="Gastos"
                aside={
                    <>
                        Pagado <span className="font-semibold text-ft-ink tabular">{formatMoney(paidTotal)}</span> de{' '}
                        <span className="tabular">{formatMoney(billsTotal)}</span>
                    </>
                }
            />
            <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3 sm:px-[18px]">
                <label className="flex h-11 min-w-0 flex-[1_1_200px] items-center lg:h-[38px] gap-2 rounded-lg border border-ft-line px-2.5 text-ft-ink-3 transition-[border-color,box-shadow] duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft">
                    <Search className="size-4 flex-none" aria-hidden="true" />
                    <span className="sr-only">Buscar gastos</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar concepto o cuenta"
                        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ft-ink outline-none"
                    />
                </label>
                <Segmented scrollable label="Filtrar por categoría" options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
            </div>

            {rows.length === 0 ? (
                <div className="border-t border-ft-line px-[18px] py-10 text-center text-sm text-ft-ink-3">
                    {entries.length === 0
                        ? 'Este mes todavía no tiene filas. Agrega la primera con “Nuevo gasto”.'
                        : 'Ninguna fila coincide con la búsqueda o el filtro.'}
                </div>
            ) : (
                <>
                    <div className="hidden overflow-x-auto border-t border-ft-line md:block">
                        <table className="w-full min-w-[700px] border-collapse text-sm">
                            <caption className="sr-only">Gastos del mes</caption>
                            <colgroup>
                                <col />
                                <col className="w-[132px]" />
                                <col className="w-[104px]" />
                                <col className="w-[128px]" />
                                <col className="w-[150px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-ft-hover text-left text-[12.5px] font-medium text-ft-ink-3">
                                    <th scope="col" className="h-10 pr-3 pl-[18px] font-medium">
                                        Concepto
                                    </th>
                                    <th scope="col" className="px-3 font-medium">
                                        Categoría
                                    </th>
                                    <th scope="col" className="px-3 font-medium">
                                        Día
                                    </th>
                                    <th scope="col" className="px-3 font-medium">
                                        Estado
                                    </th>
                                    <th scope="col" className="pr-[26px] pl-3 text-right font-medium">
                                        Valor
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((entry) => (
                                    <EntryRow
                                        key={entry.id}
                                        accountName={accountNameOf(entry)}
                                        entry={entry}
                                        handlers={handlers}
                                        isLate={!isPocket(entry) && isEntryOverdue(entry, yearMonth, todayIso)}
                                        timing={timing}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="border-t border-ft-line md:hidden">
                        {rows.map((entry) => (
                            <EntryListItem
                                key={entry.id}
                                accountName={accountNameOf(entry)}
                                entry={entry}
                                handlers={handlers}
                                isLate={!isPocket(entry) && isEntryOverdue(entry, yearMonth, todayIso)}
                                timing={timing}
                            />
                        ))}
                    </ul>
                </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ft-line px-4 py-3.5 sm:px-[18px]">
                <FtButton variant="secondary" onClick={onAdd}>
                    <Plus aria-hidden="true" />
                    Agregar fila
                </FtButton>
                <p className="text-sm text-ft-ink-2">
                    {filter === 'ALL' && !deferredQuery.trim() ? 'Total' : 'Total filtrado'}{' '}
                    <span className="text-base font-semibold text-ft-ink tabular">{formatMoney(shownTotal)}</span>
                </p>
            </div>
        </Panel>
    )
}
