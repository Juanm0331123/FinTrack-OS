'use client'

import { ChevronDown, LogOut, Plus, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu } from 'radix-ui'
import { useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { isYearMonth, monthLabel, monthName, shiftYearMonth, yearOf } from '../domain/year-month'
import { monthHref, useSelectedMonth } from '../hooks/use-selected-month'
import { useSheets } from '../hooks/use-workbook-data'
import { Drawer } from '../ui/drawer'
import { NAV_ITEMS, navHref } from './nav-items'
import { SaveIndicator } from './save-indicator'
import { BrandMark, type ShellUser } from './sidebar'
import { MONTH_STATUS_LABELS, useMonthStatuses, type MonthStatus } from './use-month-statuses'

const MONTH_SCOPED = new Set<string>([APP_ROUTES.dashboard, APP_ROUTES.dashboardCalendar, APP_ROUTES.dashboardDebts])

const DOT_CLASSES: Record<MonthStatus, string> = {
    below: 'bg-ft-neg-dot',
    met: 'bg-ft-pos-dot',
    planned: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--ft-ink-4)]',
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

function MonthPicker() {
    const { pathname, yearMonth } = useSelectedMonth()
    const [open, setOpen] = useState(false)
    const year = yearMonth ? yearOf(yearMonth) : null
    const months = useMonthStatuses(year)
    const sheets = useSheets()
    const latest = sheets.at(-1)?.yearMonth
    const candidate = latest ? shiftYearMonth(latest, 1) : null
    const nextMonth = candidate && isYearMonth(candidate) ? candidate : null
    const previousMonth = yearMonth ? shiftYearMonth(yearMonth, -1) : null

    if (!yearMonth) {
        return null
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 text-[19px] font-semibold text-ft-ink outline-none focus-visible:outline-2 focus-visible:outline-ft-focus"
            >
                {monthLabel(yearMonth)}
                <ChevronDown className="size-[18px] text-ft-ink-3" aria-hidden="true" />
                <span className="sr-only">Cambiar de mes</span>
            </button>
            <Drawer open={open} onOpenChange={setOpen} title="Meses" description={year ? `Hojas de ${year}` : undefined}>
                <div className="flex flex-col gap-1">
                    {previousMonth && isYearMonth(previousMonth) ? (
                        <Link
                            href={monthHref(pathname, previousMonth)}
                            onClick={() => setOpen(false)}
                            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ft-ink-2 hover:bg-ft-muted"
                        >
                            ← {capitalize(monthName(previousMonth))}
                        </Link>
                    ) : null}
                    {months.map((month) => (
                        <Link
                            key={month.yearMonth}
                            href={monthHref(pathname, month.yearMonth)}
                            onClick={() => setOpen(false)}
                            aria-current={month.yearMonth === yearMonth ? 'true' : undefined}
                            className={cn(
                                'flex min-h-11 items-center justify-between rounded-lg px-3 text-sm',
                                month.yearMonth === yearMonth ? 'bg-ft-muted font-semibold text-ft-ink' : 'text-ft-ink-2 hover:bg-ft-muted',
                            )}
                        >
                            {capitalize(monthName(month.yearMonth))}
                            <span
                                role="img"
                                aria-label={MONTH_STATUS_LABELS[month.status]}
                                className={cn('size-2 rounded-full', DOT_CLASSES[month.status])}
                            />
                        </Link>
                    ))}
                    {nextMonth ? (
                        <Link
                            href={monthHref(APP_ROUTES.dashboard, nextMonth)}
                            onClick={() => setOpen(false)}
                            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ft-primary hover:bg-ft-primary-soft"
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Crear {monthName(nextMonth)}
                        </Link>
                    ) : null}
                </div>
            </Drawer>
        </>
    )
}

function UserMenu({ onLogout, user }: { onLogout: () => void; user: ShellUser }) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    aria-label={`Menú de ${user.displayName}`}
                    className="grid size-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ft-focus"
                >
                    <span className="grid size-9 place-items-center rounded-full bg-ft-primary-soft text-[13px] font-bold text-ft-primary">
                        {user.initials}
                    </span>
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="finance-theme z-50 min-w-52 rounded-xl border border-ft-line bg-ft-card p-1.5 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.24)]"
                >
                    <DropdownMenu.Label className="px-2.5 py-2 text-[13px] font-semibold text-ft-ink">
                        {user.displayName}
                    </DropdownMenu.Label>
                    <DropdownMenu.Item asChild>
                        <Link
                            href={APP_ROUTES.dashboardSettings}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm text-ft-ink-2 outline-none data-highlighted:bg-ft-muted data-highlighted:text-ft-ink"
                        >
                            <SlidersHorizontal className="size-4" aria-hidden="true" />
                            Configuración
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onSelect={onLogout}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm text-ft-neg outline-none data-highlighted:bg-ft-neg-soft"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        Cerrar sesión
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export function MobileTopBar({ onLogout, user }: { onLogout: () => void; user: ShellUser }) {
    const { pathname } = useSelectedMonth()

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-ft-line bg-ft-card/95 px-3 py-1.5 backdrop-blur-sm lg:hidden">
            {MONTH_SCOPED.has(pathname) ? (
                <MonthPicker />
            ) : (
                <Link href={APP_ROUTES.dashboard} className="flex h-11 items-center gap-2 px-1 text-base font-bold text-ft-ink">
                    <BrandMark />
                    FinTrack OS
                </Link>
            )}
            <div className="flex items-center gap-1">
                <SaveIndicator compact className="sm:hidden" />
                <SaveIndicator className="hidden sm:inline-flex" />
                <UserMenu user={user} onLogout={onLogout} />
            </div>
        </header>
    )
}

export function MobileTabBar() {
    const { pathname, yearMonth } = useSelectedMonth()
    const [month, calendar, debts, summary] = [NAV_ITEMS[0], NAV_ITEMS[3], NAV_ITEMS[2], NAV_ITEMS[1]]
    const linkClass = (active: boolean) =>
        cn(
            'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11.5px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-ft-focus',
            active ? 'text-ft-primary' : 'text-ft-ink-3',
        )

    return (
        <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-ft-line bg-ft-card px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden"
        >
            {[month, calendar].map((item) => (
                <Link
                    key={item.href}
                    href={navHref(item, yearMonth)}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className={linkClass(pathname === item.href)}
                >
                    <item.icon className="size-[22px]" aria-hidden="true" />
                    {item.shortLabel}
                </Link>
            ))}
            <Link
                href={yearMonth ? `${APP_ROUTES.dashboard}?month=${yearMonth}&nuevo=1` : APP_ROUTES.dashboard}
                aria-label="Nuevo gasto"
                className="mx-auto grid size-[52px] place-items-center rounded-full bg-ft-primary text-white shadow-[0_8px_16px_-8px_rgba(36,83,214,0.6)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus"
            >
                <Plus className="size-6" aria-hidden="true" />
            </Link>
            {[debts, summary].map((item) => (
                <Link
                    key={item.href}
                    href={navHref(item, yearMonth)}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className={linkClass(pathname === item.href)}
                >
                    <item.icon className="size-[22px]" aria-hidden="true" />
                    {item.shortLabel}
                </Link>
            ))}
        </nav>
    )
}
