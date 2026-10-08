'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { isYearMonth } from '../domain/year-month'
import { useToday } from './use-today'

const MONTH_SCOPED_ROUTES = new Set<string>([
    APP_ROUTES.dashboard,
    APP_ROUTES.dashboardCalendar,
    APP_ROUTES.dashboardDebts,
])

export function monthHref(pathname: string, yearMonth: string) {
    const base = MONTH_SCOPED_ROUTES.has(pathname) ? pathname : APP_ROUTES.dashboard

    return `${base}?month=${yearMonth}`
}

export function useCurrentYearMonth() {
    const today = useToday()

    return today ? today.slice(0, 7) : ''
}

export function useSelectedMonth() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const currentYearMonth = useCurrentYearMonth()
    const requested = searchParams.get('month')
    const yearMonth = isYearMonth(requested) ? requested : currentYearMonth

    const hrefFor = useCallback(
        (target: string, path: string = pathname) =>
            MONTH_SCOPED_ROUTES.has(path) ? `${path}?month=${target}` : monthHref(path, target),
        [pathname],
    )

    return { currentYearMonth, hrefFor, pathname, yearMonth }
}
