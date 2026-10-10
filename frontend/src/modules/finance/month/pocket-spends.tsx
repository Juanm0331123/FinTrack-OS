'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { defaultSpendDate, monthDateRange, monthTiming, pocketProgress } from '../domain/pockets'
import type { MonthEntry, PocketSpend } from '../domain/types'
import { longDayLabel, shortDayLabel } from '../domain/year-month'
import { useToday } from '../hooks/use-today'
import { formatMoney } from '../lib/format'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { Field, inputClassName, MoneyInput } from '../ui/fields'
import { PocketBar, PocketHeadline, PocketStatusPill, pocketDetail } from './pocket-parts'

type SpendDraft = {
    amount: number | null
    note: string
    spentOn: string
}

type SpendValues = Omit<PocketSpend, 'id'>

export function spendAmountInputId(entryId: string) {
    return `spend-new-${entryId}-amount`
}

function SpendForm({
    idPrefix,
    initial,
    onCancel,
    onDelete,
    onSubmit,
    range,
    resetOnSubmit = false,
    submitLabel,
}: {
    idPrefix: string
    initial: SpendDraft
    onCancel?: () => void
    onDelete?: () => void
    onSubmit: (values: SpendValues) => void
    range: { max: string; min: string }
    resetOnSubmit?: boolean
    submitLabel: string
}) {
    const [draft, setDraft] = useState<SpendDraft>(initial)
    const amountId = `${idPrefix}-amount`
    const canSave =
        draft.amount !== null && draft.amount > 0 && draft.spentOn >= range.min && draft.spentOn <= range.max

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!event.currentTarget.reportValidity() || !canSave || draft.amount === null) {
            return
        }

        onSubmit({ amount: draft.amount, note: draft.note.trim() || null, spentOn: draft.spentOn })

        if (resetOnSubmit) {
            setDraft((current) => ({ amount: null, note: '', spentOn: current.spentOn }))
            document.getElementById(amountId)?.focus()
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,156px)]">
                <Field label="Valor" htmlFor={amountId}>
                    <MoneyInput
                        id={amountId}
                        value={draft.amount}
                        onValueChange={(amount) => setDraft((current) => ({ ...current, amount }))}
                    />
                </Field>
                <Field label="Fecha" htmlFor={`${idPrefix}-date`}>
                    <input
                        id={`${idPrefix}-date`}
                        type="date"
                        required
                        className={inputClassName}
                        min={range.min}
                        max={range.max}
                        value={draft.spentOn}
                        onChange={(event) => setDraft((current) => ({ ...current, spentOn: event.target.value }))}
                    />
                </Field>
            </div>
            <Field label="Nota" htmlFor={`${idPrefix}-note`}>
                <input
                    id={`${idPrefix}-note`}
                    className={inputClassName}
                    value={draft.note}
                    maxLength={120}
                    placeholder="Opcional: dónde o en qué"
                    autoComplete="off"
                    onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2">
                {onDelete ? (
                    <FtButton type="button" variant="danger" className="mr-auto" onClick={onDelete}>
                        <Trash2 aria-hidden="true" />
                        Eliminar
                    </FtButton>
                ) : null}
                {onCancel ? (
                    <FtButton type="button" variant="secondary" onClick={onCancel}>
                        Cancelar
                    </FtButton>
                ) : null}
                <FtButton type="submit" variant="primary" disabled={!canSave} className={onCancel ? undefined : 'max-sm:w-full'}>
                    {submitLabel}
                </FtButton>
            </div>
        </form>
    )
}

function changedValues(spend: PocketSpend, values: SpendValues) {
    return {
        ...(values.amount !== spend.amount ? { amount: values.amount } : {}),
        ...(values.note !== spend.note ? { note: values.note } : {}),
        ...(values.spentOn !== spend.spentOn ? { spentOn: values.spentOn } : {}),
    }
}

