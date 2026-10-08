'use client'

import { useMemo } from 'react'

import { computeMonthSheet } from '../domain/month-sheet'
import type { MonthSheet } from '../domain/types'
import { useWorkbookState } from '../store/workbook-context'

const EMPTY_SHEETS: MonthSheet[] = []

export function useSettings() {
    return useWorkbookState((state) => state.workbook?.settings ?? null)
}

export function useAccounts() {
    return useWorkbookState((state) => state.workbook?.accounts ?? null)
}

export function useDebts() {
    return useWorkbookState((state) => state.workbook?.debts ?? null)
}

export function useSheets() {
    return useWorkbookState((state) => state.workbook?.sheets ?? EMPTY_SHEETS)
}

export function useSheet(yearMonth: string) {
    return useWorkbookState(
        (state) => state.workbook?.sheets.find((sheet) => sheet.yearMonth === yearMonth) ?? null,
    )
}

export function useMonthSummary(yearMonth: string) {
    const sheet = useSheet(yearMonth)
    const settings = useSettings()
    const accounts = useAccounts()

    return useMemo(
        () => (sheet && settings && accounts ? computeMonthSheet(sheet, settings, accounts) : null),
        [accounts, settings, sheet],
    )
}

export function usePreviousSheet(yearMonth: string) {
    return useWorkbookState(
        (state) =>
            state.workbook?.sheets.findLast((sheet) => sheet.yearMonth < yearMonth) ?? null,
    )
}
