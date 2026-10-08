'use client'

import { useState } from 'react'

import type { IncomeBreakdown } from '../domain/month-sheet'
import type { LeftoverDestination, MonthSheet } from '../domain/types'
import { formatAmount, formatMoney, formatPercent } from '../lib/format'
import { useWorkbookActions } from '../store/workbook-context'
import { Field, MoneyInput, Segmented } from '../ui/fields'
import { Panel, PanelHeader } from '../ui/panel'

const DESTINATION_OPTIONS: ReadonlyArray<{ label: string; value: LeftoverDestination }> = [
    { label: 'Al disponible', value: 'AVAILABLE' },
    { label: 'Al ahorro', value: 'SAVINGS' },
]

const FIELD_ROWS = 'row-span-3 grid grid-cols-1 grid-rows-subgrid content-start pb-3'

export type PocketLeftover = {
    amount: number
    monthName: string
}

export function IncomeCard({
    benefitsRate,
    income,
    pocketLeftover,
    sheet,
}: {
    benefitsRate: number
    income: IncomeBreakdown
    pocketLeftover: PocketLeftover | null
    sheet: MonthSheet
}) {
    const actions = useWorkbookActions()
    const [adjustingBenefits, setAdjustingBenefits] = useState(false)
    const yearMonth = sheet.yearMonth
    const update = (patch: Parameters<typeof actions.updateSheet>[1]) => actions.updateSheet(yearMonth, patch)
    const benefitsEditable = adjustingBenefits || income.benefitsIsManual
    const rateLabel = formatPercent(
        benefitsRate,
        Number.isInteger(Math.round(benefitsRate * 10_000) / 100) ? 0 : 2,
    )

    return (
        <Panel aria-labelledby="income-title">
            <PanelHeader id="income-title" title="Ingresos" aside={`Prestaciones ${rateLabel}`} />
            <div className="grid grid-cols-1 gap-x-3 px-4 pb-1 sm:grid-cols-2 sm:px-[18px]">
                <Field className={FIELD_ROWS} label="Salario" htmlFor="income-salary">
                    <MoneyInput
                        id="income-salary"
                        value={sheet.salary}
                        onValueChange={(value) => update({ salary: value ?? 0 })}
                    />
                </Field>
                <Field
                    className={FIELD_ROWS}
                    label="Prestaciones"
                    htmlFor="income-benefits"
                    hint={
                        benefitsEditable ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setAdjustingBenefits(false)
                                    update({ benefitsOverride: null })
                                }}
                                className="cursor-pointer font-medium text-ft-primary hover:underline"
                            >
                                Volver al {rateLabel} del salario
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAdjustingBenefits(true)}
                                className="cursor-pointer font-medium text-ft-primary hover:underline"
                            >
                                Ajustar a mano
                            </button>
                        )
                    }
                >
                    {benefitsEditable ? (
                        <MoneyInput
                            id="income-benefits"
                            prefix="−$"
                            value={sheet.benefitsOverride ?? income.benefits}
                            onValueChange={(value) => update({ benefitsOverride: value ?? 0 })}
                        />
                    ) : (
                        <output
                            id="income-benefits"
                            className="flex h-10 items-center gap-1.5 rounded-lg border border-ft-line bg-ft-hover px-3 text-sm font-medium text-ft-ink-2 tabular"
                        >
                            <span className="text-[13px] text-ft-ink-3">−$</span>
                            {formatAmount(income.benefits)}
                        </output>
                    )}
                </Field>
                <Field className={FIELD_ROWS} label="Aux. transporte" htmlFor="income-transport">
                    <MoneyInput
                        id="income-transport"
                        value={sheet.transportAllowance}
                        onValueChange={(value) => update({ transportAllowance: value ?? 0 })}
                    />
                </Field>
                <Field className={FIELD_ROWS} label="Otros descuentos" htmlFor="income-deductions">
                    <MoneyInput
                        id="income-deductions"
                        prefix="−$"
                        value={sheet.otherDeductions}
                        onValueChange={(value) => update({ otherDeductions: value ?? 0 })}
                    />
                </Field>
                <Field
                    className={FIELD_ROWS}
                    label="Salario con incapacidad"
                    htmlFor="income-disability"
                    hint={income.usesDisabilityIncome ? 'Reemplaza el neto de este mes.' : undefined}
                >
                    <MoneyInput
                        id="income-disability"
                        placeholder="Opcional"
                        value={sheet.disabilityIncome}
                        onValueChange={(value) => update({ disabilityIncome: value })}
                    />
                </Field>
                <Field
                    className={FIELD_ROWS}
                    label="Sobrante mes anterior"
                    htmlFor="income-leftover"
                    hint={
                        pocketLeftover && pocketLeftover.amount !== sheet.previousLeftover ? (
                            <>
                                En {pocketLeftover.monthName} te sobraron {formatMoney(pocketLeftover.amount)} de
                                bolsillos.{' '}
                                <button
                                    type="button"
                                    onClick={() => update({ previousLeftover: pocketLeftover.amount })}
                                    className="cursor-pointer font-medium text-ft-primary hover:underline"
                                >
                                    Usar ese valor
                                </button>
                            </>
                        ) : undefined
                    }
                >
                    <MoneyInput
                        id="income-leftover"
                        placeholder="Opcional"
                        value={sheet.previousLeftover === 0 ? null : sheet.previousLeftover}
                        onValueChange={(value) => update({ previousLeftover: value ?? 0 })}
                    />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 sm:col-span-2">
                    <span className="text-[13px] font-medium text-ft-ink-2">El sobrante va</span>
                    <Segmented
                        label="Destino del sobrante"
                        options={DESTINATION_OPTIONS}
                        value={sheet.leftoverDestination}
                        onChange={(value) => update({ leftoverDestination: value })}
                    />
                </div>
            </div>
            <div className="mx-4 flex items-baseline justify-between gap-3 border-t border-ft-line-soft py-3.5 sm:mx-[18px]">
                <span className="text-sm text-ft-ink-2">Ingreso neto</span>
                <span className="text-xl font-semibold text-ft-ink tabular">{formatMoney(income.netIncome)}</span>
            </div>
        </Panel>
    )
}
