'use client'

import { LogOut, Plus } from 'lucide-react'
import Link from 'next/link'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { BrandLogo } from '@/shared/ui/brand-logo'
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
    planned: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--ft-control)]',
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1)
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
        // Superficie Panel (DESIGN.md › Navigation): el cromo del espacio de trabajo se separa del suelo por tono.
        // Sobre Panel solo va tinta secundaria o más oscura; la tinta terciaria no alcanza 4,5:1.
        <aside className="sticky top-0 hidden h-dvh w-[252px] flex-none flex-col gap-[22px] bg-ft-panel px-3.5 py-5 lg:flex">
            <BrandLogo variant="full" size="sm" href={navHref(NAV_ITEMS[0], yearMonth)} className="self-start" />

            <nav aria-label="Navegación principal" className="flex flex-col gap-0.5">
                {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={navHref(item, yearMonth)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 focus-ring',
                                active
                                    ? 'bg-ft-primary-soft font-semibold text-ft-primary'
                                    : 'text-ft-ink-2 hover:bg-ft-panel-strong hover:text-ft-ink',
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
                    <p className="mb-1 px-2.5 text-xs font-semibold text-ft-ink-2">Meses de {year}</p>
                    <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
                        {months.map((month) => {
                            const active = month.yearMonth === yearMonth && pathname !== APP_ROUTES.dashboardSummary

                            return (
                                <Link
                                    key={month.yearMonth}
                                    href={monthHref(pathname, month.yearMonth)}
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'flex h-9 flex-none items-center justify-between rounded-lg px-2.5 text-[13.5px] transition-colors duration-150 focus-ring',
                                        active ? 'bg-ft-card font-semibold text-ft-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]' : 'text-ft-ink-2 hover:bg-ft-panel-strong hover:text-ft-ink',
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
                                className="flex h-9 flex-none items-center gap-2 rounded-lg px-2.5 text-[13.5px] font-medium text-ft-primary hover:bg-ft-primary-soft focus-ring"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Crear {monthName(nextMonth)}
                            </Link>
                        ) : null}
                        {months.length === 0 && !showNextMonth ? (
                            <p className="px-2.5 text-[13px] text-ft-ink-2">Aún no hay hojas este año.</p>
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
                                className="grid size-9 cursor-pointer place-items-center rounded-lg text-ft-ink-2 hover:bg-ft-panel-strong hover:text-ft-ink focus-ring"
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
