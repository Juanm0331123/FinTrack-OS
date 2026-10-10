'use client'

import { LogOut, Plus } from 'lucide-react'
import Link from 'next/link'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { isYearMonth, monthName, shiftYearMonth, yearOf } from '../domain/year-month'
import { monthHref, useSelectedMonth } from '../hooks/use-selected-month'
import { useSheets } from '../hooks/use-workbook-data'
import { NAV_ITEMS, navHref } from './nav-items'
import { SaveIndicator } from './save-indicator'
import { MONTH_STATUS_LABELS, useMonthStatuses, type MonthStatus } from './use-month-statuses'

export type ShellUser = {
    displayName: string
    initials: string
}

const DOT_CLASSES: Record<MonthStatus, string> = {
    below: 'bg-ft-neg-dot',
    met: 'bg-ft-pos-dot',
    planned: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--ft-ink-4)]',
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

export function BrandMark({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'grid size-[30px] flex-none place-items-center rounded-lg bg-ft-primary text-[13px] font-extrabold text-white',
                className,
            )}
        >
            FT
        </span>
    )
}

export function Sidebar({ onLogout, user }: { onLogout: () => void; user: ShellUser }) {
    const { pathname, yearMonth } = useSelectedMonth()
    const year = yearMonth ? yearOf(yearMonth) : null
    const months = useMonthStatuses(year)
    const sheets = useSheets()
    const latest = sheets.at(-1)?.yearMonth
    const candidate = latest ? shiftYearMonth(latest, 1) : null
    const nextMonth = candidate && isYearMonth(candidate) ? candidate : null
    const showNextMonth = nextMonth !== null && year !== null && yearOf(nextMonth) === year

    return (
        <aside className="sticky top-0 hidden h-dvh w-[252px] flex-none flex-col gap-[22px] border-r border-ft-line bg-ft-card px-3.5 py-5 lg:flex">
            <Link
                href={navHref(NAV_ITEMS[0], yearMonth)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-0.5 text-base font-bold text-ft-ink outline-none focus-visible:outline-2 focus-visible:outline-ft-focus"
            >
                <BrandMark />
                FinTrack OS
            </Link>

            <nav aria-label="Navegación principal" className="flex flex-col gap-0.5">
                {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={navHref(item, yearMonth)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ft-focus',
                                active
                                    ? 'bg-ft-primary-soft font-semibold text-ft-primary'
                                    : 'text-ft-ink-2 hover:bg-ft-muted hover:text-ft-ink',
                            )}
                        >
                            <item.icon className="size-[18px]" aria-hidden="true" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {year !== null ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <p className="mb-1 px-2.5 text-xs font-semibold text-ft-ink-3">Meses de {year}</p>
                    <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
                        {months.map((month) => {
                            const active = month.yearMonth === yearMonth && pathname !== APP_ROUTES.dashboardSummary

                            return (
                                <Link
                                    key={month.yearMonth}
                                    href={monthHref(pathname, month.yearMonth)}
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'flex h-9 flex-none items-center justify-between rounded-lg px-2.5 text-[13.5px] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ft-focus',
                                        active ? 'bg-ft-muted font-semibold text-ft-ink' : 'text-ft-ink-2 hover:bg-ft-muted',
                                    )}
                                >
                                    {capitalize(monthName(month.yearMonth))}
                                    <span
                                        role="img"
                                        aria-label={MONTH_STATUS_LABELS[month.status]}
                                        className={cn('size-2 rounded-full', DOT_CLASSES[month.status])}
                                    />
                                </Link>
                            )
                        })}
                        {showNextMonth && nextMonth ? (
                            <Link
                                href={monthHref(APP_ROUTES.dashboard, nextMonth)}
                                className="flex h-9 flex-none items-center gap-2 rounded-lg px-2.5 text-[13.5px] font-medium text-ft-primary outline-none hover:bg-ft-primary-soft focus-visible:outline-2 focus-visible:outline-ft-focus"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Crear {monthName(nextMonth)}
                            </Link>
                        ) : null}
                        {months.length === 0 && !showNextMonth ? (
                            <p className="px-2.5 text-[13px] text-ft-ink-3">Aún no hay hojas este año.</p>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            <div className="flex flex-col gap-1 border-t border-ft-line pt-3">
                <SaveIndicator className="px-1.5" />
                <div className="flex items-center gap-2.5 px-1.5">
                    <span
                        aria-hidden="true"
                        className="grid size-[34px] flex-none place-items-center rounded-full bg-ft-primary-soft text-[13px] font-bold text-ft-primary"
                    >
                        {user.initials}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ft-ink">{user.displayName}</p>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label="Cerrar sesión"
                                onClick={onLogout}
                                className="grid size-9 cursor-pointer place-items-center rounded-lg text-ft-ink-3 outline-none hover:bg-ft-muted hover:text-ft-ink focus-visible:outline-2 focus-visible:outline-ft-focus"
                            >
                                <LogOut className="size-[18px]" aria-hidden="true" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Cerrar sesión</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </aside>
    )
}
