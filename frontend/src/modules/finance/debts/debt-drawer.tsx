'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { myMinimumOf } from '../domain/debt-plan'
import type { Debt } from '../domain/types'
import { formatMoney, parseDecimalInput } from '../lib/format'
import { useWorkbookActions, useWorkbookState } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { ConfirmDialog, Drawer } from '../ui/drawer'
import { Field, inputClassName, MoneyInput, PercentInput, SELECT_CHEVRON_STYLE, Segmented, selectClassName, Switch } from '../ui/fields'

export type DebtEditorTarget = { debtId: string; mode: 'edit' } | { mode: 'new' }

type DebtDraft = Omit<Debt, 'id' | 'sortOrder'>

const EMPTY_DEBT: DebtDraft = {
    datesNote: null,
    dueDay: null,
    insuranceRate: 0,
    lender: null,
    minimumPayment: 0,
    monthlyRate: 0,
    myMinimumOverride: null,
    name: '',
    notes: null,
    partnerContribution: 0,
    paymentCap: null,
    sharedAmount: 0,
    sharedPercent: null,
    sharedWith: null,
    status: 'ACTIVE',
    totalBalance: 0,
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1)

function SharedPercentInput({ onValueChange, value }: { onValueChange: (value: number) => void; value: number }) {
    const [draft, setDraft] = useState(() => String(value).replace('.', ','))

    return (
        <div className="flex h-11 items-center gap-1.5 rounded-lg border border-ft-line bg-white px-3 transition-[border-color,box-shadow] sm:h-10 duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft">
            <input
                id="debt-shared-percent"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ft-ink outline-none tabular"
                value={draft}
                onChange={(event) => {
                    setDraft(event.target.value)

                    const parsed = parseDecimalInput(event.target.value)

                    if (parsed !== null && parsed <= 100) {
                        onValueChange(parsed)
                    }
                }}
            />
            <span aria-hidden="true" className="text-[13px] text-ft-ink-3">
                %
            </span>
        </div>
    )
}

