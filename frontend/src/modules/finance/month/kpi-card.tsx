import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import type { MonthSheetSummary } from '../domain/month-sheet'
import { formatMoney } from '../lib/format'
import { Meter } from '../ui/layout-parts'

function Kpi({
    caption,
    captionTone,
    children,
    className,
    label,
    value,
    valueTone,
}: {
    caption?: ReactNode
    captionTone?: 'neg' | 'pos'
    children?: ReactNode
    className?: string
    label: string
    value: string
    valueTone?: 'neg'
}) {
    return (
        <div className={cn('min-w-0 bg-ft-card px-4 py-4 sm:px-[18px]', className)}>
            <dt className="text-[13px] font-medium text-ft-ink-3">{label}</dt>
            <dd
                className={cn(
                    'mt-1 truncate text-xl font-semibold tracking-[-0.015em] text-ft-ink tabular sm:text-[22px]',
                    valueTone === 'neg' && 'text-ft-neg',
                )}
            >
                {value}
            </dd>
            {caption ? (
                <dd
                    className={cn(
                        'mt-0.5 text-[12.5px] text-ft-ink-3',
                        captionTone === 'pos' && 'text-ft-pos',
                        captionTone === 'neg' && 'font-medium text-ft-neg',
                    )}
                >
                    {caption}
                </dd>
            ) : null}
            {children}
        </div>
    )
}

export function KpiCard({ accumulatedSavings, summary }: { accumulatedSavings: number; summary: MonthSheetSummary }) {
    const ratio =
        summary.cushion > 0
            ? Math.round((summary.available / summary.cushion) * 100)
            : summary.available > 0
              ? 100
              : 0

    return (
        <section aria-label="Resumen del mes" className="overflow-hidden rounded-xl border border-ft-line">
            <dl className="grid grid-cols-2 gap-px bg-ft-line-soft lg:grid-cols-5">
                <Kpi
                    label="Ingreso neto"
                    value={formatMoney(summary.netIncome)}
                    caption={summary.usesDisabilityIncome ? 'Con salario de incapacidad' : 'Salario menos descuentos'}
                />
                <Kpi
                    label="Total gastos"
                    value={formatMoney(summary.totalExpenses)}
                    caption={`${summary.entryCount} ${summary.entryCount === 1 ? 'movimiento' : 'movimientos'}`}
                />
                <Kpi
                    label="Disponible"
                    value={formatMoney(summary.available)}
                    valueTone={summary.isOverspent ? 'neg' : undefined}
                    caption={
                        summary.pockets.overspent > 0
                            ? `${formatMoney(summary.pockets.overspent)} de más en bolsillos`
                            : undefined
                    }
                    captionTone="neg"
                >
                    <dd className="mt-2">
                        <Meter
                            value={ratio}
                            label={`Disponible frente al colchón: ${ratio}%`}
                        />
                    </dd>
                </Kpi>
                <Kpi
                    label="Excedente sobre colchón"
                    value={formatMoney(summary.surplus)}
                    caption={`Colchón ${formatMoney(summary.cushion)}`}
                    captionTone={summary.meetsCushion ? 'pos' : undefined}
                />
                <Kpi
                    className="col-span-2 lg:col-span-1"
                    label="Ahorro del mes"
                    value={formatMoney(summary.savings)}
                    caption={`Acumulado ${formatMoney(accumulatedSavings)}`}
                />
            </dl>
        </section>
    )
}