export function PocketSpends({ entry, yearMonth }: { entry: MonthEntry; yearMonth: string }) {
    const actions = useWorkbookActions()
    const today = useToday()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [announcement, setAnnouncement] = useState('')
    const pocket = useMemo(() => pocketProgress(entry), [entry])
    const timing = useMemo(() => monthTiming(yearMonth, today), [today, yearMonth])
    const range = useMemo(() => monthDateRange(yearMonth), [yearMonth])
    const newestFirst = useMemo(() => [...entry.spends].reverse(), [entry.spends])

    return (
        <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-ft-line bg-ft-hover p-3.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ft-ink-2">Presupuesto del mes</span>
                    <PocketStatusPill pocket={pocket} timing={timing} />
                </div>
                <PocketHeadline pocket={pocket} size="lg" timing={timing} />
                <PocketBar className="mt-2.5" pocket={pocket} timing={timing} />
                <p className="mt-2 text-[12.5px] text-ft-ink-3 tabular">{pocketDetail(pocket, timing)}</p>
            </div>

            <section aria-labelledby={`spend-new-${entry.id}-title`}>
                <h3 id={`spend-new-${entry.id}-title`} className="mb-3 text-sm font-semibold text-ft-ink">
                    Registrar gasto
                </h3>
                <SpendForm
                    key={today ? 'ready' : 'loading'}
                    idPrefix={`spend-new-${entry.id}`}
                    initial={{ amount: null, note: '', spentOn: defaultSpendDate(yearMonth, today) }}
                    range={range}
                    resetOnSubmit
                    submitLabel="Registrar"
                    onSubmit={(values) => {
                        actions.addSpend(yearMonth, entry.id, values)
                        setAnnouncement(`Gasto de ${formatMoney(values.amount)} registrado en ${entry.concept}.`)
                    }}
                />
                <p aria-live="polite" className="sr-only">
                    {announcement}
                </p>
            </section>

            <section aria-labelledby={`spend-list-${entry.id}-title`}>
                <h3 id={`spend-list-${entry.id}-title`} className="mb-1 text-sm font-semibold text-ft-ink">
                    Gastos registrados{' '}
                    <span className="font-normal text-ft-ink-3 tabular">({entry.spends.length})</span>
                </h3>
                {newestFirst.length === 0 ? (
                    <p className="py-2 text-sm text-ft-ink-3">Todavía no registras gastos en este bolsillo.</p>
                ) : (
                    <ul>
                        {newestFirst.map((spend) =>
                            spend.id === editingId ? (
                                <li key={spend.id} className="border-b border-ft-line-soft py-3 last:border-b-0">
                                    <SpendForm
                                        idPrefix={`spend-${spend.id}`}
                                        initial={{ amount: spend.amount, note: spend.note ?? '', spentOn: spend.spentOn }}
                                        range={range}
                                        submitLabel="Guardar"
                                        onCancel={() => setEditingId(null)}
                                        onDelete={() => {
                                            actions.deleteSpend(yearMonth, entry.id, spend.id)
                                            setEditingId(null)
                                            setAnnouncement(`Gasto de ${formatMoney(spend.amount)} eliminado.`)
                                        }}
                                        onSubmit={(values) => {
                                            const patch = changedValues(spend, values)

                                            if (Object.keys(patch).length > 0) {
                                                actions.updateSpend(yearMonth, entry.id, spend.id, patch)
                                            }

                                            setEditingId(null)
                                        }}
                                    />
                                </li>
                            ) : (
                                <li key={spend.id} className="border-b border-ft-line-soft last:border-b-0">
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(spend.id)}
                                        aria-label={`Editar gasto de ${formatMoney(spend.amount)} del ${longDayLabel(spend.spentOn).toLowerCase()}${spend.note ? `: ${spend.note}` : ''}`}
                                        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors duration-150 outline-none hover:bg-ft-hover focus-visible:outline-2 focus-visible:outline-ft-focus"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-ft-ink">
                                                {shortDayLabel(spend.spentOn)}
                                            </span>
                                            {spend.note ? (
                                                <span className="block truncate text-[12.5px] text-ft-ink-3">{spend.note}</span>
                                            ) : null}
                                        </span>
                                        <span className="flex flex-none items-center gap-2.5">
                                            <span className="text-sm font-semibold text-ft-ink tabular">
                                                {formatMoney(spend.amount)}
                                            </span>
                                            <Pencil className="size-3.5 text-ft-ink-4" aria-hidden="true" />
                                        </span>
                                    </button>
                                </li>
                            ),
                        )}
                    </ul>
                )}
            </section>
        </div>
    )
}