function DebtFields({ onChange, value }: { onChange: (patch: Partial<DebtDraft>) => void; value: DebtDraft }) {
    const [name, setName] = useState(value.name)
    const sharedMode = value.sharedPercent !== null ? 'PERCENT' : 'AMOUNT'
    const manualMinimum = value.myMinimumOverride !== null
    const autoMinimum = myMinimumOf({ ...value, id: '', myMinimumOverride: null, sortOrder: 0 })

    return (
        <div className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="debt-name" hint={name.trim() ? undefined : 'Por ejemplo: Tarjeta, Moto, Celular.'}>
                <input
                    id="debt-name"
                    className={inputClassName}
                    value={name}
                    maxLength={80}
                    autoComplete="off"
                    onChange={(event) => {
                        setName(event.target.value)
                        onChange({ name: event.target.value })
                    }}
                />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Entidad" htmlFor="debt-lender">
                    <input
                        id="debt-lender"
                        className={inputClassName}
                        value={value.lender ?? ''}
                        maxLength={120}
                        autoComplete="off"
                        onChange={(event) => onChange({ lender: event.target.value || null })}
                    />
                </Field>
                <Field label="Día de pago" htmlFor="debt-day">
                    <select
                        id="debt-day"
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
            <Field label="Fechas de corte y pago" htmlFor="debt-dates">
                <input
                    id="debt-dates"
                    className={inputClassName}
                    value={value.datesNote ?? ''}
                    maxLength={120}
                    placeholder="Corte 20, pago día 1"
                    autoComplete="off"
                    onChange={(event) => onChange({ datesNote: event.target.value || null })}
                />
            </Field>
            <Field label="Saldo total" htmlFor="debt-balance" hint="Según el último extracto.">
                <MoneyInput
                    id="debt-balance"
                    value={value.totalBalance}
                    onValueChange={(totalBalance) => onChange({ totalBalance: totalBalance ?? 0 })}
                />
            </Field>
            <div className="rounded-lg border border-ft-line-soft bg-ft-hover p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ft-ink-2">Parte compartida</span>
                    <Segmented
                        label="Cómo se comparte"
                        value={sharedMode}
                        options={[
                            { label: 'Valor', value: 'AMOUNT' },
                            { label: 'Porcentaje', value: 'PERCENT' },
                        ]}
                        onChange={(mode) =>
                            onChange(mode === 'PERCENT' ? { sharedPercent: 50 } : { sharedPercent: null })
                        }
                    />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sharedMode === 'PERCENT' ? (
                        <Field label="Porcentaje de la otra persona" htmlFor="debt-shared-percent">
                            <SharedPercentInput
                                key="percent"
                                value={value.sharedPercent ?? 0}
                                onValueChange={(sharedPercent) => onChange({ sharedPercent })}
                            />
                        </Field>
                    ) : (
                        <Field label="Valor de la otra persona" htmlFor="debt-shared-amount">
                            <MoneyInput
                                id="debt-shared-amount"
                                value={value.sharedAmount}
                                onValueChange={(sharedAmount) => onChange({ sharedAmount: sharedAmount ?? 0 })}
                            />
                        </Field>
                    )}
                    <Field label="Con quién" htmlFor="debt-shared-with">
                        <input
                            id="debt-shared-with"
                            className={inputClassName}
                            value={value.sharedWith ?? ''}
                            maxLength={60}
                            autoComplete="off"
                            onChange={(event) => onChange({ sharedWith: event.target.value || null })}
                        />
                    </Field>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tasa M.V." htmlFor="debt-rate" hint="Interés mes vencido.">
                    <PercentInput id="debt-rate" value={value.monthlyRate} onValueChange={(monthlyRate) => onChange({ monthlyRate })} />
                </Field>
                <Field label="Seguro (% mes)" htmlFor="debt-insurance">
                    <PercentInput
                        id="debt-insurance"
                        value={value.insuranceRate}
                        onValueChange={(insuranceRate) => onChange({ insuranceRate })}
                    />
                </Field>
                <Field label="Cuota mínima total" htmlFor="debt-minimum">
                    <MoneyInput
                        id="debt-minimum"
                        value={value.minimumPayment}
                        onValueChange={(minimumPayment) => onChange({ minimumPayment: minimumPayment ?? 0 })}
                    />
                </Field>
                <Field label="Aporte compartido al mes" htmlFor="debt-partner">
                    <MoneyInput
                        id="debt-partner"
                        value={value.partnerContribution}
                        onValueChange={(partnerContribution) => onChange({ partnerContribution: partnerContribution ?? 0 })}
                    />
                </Field>
            </div>
            <div className="rounded-lg border border-ft-line-soft bg-ft-hover p-3">
                <Switch
                    checked={manualMinimum}
                    label="Definir mi cuota mínima a mano"
                    onCheckedChange={(checked) => onChange({ myMinimumOverride: checked ? autoMinimum : null })}
                />
                {manualMinimum ? (
                    <div className="mt-2">
                        <Field label="Mi cuota mínima" htmlFor="debt-my-minimum">
                            <MoneyInput
                                id="debt-my-minimum"
                                value={value.myMinimumOverride}
                                onValueChange={(myMinimumOverride) => onChange({ myMinimumOverride: myMinimumOverride ?? 0 })}
                            />
                        </Field>
                    </div>
                ) : (
                    <p className="mt-1 text-[13px] text-ft-ink-3">
                        Mi cuota mínima: <span className="font-semibold text-ft-ink tabular">{formatMoney(autoMinimum)}</span>{' '}
                        (cuota mínima menos el aporte compartido).
                    </p>
                )}
            </div>
            <Field label="Mi tope al mes" htmlFor="debt-cap" hint="Opcional. El plan nunca recomienda pagar más que esto.">
                <MoneyInput
                    id="debt-cap"
                    placeholder="Sin tope"
                    value={value.paymentCap}
                    onValueChange={(paymentCap) => onChange({ paymentCap })}
                />
            </Field>
            <Field label="Notas" htmlFor="debt-notes">
                <textarea
                    id="debt-notes"
                    rows={3}
                    maxLength={300}
                    className={`${inputClassName} h-auto py-2`}
                    value={value.notes ?? ''}
                    onChange={(event) => onChange({ notes: event.target.value || null })}
                />
            </Field>
            <Switch
                checked={value.status === 'PAID'}
                label="Ya la terminé de pagar"
                onCheckedChange={(checked) => onChange({ status: checked ? 'PAID' : 'ACTIVE' })}
            />
        </div>
    )
}

