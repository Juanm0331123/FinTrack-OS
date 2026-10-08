'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { buildCalendarWeeks, isEntryOverdue, splitMonthHalves, upcomingEntries, type CalendarDay } from '../domain/calendar'
import { CATEGORY_LABELS } from '../domain/categories'
import { sumSpends, type DaySpend } from '../domain/pockets'
import type { MoneyAccount, MonthEntry } from '../domain/types'
import { isoDateFor, longDayLabel, monthLabel, shiftYearMonth, shortDayLabel } from '../domain/year-month'
import { useSelectedMonth } from '../hooks/use-selected-month'
import { useToday } from '../hooks/use-today'
import { useAccounts, useSheet } from '../hooks/use-workbook-data'
import { formatCompactMoney, formatMoney } from '../lib/format'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { CATEGORY_STYLES } from '../ui/category-pill'
import { EmptyState, PageHeader } from '../ui/layout-parts'
import { PaidCheck } from '../ui/paid-check'
import { Panel, PanelHeader } from '../ui/panel'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dayAriaLabel(day: CalendarDay) {
    const parts = [longDayLabel(day.iso)]

    if (day.isToday) {
        parts.push('hoy')
    }

    if (day.holiday) {
        parts.push(`festivo: ${day.holiday}`)
    }

    if (day.entries.length > 0) {
        parts.push(
            `${day.entries.length} ${day.entries.length === 1 ? 'pago' : 'pagos'}: ${day.entries
                .map((entry) => `${entry.concept} (${CATEGORY_LABELS[entry.category]})`)
                .join(', ')}`,
        )
    }

    if (day.spends.length > 0) {
        parts.push(`gastos de bolsillo por ${formatMoney(daySpendTotal(day.spends))}`)
    }

    return parts.join(', ')
}

function daySpendTotal(spends: readonly DaySpend[]) {
    return sumSpends(spends.map((item) => item.spend))
}

function SpendLine({ item }: { item: DaySpend }) {
    return (
        <li className="flex min-h-12 items-center justify-between gap-3 border-b border-ft-line-soft last:border-b-0">
            <div className="min-w-0 py-2">
                <p className="truncate font-semibold text-ft-ink">{item.concept}</p>
                <p className="truncate text-[12.5px] text-ft-ink-3">{item.spend.note ?? 'Gasto de bolsillo'}</p>
            </div>
            <span className="font-semibold text-ft-ink tabular">{formatMoney(item.spend.amount)}</span>
        </li>
    )
}

function EntryLine({
    accountName,
    entry,
    late,
    onToggle,
    yearMonth,
}: {
    accountName: string
    entry: MonthEntry
    late: boolean
    onToggle: () => void
    yearMonth: string
}) {
    const dayText = entry.dueDay ? shortDayLabel(isoDateFor(yearMonth, entry.dueDay)) : 'Sin día'

    return (
        <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-ft-line-soft last:border-b-0">
            <PaidCheck concept={entry.concept} isPaid={entry.isPaid} onToggle={onToggle} />
            <div className="min-w-0 py-2">
                <p className="truncate font-semibold text-ft-ink">{entry.concept}</p>
                <p className={cn('truncate text-[12.5px]', late ? 'font-medium text-ft-neg' : 'text-ft-ink-3')}>
                    {late ? `Vencido · día ${entry.dueDay}` : dayText} · {accountName} · {CATEGORY_LABELS[entry.category]}
                </p>
            </div>
            <span className="font-semibold text-ft-ink tabular">
                {entry.amount === null ? 'Sin valor' : formatMoney(entry.amount)}
            </span>
        </li>
    )
}

