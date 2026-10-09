'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../domain/categories'
import type { Debt, EntryCategory, MoneyAccount, MonthEntry } from '../domain/types'
import { useWorkbookActions, useWorkbookState } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { CATEGORY_STYLES } from '../ui/category-pill'
import { ConfirmDialog, Drawer } from '../ui/drawer'
import { Field, inputClassName, MoneyInput, SELECT_CHEVRON_STYLE, selectClassName, Switch } from '../ui/fields'
import { PocketSpends, spendAmountInputId } from './pocket-spends'

export type EntryEditorTarget = { entryId: string; focus?: 'spend'; mode: 'edit' } | { mode: 'new' }

type EntryDraft = Pick<MonthEntry, 'accountId' | 'amount' | 'category' | 'concept' | 'debtId' | 'dueDay' | 'isPaid' | 'note'>

const EMPTY_DRAFT: EntryDraft = {
    accountId: null,
    amount: null,
    category: 'FIXED',
    concept: '',
    debtId: null,
    dueDay: null,
    isPaid: false,
    note: null,
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1)

function EntryFields({
    accounts,
    categoryLocked = false,
    debts,
    idPrefix,
    onChange,
    value,
}: {
    accounts: readonly MoneyAccount[]
    categoryLocked?: boolean
    debts: readonly Debt[]
    idPrefix: string
    onChange: (patch: Partial<EntryDraft>) => void
    value: EntryDraft
}) {
    const [concept, setConcept] = useState(value.concept)
    const visibleAccounts = accounts.filter((account) => !account.archived || account.id === value.accountId)
    const activeDebts = debts.filter((debt) => debt.status === 'ACTIVE' || debt.id === value.debtId)
    const isPocket = value.category === 'POCKET'

    return (
        <div className="flex flex-col gap-4">
            <Field
                label="Concepto"
                htmlFor={`${idPrefix}-concept`}
                hint={concept.trim() ? undefined : 'Por ejemplo: arriendo, mercado o Netflix.'}
            >
                <input
                    id={`${idPrefix}-concept`}
                    className={inputClassName}
                    value={concept}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(event) => {
                        setConcept(event.target.value)
                        onChange({ concept: event.target.value })
                    }}
                />
            </Field>
            <Field
                label={isPocket ? 'Presupuesto del mes' : 'Valor'}
                htmlFor={`${idPrefix}-amount`}
                hint={
                    isPocket
                        ? 'Lo que separas para todo el mes. Lo que vas gastando se registra aparte.'
                        : 'Déjalo vacío si aún no sabes el valor.'
                }
            >
                <MoneyInput
                    id={`${idPrefix}-amount`}
                    placeholder="Sin valor"
                    value={value.amount}
                    onValueChange={(amount) => onChange({ amount })}
                />
            </Field>
            <fieldset disabled={categoryLocked} aria-describedby={categoryLocked ? `${idPrefix}-category-lock` : undefined}>
                <legend className="mb-1.5 text-[13px] font-medium text-ft-ink-2">Categoría</legend>
                {categoryLocked ? (
                    <p id={`${idPrefix}-category-lock`} className="mb-2 text-[13px] text-ft-ink-2">
                        Este bolsillo tiene gastos registrados. Elimínalos para cambiar la categoría; así no se pierden de los totales.
                    </p>
                ) : null}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {CATEGORY_ORDER.map((category) => (
                        <label
                            key={category}
                            className={cn(
                                'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ft-focus',
                                value.category === category
                                    ? cn('border-transparent', CATEGORY_STYLES[category].pill)
                                    : 'border-ft-line text-ft-ink-2 hover:bg-ft-hover',
                                categoryLocked && value.category !== category && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                            )}
                        >
                            <input
                                type="radio"
                                name={`${idPrefix}-category`}
                                value={category}
                                checked={value.category === category}
                                onChange={() =>
                                    onChange({
                                        category: category as EntryCategory,
                                        ...(category === 'DEBT' ? {} : { debtId: null }),
                                    })
                                }
                                className="sr-only"
                            />
                            <span aria-hidden="true" className={cn('size-2 rounded-full', CATEGORY_STYLES[category].dot)} />
                            {CATEGORY_LABELS[category]}
                        </label>
                    ))}
                </div>
            </fieldset>
            {value.category === 'DEBT' ? (
                <Field
                    label="Deuda vinculada"
                    htmlFor={`${idPrefix}-debt`}
                    hint="El plan de deudas usa este pago como “mi pago actual”."
                >
                    <select
                        id={`${idPrefix}-debt`}
                        className={selectClassName}
                        style={SELECT_CHEVRON_STYLE}
                        value={value.debtId ?? ''}
                        onChange={(event) => onChange({ debtId: event.target.value || null })}
                    >
                        <option value="">Sin vincular</option>
                        {activeDebts.map((debt) => (
                            <option key={debt.id} value={debt.id}>
                                {debt.name}
                            </option>
                        ))}
                    </select>
                </Field>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Cuenta" htmlFor={`${idPrefix}-account`}>
                    <select
                        id={`${idPrefix}-account`}
                        className={selectClassName}
                        style={SELECT_CHEVRON_STYLE}
                        value={value.accountId ?? ''}
                        onChange={(event) => onChange({ accountId: event.target.value || null })}
                    >
                        <option value="">Sin cuenta asignada</option>
                        {visibleAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={isPocket ? 'Día en que lo separas' : 'Día de pago'} htmlFor={`${idPrefix}-day`}>
                    <select
                        id={`${idPrefix}-day`}
                        className={selectClassName}
                        style={SELECT_CHEVRON_STYLE}
                        value={value.dueDay ?? ''}
                        onChange={(event) => onChange({ dueDay: event.target.value ? Number(event.target.value) : null })}
                    >
                        <option value="">Sin día fijo</option>
                        {DAY_OPTIONS.map((day) => (
                            <option key={day} value={day}>
                                Día {day}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <Field label="Nota" htmlFor={`${idPrefix}-note`}>
                <input
                    id={`${idPrefix}-note`}
                    className={inputClassName}
                    value={value.note ?? ''}
                    maxLength={200}
                    placeholder="Referencia, fecha de corte, recordatorio…"
                    autoComplete="off"
                    onChange={(event) => onChange({ note: event.target.value || null })}
                />
            </Field>
            {isPocket ? null : (
                <Switch checked={value.isPaid} onCheckedChange={(isPaid) => onChange({ isPaid })} label="Ya está pagado" />
            )}
        </div>
    )
}

function EditEntryContent({
    accounts,
    debts,
    entry,
    onClose,
    yearMonth,
}: {
    accounts: readonly MoneyAccount[]
    debts: readonly Debt[]
    entry: MonthEntry
    onClose: () => void
    yearMonth: string
}) {
    const actions = useWorkbookActions()
    const [confirming, setConfirming] = useState(false)
    const applyChange = (patch: Partial<EntryDraft>) => {
        if (patch.concept === undefined) {
            actions.updateEntry(yearMonth, entry.id, patch)

            return
        }

        const concept = patch.concept.trim()

        if (concept) {
            actions.updateEntry(yearMonth, entry.id, { ...patch, concept })
        }
    }

    return (
        <>
            {entry.category === 'POCKET' ? (
                <>
                    <PocketSpends entry={entry} yearMonth={yearMonth} />
                    <h3 className="mt-6 mb-4 border-t border-ft-line pt-5 text-sm font-semibold text-ft-ink">
                        Datos del bolsillo
                    </h3>
                </>
            ) : null}
            <EntryFields
                key={entry.id}
                accounts={accounts}
                categoryLocked={entry.category === 'POCKET' && entry.spends.length > 0}
                debts={debts}
                idPrefix={`entry-${entry.id}`}
                value={entry}
                onChange={applyChange}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ft-line pt-4">
                <FtButton variant="danger" onClick={() => setConfirming(true)}>
                    <Trash2 aria-hidden="true" />
                    Eliminar fila
                </FtButton>
                <FtButton variant="primary" onClick={onClose}>
                    Listo
                </FtButton>
            </div>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                tone="danger"
                title={`¿Eliminar “${entry.concept}”?`}
                description="La fila sale de este mes y de sus totales. Los demás meses no cambian."
                confirmLabel="Eliminar"
                onConfirm={() => {
                    actions.deleteEntry(yearMonth, entry.id)
                    onClose()
                }}
            />
        </>
    )
}

function NewEntryContent({
    accounts,
    debts,
    onClose,
    yearMonth,
}: {
    accounts: readonly MoneyAccount[]
    debts: readonly Debt[]
    onClose: () => void
    yearMonth: string
}) {
    const actions = useWorkbookActions()
    const [draft, setDraft] = useState<EntryDraft>(() => ({
        ...EMPTY_DRAFT,
        accountId: accounts.find((account) => !account.archived)?.id ?? null,
    }))
    const canSave = draft.concept.trim().length > 0

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()

                if (!canSave) {
                    return
                }

                actions.addEntry(yearMonth, draft)
                onClose()
            }}
        >
            <EntryFields
                accounts={accounts}
                debts={debts}
                idPrefix="new-entry"
                value={draft}
                onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            />
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-ft-line pt-4">
                <FtButton type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </FtButton>
                <FtButton type="submit" variant="primary" disabled={!canSave}>
                    {draft.category === 'POCKET' ? 'Agregar bolsillo' : 'Agregar gasto'}
                </FtButton>
            </div>
        </form>
    )
}

export function EntryDrawer({
    onOpenChange,
    open,
    session,
    target,
    yearMonth,
}: {
    onOpenChange: (open: boolean) => void
    open: boolean
    session: number
    target: EntryEditorTarget | null
    yearMonth: string
}) {
    const accounts = useWorkbookState((state) => state.workbook?.accounts ?? null)
    const debts = useWorkbookState((state) => state.workbook?.debts ?? null)
    const entry = useWorkbookState((state) =>
        target?.mode === 'edit'
            ? (state.workbook?.sheets
                  .find((sheet) => sheet.yearMonth === yearMonth)
                  ?.entries.find((item) => item.id === target.entryId) ?? null)
            : null,
    )
    const close = () => onOpenChange(false)
    const isEdit = target?.mode === 'edit'
    const focusSpend = target?.mode === 'edit' && target.focus === 'spend' ? target.entryId : null
    const focusSpendAmount = (event: Event) => {
        const input = focusSpend ? document.getElementById(spendAmountInputId(focusSpend)) : null

        if (input) {
            event.preventDefault()
            input.focus()
        }
    }

    return (
        <Drawer
            open={open && target !== null}
            onOpenChange={onOpenChange}
            onOpenAutoFocus={focusSpend ? focusSpendAmount : undefined}
            title={isEdit ? (entry?.concept ?? 'Gasto') : 'Nuevo gasto'}
            description={
                isEdit
                    ? entry?.category === 'POCKET'
                        ? 'Registra lo que vas gastando. Los cambios se guardan solos.'
                        : 'Los cambios se guardan solos.'
                    : 'Se agrega a la hoja de este mes.'
            }
        >
            {accounts && debts ? (
                isEdit ? (
                    entry ? (
                        <EditEntryContent accounts={accounts} debts={debts} entry={entry} yearMonth={yearMonth} onClose={close} />
                    ) : (
                        <p className="text-sm text-ft-ink-3">Esta fila ya no existe.</p>
                    )
                ) : (
                    <NewEntryContent key={session} accounts={accounts} debts={debts} yearMonth={yearMonth} onClose={close} />
                )
            ) : null}
        </Drawer>
    )
}
