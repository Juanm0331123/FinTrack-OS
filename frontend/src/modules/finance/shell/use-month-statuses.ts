'use client'

import { useMemo } from 'react'

import { computeMonthSheet } from '../domain/month-sheet'
import { yearOf } from '../domain/year-month'
import { useCurrentYearMonth } from '../hooks/use-selected-month'
import { useAccounts, useSettings, useSheets } from '../hooks/use-workbook-data'

export type MonthStatus = 'below' | 'met' | 'planned'

export function useMonthStatuses(year: number | null) {
    const sheets = useSheets()
    const settings = useSettings()
    const accounts = useAccounts()
    const currentYearMonth = useCurrentYearMonth()

    return useMemo(() => {
        if (year === null || !settings || !accounts) {
            return []
        }

        return sheets
            .filter((sheet) => yearOf(sheet.yearMonth) === year)
            .map((sheet) => {
                const status: MonthStatus =
                    currentYearMonth && sheet.yearMonth > currentYearMonth
                        ? 'planned'
                        : computeMonthSheet(sheet, settings, accounts).meetsCushion
                          ? 'met'
                          : 'below'

                return { status, yearMonth: sheet.yearMonth }
            })
    }, [accounts, currentYearMonth, settings, sheets, year])
}

export const MONTH_STATUS_LABELS: Record<MonthStatus, string> = {
    below: 'Por debajo del colchón',
    met: 'Meta cumplida',
    planned: 'Planeado',
}