function CalendarView({ accounts, entries, today, yearMonth }: {
    accounts: readonly MoneyAccount[]
    entries: readonly MonthEntry[]
    today: string
    yearMonth: string
}) {
    const actions = useWorkbookActions()
    const [selectedIso, setSelectedIso] = useState(() =>
        today.startsWith(yearMonth) ? today : isoDateFor(yearMonth, 1),
    )
    const weeks = useMemo(() => buildCalendarWeeks(yearMonth, entries, today), [entries, today, yearMonth])
    const halves = useMemo(() => splitMonthHalves(entries), [entries])
    const upcoming = useMemo(() => upcomingEntries(entries, yearMonth, today), [entries, today, yearMonth])
    const accountNames = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts])
    const selectedDay = weeks.flat().find((day) => day.iso === selectedIso) ?? null
    const toggle = (entry: MonthEntry) => actions.updateEntry(yearMonth, entry.id, { isPaid: !entry.isPaid })
    const accountOf = (entry: MonthEntry) =>
        entry.accountId ? (accountNames.get(entry.accountId) ?? 'Sin cuenta') : 'Sin cuenta'

    return (
        <div className="flex flex-wrap items-start gap-[18px]">
            <Panel aria-label={`Calendario de ${monthLabel(yearMonth)}`} className="flex-[999_1_640px] overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                    <div role="grid" aria-label={monthLabel(yearMonth)} className="min-w-[740px]">
                        <div role="row" className="grid grid-cols-7">
                            {WEEKDAYS.map((weekday) => (
                                <span
                                    key={weekday}
                                    role="columnheader"
                                    className="border-b border-ft-line bg-ft-hover px-3 py-2.5 text-[12.5px] font-medium text-ft-ink-3"
                                >
                                    {weekday}
                                </span>
                            ))}
                        </div>
                        {weeks.map((week) => (
                            <div key={week[0].iso} role="row" className="grid grid-cols-7">
                                {week.map((day) => {
                                    const selected = day.iso === selectedIso

                                    return (
                                        <button
                                            key={day.iso}
                                            type="button"
                                            role="gridcell"
                                            aria-selected={selected}
                                            aria-label={dayAriaLabel(day)}
                                            disabled={!day.inMonth}
                                            onClick={() => setSelectedIso(day.iso)}
                                            className={cn(
                                                'flex min-h-[124px] cursor-pointer flex-col gap-1 border-r border-b border-ft-line-soft p-2 text-left outline-none transition-colors duration-150 last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ft-focus',
                                                day.inMonth ? 'bg-white hover:bg-ft-hover' : 'cursor-default bg-[#fcfcfd] text-ft-ink-4',
                                                selected && 'shadow-[inset_0_0_0_2px_var(--ft-primary)]',
                                            )}
                                        >
                                            <span className="flex items-center justify-between text-[13px] font-semibold">
                                                <span
                                                    className={cn(
                                                        'inline-grid h-[26px] min-w-[26px] place-items-center rounded-full tabular',
                                                        day.isToday && 'bg-ft-primary text-white',
                                                    )}
                                                >
                                                    {day.day}
                                                </span>
                                                {day.holiday && day.inMonth ? (
                                                    <span title={day.holiday} className="text-[11px] font-semibold text-ft-neg">
                                                        Festivo
                                                    </span>
                                                ) : null}
                                            </span>
                                            {day.entries.map((entry) => {
                                                const late = isEntryOverdue(entry, yearMonth, today)

                                                return (
                                                    <span
                                                        key={entry.id}
                                                        title={`${entry.concept} · ${CATEGORY_LABELS[entry.category]} · ${entry.amount === null ? 'sin valor' : formatMoney(entry.amount)}`}
                                                        className={cn(
                                                            'flex h-6 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium',
                                                            CATEGORY_STYLES[entry.category].pill,
                                                            entry.isPaid && 'line-through opacity-55',
                                                            late && 'shadow-[inset_0_0_0_1.5px_var(--ft-neg-dot)]',
                                                        )}
                                                    >
                                                        <span className="min-w-0 flex-1 truncate">{entry.concept}</span>
                                                        <span className="tabular opacity-85">
                                                            {entry.amount === null ? '—' : formatCompactMoney(entry.amount)}
                                                        </span>
                                                    </span>
                                                )
                                            })}
                                            {day.spends.length > 0 ? (
                                                <span
                                                    title={`Gastos de bolsillo: ${formatMoney(daySpendTotal(day.spends))}`}
                                                    className="flex h-6 min-w-0 items-center gap-1.5 rounded-md border border-dashed border-cat-pocket-fill/45 px-1.5 text-xs font-medium text-cat-pocket"
                                                >
                                                    <span className="min-w-0 flex-1 truncate">Bolsillos</span>
                                                    <span className="tabular opacity-85">
                                                        {formatCompactMoney(daySpendTotal(day.spends))}
                                                    </span>
                                                </span>
                                            ) : null}
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:hidden">
                    <div role="grid" aria-label={monthLabel(yearMonth)}>
                        <div role="row" className="grid grid-cols-7 border-b border-ft-line bg-ft-hover">
                            {WEEKDAYS.map((weekday) => (
                                <span key={weekday} role="columnheader" className="py-2 text-center text-[11.5px] font-medium text-ft-ink-3">
                                    {weekday.charAt(0)}
                                </span>
                            ))}
                        </div>
                        {weeks.map((week) => (
                            <div key={week[0].iso} role="row" className="grid grid-cols-7">
                                {week.map((day) => (
                                    <button
                                        key={day.iso}
                                        type="button"
                                        role="gridcell"
                                        aria-selected={day.iso === selectedIso}
                                        aria-label={dayAriaLabel(day)}
                                        disabled={!day.inMonth}
                                        onClick={() => setSelectedIso(day.iso)}
                                        className={cn(
                                            'flex min-h-14 flex-col items-center gap-1 py-1.5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ft-focus',
                                            !day.inMonth && 'text-ft-ink-4',
                                            day.iso === selectedIso && 'bg-ft-primary-soft',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'inline-grid size-7 place-items-center rounded-full text-[13px] font-semibold tabular',
                                                day.isToday && 'bg-ft-primary text-white',
                                                day.holiday && day.inMonth && !day.isToday && 'text-ft-neg',
                                            )}
                                        >
                                            {day.day}
                                        </span>
                                        <span className="flex gap-0.5" aria-hidden="true">
                                            {day.entries.slice(0, day.spends.length > 0 ? 2 : 3).map((entry) => (
                                                <span
                                                    key={entry.id}
                                                    className={cn('size-1.5 rounded-full', CATEGORY_STYLES[entry.category].dot, entry.isPaid && 'opacity-40')}
                                                />
                                            ))}
                                            {day.spends.length > 0 ? (
                                                <span className="size-1.5 rounded-full border border-cat-pocket-fill" />
                                            ) : null}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <dl className="grid grid-cols-3 gap-px border-t border-ft-line bg-ft-line-soft">
                    {[
                        { label: 'Días 1 a 15', totals: halves.firstHalf },
                        { label: 'Días 16 a 31', totals: halves.secondHalf },
                        { label: 'Sin día fijo', totals: halves.floating },
                    ].map((item) => (
                        <div key={item.label} className="min-w-0 bg-white px-3 py-3 sm:px-[18px]">
                            <dt className="text-xs text-ft-ink-3 sm:text-[12.5px]">{item.label}</dt>
                            <dd className="text-[15px] font-semibold text-ft-ink tabular sm:text-[17px]">
                                {formatMoney(item.totals.total)}
                            </dd>
                            <dd className="text-[11.5px] text-ft-ink-3 sm:text-[12px]">
                                {item.totals.count} {item.totals.count === 1 ? 'pago' : 'pagos'} · {item.totals.paidCount}{' '}
                                {item.totals.paidCount === 1 ? 'pagado' : 'pagados'}
                            </dd>
                        </div>
                    ))}
                </dl>
            </Panel>

            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-[18px] xl:max-w-[350px]">
                <Panel aria-labelledby="selected-day-title">
                    <PanelHeader
                        id="selected-day-title"
                        title={longDayLabel(selectedIso)}
                        aside={selectedIso === today ? 'Hoy' : selectedDay?.holiday ?? undefined}
                    />
                    {selectedDay && selectedDay.entries.length > 0 ? (
                        <ul className="px-[18px] pb-3">
                            {selectedDay.entries.map((entry) => (
                                <EntryLine
                                    key={entry.id}
                                    accountName={accountOf(entry)}
                                    entry={entry}
                                    late={isEntryOverdue(entry, yearMonth, today)}
                                    yearMonth={yearMonth}
                                    onToggle={() => toggle(entry)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="px-[18px] pb-4 text-sm text-ft-ink-3">
                            {selectedDay && selectedDay.spends.length > 0 ? 'No hay pagos este día.' : 'No hay pagos ni gastos este día.'}
                        </p>
                    )}
                    {selectedDay && selectedDay.spends.length > 0 ? (
                        <div className="border-t border-ft-line-soft px-[18px] pt-3 pb-3">
                            <p className="flex items-baseline justify-between gap-3 text-[13px] font-medium text-ft-ink-2">
                                Gastos de bolsillo
                                <span className="font-semibold text-ft-ink tabular">
                                    {formatMoney(daySpendTotal(selectedDay.spends))}
                                </span>
                            </p>
                            <ul>
                                {selectedDay.spends.map((item) => (
                                    <SpendLine key={item.spend.id} item={item} />
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </Panel>
                <Panel aria-labelledby="upcoming-title">
                    <PanelHeader id="upcoming-title" title="Próximos pagos" aside="Vencidos y 7 días" />
                    {upcoming.length > 0 ? (
                        <ul className="px-[18px] pb-3">
                            {upcoming.map((entry) => (
                                <EntryLine
                                    key={entry.id}
                                    accountName={accountOf(entry)}
                                    entry={entry}
                                    late={isEntryOverdue(entry, yearMonth, today)}
                                    yearMonth={yearMonth}
                                    onToggle={() => toggle(entry)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="px-[18px] pb-4 text-sm text-ft-ink-3">Nada pendiente en los próximos 7 días.</p>
                    )}
                </Panel>
            </div>
        </div>
    )
}

export function CalendarPage() {
    const { currentYearMonth, hrefFor, yearMonth } = useSelectedMonth()
    const sheet = useSheet(yearMonth)
    const accounts = useAccounts()
    const today = useToday()

    if (!yearMonth || !today || !accounts) {
        return null
    }

    const previous = shiftYearMonth(yearMonth, -1)
    const next = shiftYearMonth(yearMonth, 1)

    return (
        <div className="flex flex-col gap-[18px]">
            <PageHeader
                title="Calendario de pagos"
                actions={
                    <>
                        <FtButton asChild variant="ghost" size="icon">
                            <Link href={hrefFor(previous)} aria-label={`Mes anterior: ${monthLabel(previous)}`}>
                                <ChevronLeft aria-hidden="true" />
                            </Link>
                        </FtButton>
                        <span className="hidden h-10 items-center rounded-lg border border-ft-line bg-white px-3.5 text-sm font-semibold text-ft-ink lg:inline-flex">
                            {monthLabel(yearMonth)}
                        </span>
                        <FtButton asChild variant="ghost" size="icon">
                            <Link href={hrefFor(next)} aria-label={`Mes siguiente: ${monthLabel(next)}`}>
                                <ChevronRight aria-hidden="true" />
                            </Link>
                        </FtButton>
                        {yearMonth !== currentYearMonth ? (
                            <FtButton asChild variant="secondary">
                                <Link href={hrefFor(currentYearMonth)}>Hoy</Link>
                            </FtButton>
                        ) : null}
                    </>
                }
            />
            {sheet ? (
                <CalendarView key={yearMonth} accounts={accounts} entries={sheet.entries} today={today} yearMonth={yearMonth} />
            ) : (
                <Panel>
                    <EmptyState
                        title={`${monthLabel(yearMonth)} todavía no tiene hoja`}
                        action={
                            <FtButton asChild variant="primary">
                                <Link href={`${APP_ROUTES.dashboard}?month=${yearMonth}`}>Ir a la hoja del mes</Link>
                            </FtButton>
                        }
                    >
                        El calendario muestra los pagos con día y lo que gastas de tus bolsillos. Crea la hoja para verlos aquí.
                    </EmptyState>
                </Panel>
            )}
        </div>
    )
}
