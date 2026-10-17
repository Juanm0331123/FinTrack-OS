import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { CATEGORY_LABELS } from '@/modules/finance/domain/categories'
import type { ResolvedDebtStrategy } from '@/modules/finance/domain/debt-plan'
import type { EntryCategory } from '@/modules/finance/domain/types'
import { monthLabel, shortMonthLabel } from '@/modules/finance/domain/year-month'
import { formatMoney, formatPercent } from '@/modules/finance/lib/format'
import { cn } from '@/shared/lib/utils'
import { landingSample, type LandingSampleRow } from './landing-sample'
import { landingSheet } from './landing-styles'

// Demostraciones estáticas de la landing con el tratamiento de A: hojas blancas flotantes, píldoras
// de categoría y estado. Datos sintéticos rotulados; no son formularios, no guardan nada ni piden
// sesión. `.finance-theme` aporta los colores de categoría del espacio de trabajo.

const { debt, month, pocket, year } = landingSample

const CATEGORY_PILL: Record<EntryCategory, string> = {
    DEBT: 'bg-cat-debt-soft text-cat-debt',
    FIXED: 'bg-cat-fixed-soft text-cat-fixed',
    OTHER: 'bg-cat-other-soft text-cat-other',
    POCKET: 'bg-cat-pocket-soft text-cat-pocket',
    SAVINGS: 'bg-cat-savings-soft text-cat-savings',
    SUBSCRIPTION: 'bg-cat-subscription-soft text-cat-subscription',
}

const STRATEGY_LABEL: Record<ResolvedDebtStrategy, string> = {
    AVALANCHE: 'mayor interés',
    CASH_FLOW: 'flujo de caja',
    HIGHEST_PAYMENT: 'mayor cuota',
    LOWEST_PAYMENT: 'menor cuota',
}

// «Agosto 2026» → «Agosto de 2026», como en el copy aprobado.
function longMonthLabel(yearMonth: string) {
    return monthLabel(yearMonth).replace(' ', ' de ')
}

const sheetClassName = cn('finance-theme text-ft-ink', landingSheet)

function SampleTag({ children = 'Datos de ejemplo' }: { children?: ReactNode }) {
    return (
        <p className="w-fit flex-none rounded-full bg-ft-muted px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap text-ft-ink-2">
            {children}
        </p>
    )
}

function Money({ value, className }: { className?: string; value: number }) {
    return <span className={cn('tabular-nums whitespace-nowrap', className)}>{formatMoney(value)}</span>
}

function CategoryPill({ category }: { category: EntryCategory }) {
    return (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-medium', CATEGORY_PILL[category])}>
            {CATEGORY_LABELS[category]}
        </span>
    )
}

function EntryStatus({ row }: { row: LandingSampleRow }) {
    if (row.pocketSpent !== null) {
        return (
            <span className="text-[12.5px] text-ft-ink-2">
                Usado <Money value={row.pocketSpent} />
            </span>
        )
    }

    return row.isPaid ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ft-pos-border bg-ft-pos-soft px-2.5 py-0.5 text-[12.5px] font-medium whitespace-nowrap text-ft-pos">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ft-pos-dot" />
            <span>Pagado</span>
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ft-line bg-ft-card px-2.5 py-0.5 text-[12.5px] font-medium whitespace-nowrap text-ft-ink-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ft-ink-4" />
            <span>Pendiente</span>
        </span>
    )
}

function MeterBar({ height = 'h-1.5', label, share, tone }: { height?: string; label: string; share: number; tone: 'pocket' | 'positive' }) {
    return (
        <div role="img" aria-label={label} className={cn('overflow-hidden rounded-full', height, tone === 'pocket' ? 'bg-ft-muted' : 'bg-ft-pos-soft')}>
            <div
                className={cn('h-full rounded-full', tone === 'pocket' ? 'bg-cat-pocket-fill' : 'bg-ft-pos-dot')}
                style={{ width: `${Math.round(Math.min(1, share) * 100)}%` }}
            />
        </div>
    )
}

