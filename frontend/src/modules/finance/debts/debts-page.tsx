'use client'

import { Plus, RotateCw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { computeDebtPlan, type DebtAction, type DebtPlan, type DebtPlanRow } from '../domain/debt-plan'
import { monthLabel, monthName } from '../domain/year-month'
import { useSelectedMonth } from '../hooks/use-selected-month'
import { useDebts, useMonthSummary, useSettings, useSheet } from '../hooks/use-workbook-data'
import { formatMoney, formatPercent } from '../lib/format'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { Segmented, Switch } from '../ui/fields'
import { EmptyState, PageHeader } from '../ui/layout-parts'
import { Panel } from '../ui/panel'
import { DebtDrawer, type DebtEditorTarget } from './debt-drawer'
import { STRATEGY_HINTS, STRATEGY_NAMES, STRATEGY_OPTIONS, strategyReason } from './debt-strategy'

const ACTION_LABELS: Record<DebtAction, string> = {
    AT_CAP: 'Al tope acordado',
    BASE_ONLY: 'Solo pago base',
    EXTRA: 'Abonar extra',
    KILL_FIRST: 'Matar primero',
}

const ACTION_STYLES: Record<DebtAction, string> = {
    AT_CAP: 'bg-ft-primary-soft text-ft-primary',
    BASE_ONLY: 'bg-ft-muted text-ft-ink-2',
    EXTRA: 'bg-ft-warn-soft text-ft-warn',
    KILL_FIRST: 'bg-ft-neg-soft text-ft-neg',
}

function monthsText(row: DebtPlanRow) {
    if (row.monthsRemaining === null) {
        return 'Pago insuficiente: no cubre los intereses'
    }

    if (row.monthsRemaining === 0) {
        return 'Saldo en cero'
    }

    return `Terminas en ${row.monthsRemaining} ${row.monthsRemaining === 1 ? 'mes' : 'meses'}`
}

function StrategyCard({ hasSheet, plan, yearMonth }: { hasSheet: boolean; plan: DebtPlan; yearMonth: string }) {
    const actions = useWorkbookActions()
    const first = plan.killFirst
    let headline = 'Paga la base de cada deuda este mes'
    let explanation = `Tu disponible (${formatMoney(plan.available)}) no supera el colchón (${formatMoney(plan.cushion)}). El abono extra vuelve cuando haya excedente.`

    if (!hasSheet) {
        explanation = `Crea la hoja de ${monthName(yearMonth)} para calcular el excedente del mes.`
    } else if (first && first.extra > 0) {
        headline = `Abónale ${formatMoney(first.extra)} extra a ${first.debt.name}`
        explanation = `${strategyReason(plan, first)} Con ${formatMoney(first.recommended)} al mes${first.debt.partnerContribution > 0 ? ' más el aporte compartido' : ''}, ${first.monthsRemaining ? `la terminas en ${first.monthsRemaining} meses` : 'avanzas sobre el saldo'} sin bajar del colchón.`
    } else if (first) {
        headline = `Prioridad 1: ${first.debt.name}`
        explanation = `${strategyReason(plan, first)} ${
            plan.pool > 0
                ? 'Todas las deudas ya están en su tope o en su saldo; el excedente queda disponible.'
                : `Este mes no hay excedente sobre el colchón (${formatMoney(plan.cushion)}), así que paga la base de cada deuda.`
        }`
    }

    return (
        <Panel aria-labelledby="strategy-title" className="grid grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex flex-col items-start gap-2 border-b border-ft-line-soft px-5 py-5 lg:border-r lg:border-b-0">
                {first ? (
                    <span className="inline-flex h-[26px] items-center rounded-full bg-ft-neg-soft px-2.5 text-[12.5px] font-semibold text-ft-neg">
                        Prioridad 1 · {first.debt.name}
                    </span>
                ) : null}
                <h2 id="strategy-title" className="text-xl font-semibold tracking-[-0.015em] text-ft-ink sm:text-[22px]">
                    {headline}
                </h2>
                <p className="max-w-[60ch] text-sm leading-6 text-ft-ink-2">{explanation}</p>
                {plan.unassigned > 0 && hasSheet ? (
                    <p className="text-[13px] text-ft-ink-3">
                        Quedan {formatMoney(plan.unassigned)} sin asignar porque las deudas llegaron a su tope.
                    </p>
                ) : null}
                <div className="mt-1 flex w-full flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ft-ink-2">Estrategia de prioridad</span>
                    <Segmented
                        label="Estrategia de prioridad"
                        options={STRATEGY_OPTIONS}
                        value={plan.requestedStrategy}
                        onChange={(debtStrategy) => actions.updateSettings({ debtStrategy })}
                        className="self-start"
                    />
                    <p className="text-[12.5px] leading-5 text-ft-ink-3">{STRATEGY_HINTS[plan.requestedStrategy]}</p>
                </div>
                <Switch
                    className="mt-1"
                    checked={plan.redirectOverpayments}
                    label="Redirigir lo que pago de más en deudas baratas"
                    onCheckedChange={(redirectDebtOverpayments) => actions.updateSettings({ redirectDebtOverpayments })}
                />
            </div>
            <dl className="grid grid-cols-2 gap-px bg-ft-line-soft">
                {[
                    { label: 'Disponible del mes', value: formatMoney(plan.available) },
                    { label: 'Colchón mínimo', value: formatMoney(plan.cushion) },
                    { label: 'Bolsa extra', tone: 'pos', value: formatMoney(plan.pool) },
                    { label: 'Te queda después de pagar', value: formatMoney(plan.availableAfterRecommended) },
                ].map((item) => (
                    <div key={item.label} className="flex flex-col justify-between gap-1 bg-white px-5 py-4">
                        <dt className="text-[12.5px] text-ft-ink-3">{item.label}</dt>
                        <dd className={cn('text-xl font-semibold text-ft-ink tabular', item.tone === 'pos' && 'text-ft-pos')}>
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </Panel>
    )
}

function DebtCard({ onOpen, row }: { onOpen: (id: string) => void; row: DebtPlanRow }) {
    const minePct = row.debt.totalBalance > 0 ? (row.myBalance / row.debt.totalBalance) * 100 : 0
    const sharedPct = row.debt.totalBalance > 0 ? (row.sharedPortion / row.debt.totalBalance) * 100 : 0

    return (
        <article className="relative grid grid-cols-1 rounded-xl border border-ft-line bg-white transition-colors duration-150 hover:border-ft-control lg:grid-cols-[minmax(200px,1fr)_minmax(0,1.6fr)_minmax(200px,0.9fr)]">
            <div className="flex items-start gap-3 px-5 py-4">
                <span
                    className={cn(
                        'grid size-8 flex-none place-items-center rounded-lg text-sm font-bold',
                        row.priority === 1 ? 'bg-ft-neg-soft text-ft-neg' : 'bg-ft-muted text-ft-ink-2',
                    )}
                    aria-label={`Prioridad ${row.priority}`}
                >
                    {row.priority}
                </span>
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ft-ink">
                        <button
                            type="button"
                            onClick={() => onOpen(row.debt.id)}
                            className="cursor-pointer rounded text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:outline-2 focus-visible:outline-ft-focus"
                        >
                            {row.debt.name}
                        </button>
                    </h3>
                    {row.debt.lender ? <p className="text-[12.5px] text-ft-ink-3">{row.debt.lender}</p> : null}
                    {row.debt.datesNote ? <p className="text-[12.5px] text-ft-ink-3">{row.debt.datesNote}</p> : null}
                </div>
            </div>
            <div className="border-t border-ft-line-soft px-5 py-4 lg:border-t-0 lg:border-x">
                <div className="flex flex-wrap justify-between gap-2 text-[12.5px] text-ft-ink-3">
                    <span>
                        Saldo total <b className="font-semibold text-ft-ink tabular">{formatMoney(row.debt.totalBalance)}</b>
                    </span>
                    <span>
                        Mi parte <b className="font-semibold text-ft-ink tabular">{formatMoney(row.myBalance)}</b>
                    </span>
                </div>
                <div
                    role="img"
                    aria-label={`Mi parte es el ${Math.round(minePct)}% del saldo`}
                    className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ft-muted"
                >
                    <span className="h-full bg-ft-primary" style={{ width: `${minePct}%` }} />
                    <span className="h-full bg-ft-focus-soft" style={{ width: `${sharedPct}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                        { label: 'Costo mensual', value: formatPercent(row.monthlyCost, 2) },
                        { label: 'E.A.', value: formatPercent(row.effectiveAnnualRate, 1) },
                        { label: 'Mi cuota mínima', value: formatMoney(row.myMinimum) },
                        { label: 'Pago actual', value: formatMoney(row.currentPayment) },
                    ].map((fact) => (
                        <div key={fact.label}>
                            <dt className="text-xs text-ft-ink-3">{fact.label}</dt>
                            <dd className="font-semibold text-ft-ink tabular">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            <div className="border-t border-ft-line-soft px-5 py-4 lg:border-t-0">
                <p className="text-[12.5px] text-ft-ink-3">Pago recomendado</p>
                <p className="text-[22px] font-semibold tracking-[-0.01em] text-ft-ink tabular">{formatMoney(row.recommended)}</p>
                <p className={cn('text-[12.5px]', row.monthsRemaining === null ? 'font-medium text-ft-neg' : 'text-ft-ink-2')}>
                    {monthsText(row)}
                </p>
                {row.extra > 0 ? (
                    <p className="text-[12.5px] text-ft-ink-2">
                        Base {formatMoney(row.base)} + extra {formatMoney(row.extra)}
                    </p>
                ) : null}
                <span
                    className={cn(
                        'mt-2 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold',
                        ACTION_STYLES[row.action],
                    )}
                >
                    {ACTION_LABELS[row.action]}
                </span>
            </div>
        </article>
    )
}

export function DebtsPage() {
    const { yearMonth } = useSelectedMonth()
    const debts = useDebts()
    const settings = useSettings()
    const sheet = useSheet(yearMonth)
    const summary = useMonthSummary(yearMonth)
    const actions = useWorkbookActions()
    const [drawer, setDrawer] = useState<{ open: boolean; target: DebtEditorTarget | null }>({ open: false, target: null })

    const plan = useMemo(
        () =>
            debts && settings
                ? computeDebtPlan({
                      available: summary?.available ?? 0,
                      cashFlowTight: summary ? !summary.meetsCushion || summary.isOverspent : false,
                      cushion: settings.cushionAmount,
                      debts,
                      entries: sheet?.entries ?? [],
                      redirectOverpayments: settings.redirectDebtOverpayments,
                      strategy: settings.debtStrategy,
                  })
                : null,
        [debts, settings, sheet, summary],
    )
    const paidDebts = useMemo(() => (debts ?? []).filter((debt) => debt.status === 'PAID'), [debts])

    if (!yearMonth || !plan) {
        return null
    }

    const openDebt = (debtId: string) => setDrawer({ open: true, target: { debtId, mode: 'edit' } })

    return (
        <div className="flex flex-col gap-[18px]">
            <PageHeader
                title="Deudas"
                subtitle={`Estrategia ${STRATEGY_NAMES[plan.requestedStrategy]} · análisis de ${monthLabel(yearMonth).toLowerCase()}`}
                actions={
                    <FtButton variant="primary" onClick={() => setDrawer({ open: true, target: { mode: 'new' } })}>
                        <Plus aria-hidden="true" />
                        Agregar deuda
                    </FtButton>
                }
            />

            {plan.rows.length > 0 ? (
                <>
                    <StrategyCard hasSheet={sheet !== null} plan={plan} yearMonth={yearMonth} />
                    {sheet === null ? (
                        <p className="text-sm text-ft-ink-2">
                            <Link href={`${APP_ROUTES.dashboard}?month=${yearMonth}`} className="font-semibold text-ft-primary hover:underline">
                                Crear la hoja de {monthName(yearMonth)}
                            </Link>{' '}
                            para usar su disponible y sus pagos en el plan.
                        </p>
                    ) : null}
                    <div className="flex flex-col gap-3">
                        {plan.rows.map((row) => (
                            <DebtCard key={row.debt.id} row={row} onOpen={openDebt} />
                        ))}
                    </div>
                    <dl className="flex flex-wrap gap-x-7 gap-y-2 rounded-xl border border-ft-line bg-white px-5 py-3.5 text-[13px] text-ft-ink-2">
                        {[
                            { label: 'Saldo total', value: plan.totalBalance },
                            { label: 'Mi saldo', value: plan.myBalanceTotal },
                            { label: 'Mis cuotas mínimas', value: plan.myMinimumTotal },
                            { label: 'Pago actual', value: plan.currentTotal },
                            { label: 'Pago recomendado', value: plan.recommendedTotal },
                            { label: 'Pago total al mes', value: plan.monthlyTotal },
                        ].map((item) => (
                            <div key={item.label} className="flex gap-1.5">
                                <dt>{item.label}</dt>
                                <dd className="font-semibold text-ft-ink tabular">{formatMoney(item.value)}</dd>
                            </div>
                        ))}
                    </dl>
                </>
            ) : (
                <Panel>
                    <EmptyState
                        title={paidDebts.length > 0 ? 'No tienes deudas activas' : 'Aún no registras deudas'}
                        action={
                            <FtButton variant="primary" onClick={() => setDrawer({ open: true, target: { mode: 'new' } })}>
                                <Plus aria-hidden="true" />
                                Agregar deuda
                            </FtButton>
                        }
                    >
                        El plan ordena tus deudas según la estrategia que elijas (mayor interés, mayor cuota, menor cuota
                        o la recomendada) y le manda el excedente sobre el colchón a la primera, sin pasarse de tus topes.
                        Vincula los pagos de la hoja del mes para que lea cuánto pagas hoy.
                    </EmptyState>
                </Panel>
            )}

            {paidDebts.length > 0 ? (
                <details className="rounded-xl border border-ft-line bg-white">
                    <summary className="flex min-h-12 cursor-pointer items-center px-5 text-sm font-semibold text-ft-ink">
                        Deudas pagadas ({paidDebts.length})
                    </summary>
                    <ul className="border-t border-ft-line-soft px-5 py-2">
                        {paidDebts.map((debt) => (
                            <li key={debt.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                                <button
                                    type="button"
                                    onClick={() => openDebt(debt.id)}
                                    className="cursor-pointer text-left font-medium text-ft-ink hover:underline"
                                >
                                    {debt.name}
                                </button>
                                <FtButton size="sm" variant="ghost" onClick={() => actions.updateDebt(debt.id, { status: 'ACTIVE' })}>
                                    <RotateCw aria-hidden="true" />
                                    Reactivar
                                </FtButton>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}

            <DebtDrawer
                open={drawer.open}
                target={drawer.target}
                onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
            />
        </div>
    )
}