function EditDebtContent({ debt, onClose }: { debt: Debt; onClose: () => void }) {
    const actions = useWorkbookActions()
    const [confirming, setConfirming] = useState(false)
    const apply = (patch: Partial<DebtDraft>) => {
        if (patch.name !== undefined) {
            const name = patch.name.trim()

            if (!name) {
                return
            }

            actions.updateDebt(debt.id, { ...patch, name })

            return
        }

        actions.updateDebt(debt.id, patch)
    }

    return (
        <>
            <DebtFields key={debt.id} value={debt} onChange={apply} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ft-line pt-4">
                <FtButton variant="danger" onClick={() => setConfirming(true)}>
                    <Trash2 aria-hidden="true" />
                    Eliminar deuda
                </FtButton>
                <FtButton variant="primary" onClick={onClose}>
                    Listo
                </FtButton>
            </div>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                tone="danger"
                title={`¿Eliminar ${debt.name}?`}
                description="Se quita del plan. Las filas de los meses que la tenían vinculada siguen ahí, sin vínculo."
                confirmLabel="Eliminar"
                onConfirm={() => {
                    actions.deleteDebt(debt.id)
                    onClose()
                }}
            />
        </>
    )
}

function NewDebtContent({ onClose }: { onClose: () => void }) {
    const actions = useWorkbookActions()
    const [draft, setDraft] = useState<DebtDraft>(EMPTY_DEBT)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const canSave = draft.name.trim().length > 0 && !busy

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault()

                if (!canSave) {
                    return
                }

                setBusy(true)
                setError(null)

                try {
                    await actions.createDebt({ ...draft, name: draft.name.trim() })
                    onClose()
                } catch (createError) {
                    setError(createError instanceof Error ? createError.message : 'No pudimos guardar la deuda.')
                    setBusy(false)
                }
            }}
        >
            <DebtFields value={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
            {error ? (
                <p role="alert" className="mt-4 text-sm font-medium text-ft-neg">
                    {error}
                </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-ft-line pt-4">
                <FtButton type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </FtButton>
                <FtButton type="submit" variant="primary" disabled={!canSave}>
                    {busy ? 'Guardando…' : 'Guardar deuda'}
                </FtButton>
            </div>
        </form>
    )
}

export function DebtDrawer({
    onOpenChange,
    open,
    target,
}: {
    onOpenChange: (open: boolean) => void
    open: boolean
    target: DebtEditorTarget | null
}) {
    const debt = useWorkbookState((state) =>
        target?.mode === 'edit' ? (state.workbook?.debts.find((item) => item.id === target.debtId) ?? null) : null,
    )
    const isEdit = target?.mode === 'edit'
    const close = () => onOpenChange(false)

    return (
        <Drawer
            open={open && target !== null}
            onOpenChange={onOpenChange}
            title={isEdit ? (debt?.name ?? 'Deuda') : 'Nueva deuda'}
            description={isEdit ? 'Los cambios se guardan solos.' : 'Se agrega a tu plan de deudas.'}
        >
            {isEdit ? (
                debt ? (
                    <EditDebtContent debt={debt} onClose={close} />
                ) : (
                    <p className="text-sm text-ft-ink-3">Esta deuda ya no existe.</p>
                )
            ) : (
                <NewDebtContent onClose={close} />
            )}
        </Drawer>
    )
}