function Kpi({ children, extra, label }: { children: ReactNode; extra?: ReactNode; label: string }) {
    return (
        <div className="bg-ft-card px-4 py-4 sm:px-[18px]">
            <dt className="text-[13px] font-medium text-ft-ink-3">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tracking-[-0.015em] sm:text-[22px]">{children}</dd>
            {extra}
        </div>
    )
}

export function MonthSheetDemo() {
    return (
        <figure className={cn(sheetClassName, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ft-line-soft px-4 py-4 sm:px-[22px]">
                <p className="text-[15px] font-semibold">{monthLabel(month.yearMonth)}</p>
                <SampleTag>
                    Datos de ejemplo<span className="max-sm:hidden"> · Octubre de 2026</span> · Pesos colombianos
                </SampleTag>
            </div>
            <dl className="grid grid-cols-2 gap-px border-b border-ft-line-soft bg-ft-line-soft sm:grid-cols-4">
                <Kpi label="Ingreso neto">
                    <Money value={month.netIncome} />
                </Kpi>
                <Kpi label="Total gastos">
                    <Money value={month.totalExpenses} />
                </Kpi>
                <Kpi
                    label="Disponible"
                    extra={
                        <dd className="mt-2">
                            <MeterBar label="El disponible supera el colchón mínimo" share={month.available / month.cushion} tone="positive" />
                        </dd>
                    }
                >
                    <Money value={month.available} />
                </Kpi>
                <Kpi
                    label="Excedente sobre colchón"
                    extra={
                        <dd className="mt-1 text-[12.5px] font-medium text-ft-pos">
                            Colchón <Money value={month.cushion} />
                            {month.meetsCushion ? ' · Meta cumplida' : null}
                        </dd>
                    }
                >
                    <Money value={month.surplus} />
                </Kpi>
            </dl>

            {/* Teléfonos: filas apiladas. Desde 640px, tabla. Solo una de las dos se muestra. */}
            <ul className="sm:hidden" aria-label="Gastos de octubre de 2026, datos de ejemplo">
                {month.rows.map((row) => (
                    <li key={row.concept} className="flex justify-between gap-3 border-t border-ft-line-soft px-4 py-3 text-sm first:border-t-0">
                        <span className="flex min-w-0 flex-col items-start gap-1">
                            <b className="font-semibold">{row.concept}</b>
                            <span className="text-[12.5px] text-ft-ink-3">
                                {row.accountName}
                                {row.dueDay !== null ? ` · día ${row.dueDay}` : null}
                            </span>
                            <CategoryPill category={row.category} />
                        </span>
                        <span className="flex flex-none flex-col items-end gap-1.5">
                            <Money value={row.amount} className="font-semibold" />
                            <EntryStatus row={row} />
                        </span>
                    </li>
                ))}
            </ul>
            <table className="hidden w-full border-collapse text-sm sm:table">
                <caption className="sr-only">Gastos de octubre de 2026, datos de ejemplo</caption>
                <thead>
                    <tr className="text-left text-[12.5px] text-ft-ink-2">
                        <th scope="col" className="py-3 pr-2 pl-[22px] font-medium">Concepto</th>
                        <th scope="col" className="px-2 py-3 font-medium">Categoría</th>
                        <th scope="col" className="px-2 py-3 font-medium">Día</th>
                        <th scope="col" className="px-2 py-3 text-right font-medium">Valor</th>
                        <th scope="col" className="py-3 pr-[22px] pl-2 font-medium">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {month.rows.map((row) => (
                        <tr key={row.concept} className="border-t border-ft-line-soft">
                            <th scope="row" className="py-3 pr-2 pl-[22px] text-left font-semibold">
                                {row.concept}
                                <span className="block text-[12.5px] font-normal text-ft-ink-3">{row.accountName}</span>
                            </th>
                            <td className="px-2 py-3">
                                <CategoryPill category={row.category} />
                            </td>
                            <td className="px-2 py-3 text-ft-ink-2 tabular-nums">{row.dueDay ?? '—'}</td>
                            <td className="px-2 py-3 text-right font-semibold">
                                <Money value={row.amount} />
                            </td>
                            <td className="py-3 pr-[22px] pl-2">
                                <EntryStatus row={row} />
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-[#e4e7ec] bg-ft-hover">
                        <th scope="row" colSpan={3} className="py-3.5 pr-2 pl-[22px] text-left font-semibold">
                            Total de gastos y asignaciones
                        </th>
                        <td className="px-2 py-3.5 text-right font-bold">
                            <Money value={month.totalExpenses} />
                        </td>
                        <td className="py-3.5 pr-[22px] pl-2 text-[12.5px] text-ft-ink-3">Ejemplo estático: no se guarda</td>
                    </tr>
                </tfoot>
            </table>
            <p className="flex justify-between gap-3 border-t border-[#e4e7ec] bg-ft-hover px-4 py-3.5 text-sm sm:hidden">
                <span className="font-semibold">Total de gastos y asignaciones</span>
                <Money value={month.totalExpenses} className="font-bold" />
            </p>
            <figcaption className="border-t border-ft-line-soft px-4 pt-3.5 pb-4 text-sm leading-normal text-ft-ink-2 sm:px-[22px]">
                <span className="sm:hidden">Ejemplo estático: no se guarda. </span>
                El disponible se calcula con los datos de tu hoja. FinTrack OS no consulta el saldo de tus bancos.
            </figcaption>
        </figure>
    )
}

export function PocketDemo() {
    const usedPercent = Math.round(pocket.share * 100)

    return (
        <figure className="finance-theme flex flex-col gap-4 bg-transparent text-ft-ink">
            <div className={cn(landingSheet, 'p-5 sm:p-[26px]')}>
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xl font-semibold">{pocket.concept}</p>
                    <SampleTag />
                </div>
                <dl className="mt-[18px] grid grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <dt className="text-[13px] font-medium text-ft-ink-3">Presupuesto</dt>
                        <dd className="mt-1 text-lg font-semibold sm:text-[22px]">
                            <Money value={pocket.budget} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[13px] font-medium text-ft-ink-3">Gastado</dt>
                        <dd className="mt-1 text-lg font-semibold sm:text-[22px]">
                            <Money value={pocket.spent} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[13px] font-medium text-ft-ink-3">Restante</dt>
                        <dd className="mt-1 text-lg font-semibold text-ft-pos sm:text-[22px]">
                            <Money value={pocket.remaining} />
                        </dd>
                    </div>
                </dl>
                <div className="mt-[18px]">
                    <MeterBar label={`Usado el ${usedPercent} % del presupuesto`} share={pocket.share} tone="pocket" height="h-2.5" />
                </div>
                <p className="mt-2 text-[13px] text-ft-ink-2">{usedPercent} % usado</p>
                <ul className="mt-5 border-t border-ft-line-soft text-[15px]" aria-label="Consumos del bolsillo">
                    {pocket.spends.map((spend) => (
                        <li key={spend.label} className="flex justify-between gap-3 border-b border-ft-line-soft py-3 last:border-b-0">
                            <span>{spend.label}</span>
                            <Money value={spend.amount} className="font-semibold" />
                        </li>
                    ))}
                </ul>
            </div>
            <ul className="flex flex-wrap gap-2 text-[13px] font-medium" aria-label="Totales por cuenta, datos de ejemplo">
                {month.byAccount.map((account) => (
                    <li key={account.name} className="rounded-full border border-[#e4e7ec] bg-ft-card px-3 py-1.5">
                        {account.name} · <Money value={account.total} />
                    </li>
                ))}
            </ul>
            <figcaption className="text-sm leading-normal text-ft-ink-2">
                El presupuesto del bolsillo ya forma parte del total de gastos del mes. Sus consumos muestran cómo lo
                utilizas.
            </figcaption>
        </figure>
    )
}

export function DebtPlanDemo() {
    const rate = `${formatPercent(debt.monthlyRate)} M.V. · ${formatPercent(debt.effectiveAnnualRate, 1)} E.A.`
    const facts = [
        ['Saldo', formatMoney(debt.balance)],
        ['Tasa', rate],
        ['Cuota mínima', formatMoney(debt.minimumPayment)],
        ['Pago recomendado', formatMoney(debt.recommended)],
    ] as const

    return (
        <div className="finance-theme flex flex-col gap-4 bg-transparent text-ft-ink">
            <figure className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                <div className={cn(landingSheet, 'flex flex-col gap-2.5 p-[22px] shadow-none')}>
                    <p className="text-[13px] font-medium text-ft-ink-3">Colchón mínimo</p>
                    <p className="text-[26px] font-semibold">
                        <Money value={month.cushion} />
                    </p>
                    <p className="text-sm text-ft-ink-2">
                        Disponible <Money value={month.available} className="font-semibold text-ft-ink" />
                    </p>
                    <MeterBar label="El disponible supera el colchón" share={month.available / month.cushion} tone="positive" height="h-2" />
                    {month.meetsCushion ? (
                        <p className="inline-flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ft-pos">
                            <Check className="size-3.5 stroke-[2.2]" aria-hidden="true" />
                            Meta cumplida · excedente <Money value={month.surplus} />
                        </p>
                    ) : null}
                </div>
                <div className={cn(landingSheet, 'flex flex-col gap-3 p-[22px] shadow-none')}>
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-base font-semibold">1 · {debt.name}</p>
                        <SampleTag />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
                        {facts.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-ft-ink-3">{label}</dt>
                                <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <figcaption className="text-[13px] leading-normal text-ft-ink-2">
                        Base {formatMoney(debt.base)} + extra {formatMoney(debt.extra)} · Estrategia recomendada:{' '}
                        {STRATEGY_LABEL[debt.strategy]}, porque el mes cumple el colchón · Con ese pago y la misma tasa, el
                        cálculo estima {debt.monthsRemaining} meses para cubrir el saldo.
                    </figcaption>
                </div>
            </figure>
            <p className="text-[13px] leading-normal text-ft-ink-3">
                Supuestos del ejemplo: una sola deuda, sin seguro ni aporte compartido; la recomendación deja el disponible
                en {formatMoney(debt.availableAfterRecommended)}. Calculado con el plan de deudas de la app.
            </p>
            <p className="rounded-[14px] border border-[#e4e7ec] bg-ft-card px-4 py-3.5 text-[15px] leading-relaxed text-ft-ink-2">
                Las recomendaciones dependen de lo que registres. Si el disponible no alcanza para cubrir las condiciones
                del plan y tu colchón, la app lo indica. Tú decides y realizas los pagos por tus canales habituales.
            </p>
        </div>
    )
}

// Barras de ingreso (azul) y gastos (rosa) por mes, en el lienzo 360 × 240 de A. Sus cifras están en
// la tabla de la misma hoja; la gráfica es una imagen con descripción.
function SummaryChart() {
    const top = Math.max(...year.rows.map((row) => row.netIncome))
    const baseline = 216
    const scale = 200 / top
    const first = longMonthLabel(year.rows[0].yearMonth).toLowerCase()
    const last = longMonthLabel(year.rows[year.rows.length - 1].yearMonth).toLowerCase()

    return (
        <svg viewBox="0 0 360 240" role="img" aria-label={`Ingresos y gastos de ${first} a ${last}, datos de ejemplo`} className="mx-auto h-auto w-full max-w-[420px] lg:max-w-none">
            <line x1="20" y1={baseline} x2="350" y2={baseline} stroke="var(--ft-line)" />
            {year.rows.map((row, index) => {
                const x = 40 + index * 110
                const income = row.netIncome * scale
                const expenses = row.totalExpenses * scale

                return (
                    <g key={row.yearMonth}>
                        <rect x={x} y={baseline - income} width="34" height={income} rx="4" fill="var(--chart-income)" />
                        <rect x={x + 40} y={baseline - expenses} width="34" height={expenses} rx="4" fill="var(--chart-expense)" />
                        <text x={x + 37} y="234" textAnchor="middle" fontSize="12" fill="var(--ft-ink-2)">
                            {shortMonthLabel(row.yearMonth)}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

export function AnnualSummaryDemo() {
    const totals = [
        ['Ingresos', formatMoney(year.netIncome)],
        ['Gastos y asignaciones', formatMoney(year.totalExpenses)],
        ['Ahorro apartado', formatMoney(year.savings)],
        ['Meses sobre el colchón', `${year.monthsMeetingCushion} de ${year.monthCount}`],
    ] as const

    return (
        <figure className={cn(sheetClassName, 'grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-10')}>
            <div className="flex flex-col gap-3.5">
                <SummaryChart />
                <p className="flex flex-wrap gap-x-[18px] gap-y-1 text-[13px] text-ft-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-chart-income" />
                        Ingreso neto
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-chart-expense" />
                        Gastos y asignaciones
                    </span>
                </p>
            </div>
            <div className="flex flex-col gap-[18px]">
                <p className="text-[12.5px] font-semibold text-ft-ink-2">Datos de ejemplo · tres meses registrados</p>

                {/* Teléfonos: un bloque por mes. Desde 640px, tabla. Solo uno de los dos se muestra. */}
                <ul className="flex flex-col sm:hidden" aria-label="Meses registrados de ejemplo">
                    {year.rows.map((row) => (
                        <li key={row.yearMonth} className="border-t border-ft-line-soft py-3 first:border-t-0 first:pt-0">
                            <p className="text-sm font-semibold">{longMonthLabel(row.yearMonth)}</p>
                            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-ft-ink-2">
                                <div className="flex gap-1"><dt>Ingreso</dt><dd className="tabular-nums text-ft-ink">{formatMoney(row.netIncome)}</dd></div>
                                <div className="flex justify-end gap-1"><dt>Gastos</dt><dd className="tabular-nums text-ft-ink">{formatMoney(row.totalExpenses)}</dd></div>
                                <div className="flex gap-1"><dt>Disponible</dt><dd className="tabular-nums text-ft-ink">{formatMoney(row.available)}</dd></div>
                                <div className="flex justify-end gap-1"><dt>Ahorro</dt><dd className="tabular-nums text-ft-ink">{formatMoney(row.savings)}</dd></div>
                            </dl>
                        </li>
                    ))}
                </ul>
                <table className="hidden w-full border-collapse text-sm tabular-nums sm:table">
                    <caption className="sr-only">Resumen de tres meses registrados, datos de ejemplo</caption>
                    <thead>
                        <tr className="text-[12.5px] text-ft-ink-2">
                            <th scope="col" className="py-2 text-left font-medium">Mes</th>
                            <th scope="col" className="p-2 text-right font-medium">Ingreso neto</th>
                            <th scope="col" className="p-2 text-right font-medium">Gastos</th>
                            <th scope="col" className="p-2 text-right font-medium">Disponible</th>
                            <th scope="col" className="py-2 pl-2 text-right font-medium">Ahorro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {year.rows.map((row) => (
                            <tr key={row.yearMonth} className="border-t border-ft-line-soft">
                                <th scope="row" className="py-2.5 text-left font-semibold">{longMonthLabel(row.yearMonth)}</th>
                                <td className="px-2 py-2.5 text-right">{formatMoney(row.netIncome)}</td>
                                <td className="px-2 py-2.5 text-right">{formatMoney(row.totalExpenses)}</td>
                                <td className="px-2 py-2.5 text-right">{formatMoney(row.available)}</td>
                                <td className="py-2.5 pl-2 text-right">{formatMoney(row.savings)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <dl className="grid grid-cols-2 gap-3 border-t border-[#e4e7ec] pt-4 sm:grid-cols-4">
                    {totals.map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-[12.5px] text-ft-ink-3">{label}</dt>
                            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            <figcaption className="border-t border-ft-line-soft pt-3.5 text-sm text-ft-ink-2 lg:col-span-2">
                Datos de ejemplo. El resumen reúne tus hojas registradas; los meses sin hoja no aportan movimientos.
            </figcaption>
        </figure>
    )
}
