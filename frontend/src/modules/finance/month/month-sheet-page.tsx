'use client'

import { Check, ChevronLeft, ChevronRight, CircleAlert, Copy, Plus, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { computeSummaryRows } from '../domain/annual-summary'
import { computeMonthSheet } from '../domain/month-sheet'
import { summarizePockets } from '../domain/pockets'
import type { MonthSheet } from '../domain/types'
import { monthLabel, monthName, shiftYearMonth } from '../domain/year-month'
import { useSelectedMonth } from '../hooks/use-selected-month'
import { useToday } from '../hooks/use-today'
import { useAccounts, usePreviousSheet, useSettings, useSheet, useSheets } from '../hooks/use-workbook-data'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { ConfirmDialog } from '../ui/drawer'
import { PageHeader, StatusPill } from '../ui/layout-parts'
import { AccountBreakdown, CategoryBreakdown } from './breakdown-cards'
import { EntriesCard } from './entries-card'
import { EntryDrawer, type EntryEditorTarget } from './entry-drawer'
import { IncomeCard, type PocketLeftover } from './income-card'
import { KpiCard } from './kpi-card'
import { CreateMonthState, FirstRunSetup } from './month-empty-states'
import { PocketsCard } from './pockets-card'

type EditorState = {
    open: boolean
    session: number
    target: EntryEditorTarget | null
}

function MonthNavigation({ yearMonth }: { yearMonth: string }) {
    const { hrefFor } = useSelectedMonth()
    const previous = shiftYearMonth(yearMonth, -1)
    const next = shiftYearMonth(yearMonth, 1)

    return (
        <>
            <FtButton asChild variant="ghost" size="icon">
                <Link href={hrefFor(previous)} aria-label={`Mes anterior: ${monthLabel(previous)}`}>
                    <ChevronLeft aria-hidden="true" />
                </Link>
            </FtButton>
            <FtButton asChild variant="ghost" size="icon">
                <Link href={hrefFor(next)} aria-label={`Mes siguiente: ${monthLabel(next)}`}>
                    <ChevronRight aria-hidden="true" />
                </Link>
            </FtButton>
        </>
    )
}

function MonthSheetView({ sheet, yearMonth }: { sheet: MonthSheet; yearMonth: string }) {
    const settings = useSettings()
    const accounts = useAccounts()
    const sheets = useSheets()
    const previous = usePreviousSheet(yearMonth)
    const actions = useWorkbookActions()
    const today = useToday()
    const router = useRouter()
    const searchParams = useSearchParams()
    const wantsNew = searchParams.get('nuevo') === '1'
    const [editor, setEditor] = useState<EditorState>({ open: false, session: 0, target: null })
    const [confirmCopy, setConfirmCopy] = useState(false)
    const [copying, setCopying] = useState(false)
    const [copyError, setCopyError] = useState<string | null>(null)

    const summary = useMemo(
        () => (settings && accounts ? computeMonthSheet(sheet, settings, accounts) : null),
        [accounts, settings, sheet],
    )
    const accumulatedSavings = useMemo(() => {
        if (!settings || !accounts) {
            return 0
        }

        return (
            computeSummaryRows(sheets, settings, accounts).find((row) => row.yearMonth === yearMonth)
                ?.accumulatedSavings ?? 0
        )
    }, [accounts, settings, sheets, yearMonth])

    const openNew = useCallback(
        () => setEditor((current) => ({ open: true, session: current.session + 1, target: { mode: 'new' } })),
        [],
    )
    const openEdit = useCallback(
        (entryId: string) =>
            setEditor((current) => ({ ...current, open: true, target: { entryId, mode: 'edit' } })),
        [],
    )
    const openSpend = useCallback(
        (entryId: string) =>
            setEditor((current) => ({ ...current, open: true, target: { entryId, focus: 'spend', mode: 'edit' } })),
        [],
    )
    const pocketLeftover = useMemo<PocketLeftover | null>(() => {
        const monthIsClosed = previous !== null && today !== '' && previous.yearMonth < today.slice(0, 7)

        if (!previous || !monthIsClosed || previous.yearMonth !== shiftYearMonth(yearMonth, -1)) {
            return null
        }

        const { totals } = summarizePockets(previous.entries)

        return totals.trackedCount > 0 && totals.leftover > 0
            ? { amount: totals.leftover, monthName: monthName(previous.yearMonth) }
            : null
    }, [previous, today, yearMonth])
    const onDrawerChange = (open: boolean) => {
        if (open) {
            return
        }

        setEditor((current) => ({ ...current, open: false }))

        if (wantsNew) {
            router.replace(`${APP_ROUTES.dashboard}?month=${yearMonth}`, { scroll: false })
        }
    }

    const copyPrevious = async () => {
        setCopying(true)
        setCopyError(null)

        try {
            await actions.copyPreviousSheet(yearMonth)
        } catch (error) {
            setCopyError(error instanceof Error ? error.message : 'No pudimos copiar el mes anterior.')
        } finally {
            setCopying(false)
        }
    }

    if (!summary || !settings || !accounts) {
        return null
    }

    const drawerOpen = editor.open || wantsNew
    const drawerTarget: EntryEditorTarget | null = editor.open ? editor.target : wantsNew ? { mode: 'new' } : editor.target
    const status = summary.isOverspent ? (
        <StatusPill tone="neg">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            Gastos superan el ingreso
        </StatusPill>
    ) : summary.meetsCushion ? (
        <StatusPill tone="pos">
            <Check className="size-3.5" aria-hidden="true" />
            Meta cumplida
        </StatusPill>
    ) : (
        <StatusPill tone="warn">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            Por debajo del colchón
        </StatusPill>
    )

    return (
        <div className="flex flex-col gap-[18px]">
            <PageHeader
                title={monthLabel(yearMonth)}
                titleClassName="max-lg:sr-only"
                badge={status}
                actions={
                    <>
                        <MonthNavigation yearMonth={yearMonth} />
                        <FtButton
                            variant="secondary"
                            disabled={!previous || copying}
                            title={previous ? undefined : 'No hay un mes anterior para copiar'}
                            onClick={() => (sheet.entries.length > 0 ? setConfirmCopy(true) : void copyPrevious())}
                        >
                            <Copy aria-hidden="true" />
                            {copying ? 'Copiando…' : 'Copiar mes anterior'}
                        </FtButton>
                        <FtButton variant="primary" className="hidden md:inline-flex" onClick={openNew}>
                            <Plus aria-hidden="true" />
                            Nuevo gasto
                        </FtButton>
                    </>
                }
            />
            {copyError ? (
                <p role="alert" className="rounded-lg border border-ft-neg-border bg-ft-neg-soft px-4 py-3 text-sm font-medium text-ft-neg">
                    {copyError}
                </p>
            ) : null}

            <KpiCard summary={summary} accumulatedSavings={accumulatedSavings} />

            <PocketsCard entries={sheet.entries} todayIso={today} yearMonth={yearMonth} onSpend={openSpend} />

            <div className="flex flex-wrap items-start gap-[18px]">
                <EntriesCard
                    accounts={accounts}
                    billsTotal={summary.billsTotal}
                    entries={sheet.entries}
                    paidTotal={summary.paidTotal}
                    todayIso={today}
                    yearMonth={yearMonth}
                    onAdd={openNew}
                    onEdit={openEdit}
                    onSpend={openSpend}
                />
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] xl:max-w-[372px]">
                    <IncomeCard
                        sheet={sheet}
                        income={summary}
                        benefitsRate={settings.benefitsRate}
                        pocketLeftover={pocketLeftover}
                    />
                    <CategoryBreakdown totals={summary.byCategory} />
                    <AccountBreakdown totals={summary.byAccount} />
                </div>
            </div>

            <EntryDrawer
                open={drawerOpen}
                session={editor.session}
                target={drawerTarget}
                yearMonth={yearMonth}
                onOpenChange={onDrawerChange}
            />
            {previous ? (
                <ConfirmDialog
                    open={confirmCopy}
                    onOpenChange={setConfirmCopy}
                    title={`¿Copiar las filas de ${monthName(previous.yearMonth)}?`}
                    description={`Se agregan ${previous.entries.length} filas al final de ${monthName(yearMonth)}: los pagos quedan pendientes y los bolsillos empiezan sin gastos. Las filas que ya tienes no cambian.`}
                    confirmLabel="Copiar filas"
                    onConfirm={() => void copyPrevious()}
                />
            ) : null}
        </div>
    )
}

export function MonthSheetPage() {
    const { yearMonth } = useSelectedMonth()
    const sheet = useSheet(yearMonth)
    const sheets = useSheets()

    if (!yearMonth) {
        return null
    }

    if (!sheet) {
        return (
            <div className="flex flex-col gap-[18px]">
                {sheets.length > 0 ? (
                    <>
                        <PageHeader
                            title={monthLabel(yearMonth)}
                            titleClassName="max-lg:sr-only"
                            actions={<MonthNavigation yearMonth={yearMonth} />}
                        />
                        <CreateMonthState yearMonth={yearMonth} />
                    </>
                ) : (
                    <FirstRunSetup yearMonth={yearMonth} />
                )}
            </div>
        )
    }

    return <MonthSheetView key={yearMonth} sheet={sheet} yearMonth={yearMonth} />
}
