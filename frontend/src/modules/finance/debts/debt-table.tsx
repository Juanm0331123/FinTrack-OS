import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import type { DebtPlanRow } from '../domain/debt-plan'
import { formatMoney, formatPercent } from '../lib/format'
import { DEBT_SORT_OPTIONS, type DebtSortKey, type DebtViewSort } from './debt-list-view'
import { ACTION_LABELS, ACTION_STYLES, monthsText } from './debt-presentation'

const COLUMNS = DEBT_SORT_OPTIONS.filter((option) => option.value !== 'strategy')

export function DebtTable({ onOpen, onSort, rows, sort }: {
    onOpen: (id: string) => void
    onSort: (key: DebtSortKey) => void
    rows: readonly DebtPlanRow[]
    sort: DebtViewSort
}) {
    return (
        <div className="hidden min-w-0 overflow-hidden rounded-xl border border-ft-line bg-white lg:block">
            <div role="region" aria-label="Tabla de deudas activas con desplazamiento horizontal" tabIndex={0} className="overflow-x-auto rounded-xl focus-ring-inset">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm text-ft-ink">
                    <caption className="sr-only">Deudas activas. Pulsa un encabezado para ordenar la vista; la prioridad de cada deuda y los pagos recomendados no cambian.</caption>
                    <thead className="bg-ft-hover text-[12.5px] text-ft-ink-2">
                        <tr>
                            {COLUMNS.map((column) => {
                                const selected = sort.key === column.value
                                const Icon = selected ? sort.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown

                                return (
                                    <th key={column.value} scope="col" aria-sort={selected ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="px-3 first:pl-5 last:pr-5">
                                        <button
                                            type="button"
                                            className={cn('flex min-h-11 w-full cursor-pointer items-center gap-1.5 rounded-sm py-2 text-left font-semibold focus-ring-inset hover:text-ft-primary', selected && 'text-ft-primary')}
                                            aria-label={`Ordenar por ${column.label.toLocaleLowerCase('es-CO')} ${selected && sort.direction === 'asc' ? 'descendente' : 'ascendente'}`}
                                            onClick={() => onSort(column.value)}
                                        >
                                            {column.label}
                                            <Icon className="size-3.5 flex-none" aria-hidden="true" />
                                        </button>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.debt.id} className="border-t border-ft-line-soft align-top hover:bg-ft-hover">
                                <td className="min-w-52 py-4 pr-3 pl-5">
                                    <p className={cn('text-xs font-medium', row.priority === 1 ? 'text-ft-neg' : 'text-ft-ink-2')}>Prioridad {row.priority}</p>
                                    <button type="button" onClick={() => onOpen(row.debt.id)} className="mt-1 min-h-8 cursor-pointer rounded-sm text-left font-semibold text-ft-ink focus-ring hover:underline">
                                        {row.debt.name}
                                    </button>
                                    {row.debt.lender ? <p className="mt-0.5 text-xs text-ft-ink-2">{row.debt.lender}</p> : null}
                                    {row.debt.datesNote ? <p className="mt-0.5 text-xs text-ft-ink-2">{row.debt.datesNote}</p> : null}
                                </td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatMoney(row.debt.totalBalance)}</td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatMoney(row.myBalance)}</td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatPercent(row.monthlyCost, 2)}</td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatPercent(row.effectiveAnnualRate, 1)}</td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatMoney(row.myMinimum)}</td>
                                <td className="px-3 py-4 font-medium whitespace-nowrap tabular">{formatMoney(row.currentPayment)}</td>
                                <td className="min-w-64 py-4 pr-5 pl-3">
                                    <p className="font-semibold whitespace-nowrap tabular">{formatMoney(row.recommended)}</p>
                                    <p className={cn('mt-1 text-xs leading-5', row.monthsRemaining === null ? 'text-ft-neg' : 'text-ft-ink-2')}>{monthsText(row)}</p>
                                    {row.extra > 0 ? <p className="mt-1 text-xs leading-5 text-ft-ink-2">Base {formatMoney(row.base)} + extra {formatMoney(row.extra)}</p> : null}
                                    {row.capBelowMinimum && row.cap !== null ? <p className="mt-1 text-xs leading-5 text-ft-warn">Tu tope ({formatMoney(row.cap)}) es menor que tu cuota mínima: mantenemos esa cuota hasta tu saldo, sin abono extra. Revisa el tope o la cuota vigente.</p> : null}
                                    <span className={cn('mt-2 inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold', ACTION_STYLES[row.action])}>{ACTION_LABELS[row.action]}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
