'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { computeSummaryRows, summarizeYear } from '../domain/annual-summary'
import { monthLabel } from '../domain/year-month'
import { useToday } from '../hooks/use-today'
import { useAccounts, useSettings, useSheets } from '../hooks/use-workbook-data'
import { formatMoney } from '../lib/format'
import { FtButton } from '../ui/button'
import { EmptyState, PageHeader } from '../ui/layout-parts'
import { Panel, PanelHeader } from '../ui/panel'
import { SummaryChart } from './summary-chart'

// Mismo rango que las hojas del API (2000..2099).
const MIN_YEAR = 2000
const MAX_YEAR = 2099

function parseYear(value: string | null) {
    const year = Number(value)

    return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null
}

export function SummaryPage() {
    const searchParams = useSearchParams()
    const today = useToday()
    const sheets = useSheets()
    const settings = useSettings()
    const accounts = useAccounts()
    const year = parseYear(searchParams.get('year')) ?? (today ? Number(today.slice(0, 4)) : null)

    const allRows = useMemo(
        () => (settings && accounts ? computeSummaryRows(sheets, settings, accounts) : []),
        [accounts, settings, sheets],
    )
    const summary = useMemo(() => (year === null ? null : summarizeYear(allRows, year)), [allRows, year])

    if (year === null || !summary || !settings) {
        return null
    }

    const href = (target: number) => `${APP_ROUTES.dashboardSummary}?year=${target}`

    return (
        <div className="flex flex-col gap-[18px]">
            <PageHeader
                title={`Resumen ${year}`}
                subtitle="Ingresos, gastos, colchón y ahorro de cada mes"
                actions={
                    <>
                        {year > MIN_YEAR ? (
                            <FtButton asChild variant="ghost" size="icon">
                                <Link href={href(year - 1)} aria-label={`Año anterior: ${year - 1}`}>
                                    <ChevronLeft aria-hidden="true" />
                                </Link>
                            </FtButton>
                        ) : null}
                        {year < MAX_YEAR ? (
                            <FtButton asChild variant="ghost" size="icon">
                                <Link href={href(year + 1)} aria-label={`Año siguiente: ${year + 1}`}>
                                    <ChevronRight aria-hidden="true" />
                                </Link>
                            </FtButton>
                        ) : null}
                    </>
                }
            />

            {summary.rows.length === 0 ? (
                <Panel>
                    <EmptyState
                        title={`Aún no hay meses en ${year}`}
                        action={
                            <FtButton asChild variant="primary">
                                <Link href={APP_ROUTES.dashboard}>Ir a la hoja del mes</Link>
                            </FtButton>
                        }
                    >
                        Cuando crees hojas de este año, aquí verás ingresos, gastos, pagos a deudas, suscripciones y el
                        ahorro acumulado.
                    </EmptyState>
                </Panel>
            ) : (
                <>
                    <section aria-label="Totales del año" className="overflow-hidden rounded-xl border border-ft-line">
                        <dl className="grid grid-cols-2 gap-px bg-ft-line-soft lg:grid-cols-4">
                            {[
                                { caption: `${summary.rows.length} meses con hoja`, label: 'Ingreso neto del año', value: summary.netIncome },
                                { caption: `Suscripciones ${formatMoney(summary.subscriptions)}`, label: 'Gastos del año', value: summary.totalExpenses },
                                { caption: 'Categoría Deuda', label: 'Pagos a deudas', value: summary.debtPayments },
                                {
                                    caption: `${summary.monthsMeetingCushion} de ${summary.rows.length} meses con meta cumplida`,
                                    label: 'Ahorro acumulado',
                                    value: summary.accumulatedSavings,
                                },
                            ].map((item) => (
                                <div key={item.label} className="bg-white px-4 py-4 sm:px-[18px]">
                                    <dt className="text-[13px] font-medium text-ft-ink-3">{item.label}</dt>
                                    <dd className="mt-1 text-xl font-semibold tracking-[-0.015em] text-ft-ink tabular sm:text-[22px]">
                                        {formatMoney(item.value)}
                                    </dd>
                                    <dd className="mt-0.5 text-[12.5px] text-ft-ink-3">{item.caption}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <Panel aria-labelledby="chart-title">
                        <PanelHeader id="chart-title" title="Ingreso neto y gastos por mes" />
                        <div className="px-4 pb-4 sm:px-[18px]">
                            <SummaryChart year={year} rows={summary.rows} cushion={settings.cushionAmount} />
                        </div>
                    </Panel>

                    <Panel aria-labelledby="table-title">
                        <PanelHeader id="table-title" title="Resumen mensual" aside="Toca un mes para abrir su hoja" />
                        <div className="overflow-x-auto border-t border-ft-line">
                            <table className="w-full min-w-[980px] border-collapse text-sm">
                                <caption className="sr-only">Resumen mensual de {year}</caption>
                                <thead>
                                    <tr className="bg-ft-hover text-[12.5px] text-ft-ink-3">
                                        {[
                                            'Mes',
                                            'Ingreso neto',
                                            'Total gastos',
                                            'Pagos a deudas',
                                            'Suscripciones',
                                            'Disponible',
                                            'Colchón',
                                            '¿Cumple meta?',
                                            'Ahorro del mes',
                                            'Ahorro acumulado',
                                        ].map((label, index) => (
                                            <th
                                                key={label}
                                                scope="col"
                                                className={cn(
                                                    'h-10 px-3 font-medium first:pl-[18px] last:pr-[18px]',
                                                    index === 0 || index === 7 ? 'text-left' : 'text-right',
                                                    index === 0 && 'sticky left-0 z-[1] bg-ft-hover shadow-[1px_0_0_var(--ft-line-soft)]',
                                                )}
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.rows.map((row) => (
                                        <tr key={row.yearMonth} className="group border-b border-ft-line-soft hover:bg-ft-hover">
                                            <th
                                                scope="row"
                                                className="sticky left-0 z-[1] h-12 bg-ft-card pr-3 pl-[18px] text-left font-semibold whitespace-nowrap text-ft-ink shadow-[1px_0_0_var(--ft-line-soft)] group-hover:bg-ft-hover"
                                            >
                                                <Link
                                                    href={`${APP_ROUTES.dashboard}?month=${row.yearMonth}`}
                                                    className="inline-flex min-h-11 items-center rounded outline-none hover:text-ft-primary hover:underline focus-visible:outline-2 focus-visible:outline-ft-focus lg:min-h-0"
                                                >
                                                    {monthLabel(row.yearMonth)}
                                                </Link>
                                            </th>
                                            {[row.netIncome, row.totalExpenses, row.debtPayments, row.subscriptions].map((value, index) => (
                                                <td key={index} className="px-3 text-right text-ft-ink tabular">
                                                    {formatMoney(value)}
                                                </td>
                                            ))}
                                            <td className={cn('px-3 text-right font-semibold tabular', row.available < 0 ? 'text-ft-neg' : 'text-ft-ink')}>
                                                {formatMoney(row.available)}
                                            </td>
                                            <td className="px-3 text-right text-ft-ink-2 tabular">{formatMoney(row.cushion)}</td>
                                            <td className="px-3">
                                                <span
                                                    className={cn(
                                                        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold',
                                                        row.meetsCushion ? 'bg-ft-pos-soft text-ft-pos' : 'bg-ft-warn-soft text-ft-warn',
                                                    )}
                                                >
                                                    {row.meetsCushion ? 'Sí' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-3 text-right text-ft-ink tabular">{formatMoney(row.savings)}</td>
                                            <td className="pr-[18px] pl-3 text-right font-semibold text-ft-ink tabular">
                                                {formatMoney(row.accumulatedSavings)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-ft-hover font-semibold text-ft-ink">
                                        <th
                                            scope="row"
                                            className="sticky left-0 z-[1] h-11 bg-ft-hover pr-3 pl-[18px] text-left whitespace-nowrap shadow-[1px_0_0_var(--ft-line-soft)]"
                                        >
                                            Total {year}
                                        </th>
                                        {[summary.netIncome, summary.totalExpenses, summary.debtPayments, summary.subscriptions].map(
                                            (value, index) => (
                                                <td key={index} className="px-3 text-right tabular">
                                                    {formatMoney(value)}
                                                </td>
                                            ),
                                        )}
                                        <td className="px-3 text-right tabular">
                                            {formatMoney(summary.rows.reduce((sum, row) => sum + row.available, 0))}
                                        </td>
                                        <td className="px-3" />
                                        <td className="px-3 text-[12.5px] text-ft-ink-2">
                                            {summary.monthsMeetingCushion} de {summary.rows.length}
                                        </td>
                                        <td className="px-3 text-right tabular">{formatMoney(summary.savings)}</td>
                                        <td className="pr-[18px] pl-3 text-right tabular">{formatMoney(summary.accumulatedSavings)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Panel>
                </>
            )}
        </div>
    )
}
