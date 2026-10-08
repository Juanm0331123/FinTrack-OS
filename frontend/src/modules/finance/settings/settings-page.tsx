'use client'

import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { STRATEGY_HINTS, STRATEGY_OPTIONS } from '../debts/debt-strategy'
import { CATEGORY_DESCRIPTIONS, CATEGORY_ORDER } from '../domain/categories'
import type { MoneyAccount } from '../domain/types'
import { useAccounts, useSettings } from '../hooks/use-workbook-data'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { CategoryPill } from '../ui/category-pill'
import { Field, inputClassName, MoneyInput, PercentInput, Segmented, Switch } from '../ui/fields'
import { PageHeader } from '../ui/layout-parts'
import { Panel, PanelHeader } from '../ui/panel'

function messageOf(error: unknown) {
    return error instanceof Error ? error.message : 'No pudimos guardar el cambio.'
}

function AccountRow({
    accounts,
    account,
    isFirst,
    isLast,
    onMessage,
}: {
    account: MoneyAccount
    accounts: readonly MoneyAccount[]
    isFirst: boolean
    isLast: boolean
    onMessage: (message: string | null) => void
}) {
    const actions = useWorkbookActions()
    const [name, setName] = useState(account.name)
    const [error, setError] = useState<string | null>(null)

    const commit = () => {
        const trimmed = name.trim()

        if (trimmed === account.name) {
            return
        }

        if (!trimmed) {
            setError('Escribe un nombre.')
            return
        }

        if (accounts.some((other) => other.id !== account.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
            setError('Ya tienes una cuenta con ese nombre.')
            return
        }

        setError(null)
        actions.updateAccount(account.id, { name: trimmed })
    }

    const remove = async () => {
        onMessage(null)

        try {
            const result = await actions.removeAccount(account.id)

            onMessage(
                result === 'archived'
                    ? `${account.name} tiene movimientos, así que la archivamos. Sus filas no cambian.`
                    : `${account.name} se eliminó.`,
            )
        } catch (removeError) {
            onMessage(messageOf(removeError))
        }
    }

    return (
        <li className="flex flex-wrap items-start gap-2 border-b border-ft-line-soft py-2.5 last:border-b-0">
            <div className="min-w-0 flex-[1_1_200px]">
                <label htmlFor={`account-${account.id}`} className="sr-only">
                    Nombre de la cuenta
                </label>
                <input
                    id={`account-${account.id}`}
                    className={inputClassName}
                    value={name}
                    maxLength={60}
                    aria-invalid={error ? true : undefined}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur()
                        }
                    }}
                />
                {error ? <p className="mt-1 text-[12.5px] font-medium text-ft-neg">{error}</p> : null}
            </div>
            <div className="flex items-center gap-1">
                <FtButton
                    variant="ghost"
                    size="icon"
                    disabled={isFirst}
                    aria-label={`Subir ${account.name}`}
                    onClick={() => actions.moveAccount(account.id, -1)}
                >
                    <ArrowUp aria-hidden="true" />
                </FtButton>
                <FtButton
                    variant="ghost"
                    size="icon"
                    disabled={isLast}
                    aria-label={`Bajar ${account.name}`}
                    onClick={() => actions.moveAccount(account.id, 1)}
                >
                    <ArrowDown aria-hidden="true" />
                </FtButton>
                <FtButton variant="ghost" size="icon" aria-label={`Quitar ${account.name}`} onClick={() => void remove()}>
                    <Archive aria-hidden="true" />
                </FtButton>
            </div>
        </li>
    )
}

export function SettingsPage() {
    const settings = useSettings()
    const accounts = useAccounts()
    const actions = useWorkbookActions()
    const [newAccount, setNewAccount] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const active = useMemo(
        () => (accounts ?? []).filter((account) => !account.archived).toSorted((left, right) => left.sortOrder - right.sortOrder),
        [accounts],
    )
    const archived = useMemo(() => (accounts ?? []).filter((account) => account.archived), [accounts])

    if (!settings || !accounts) {
        return null
    }

    const addAccount = async () => {
        const name = newAccount.trim()

        if (!name) {
            return
        }

        setBusy(true)
        setMessage(null)

        try {
            await actions.createAccount(name)
            setNewAccount('')
        } catch (createError) {
            setMessage(messageOf(createError))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col gap-[18px]">
            <PageHeader title="Configuración" subtitle="Colchón, prestaciones, plan de deudas y cuentas" />
            <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-2">
                <div className="flex flex-col gap-[18px]">
                    <Panel aria-labelledby="money-settings">
                        <PanelHeader id="money-settings" title="Colchón y prestaciones" />
                        <div className="grid grid-cols-1 gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-[18px]">
                            <Field
                                label="Colchón mínimo en disponible"
                                htmlFor="settings-cushion"
                                hint="La meta del mes se cumple cuando el disponible llega a este valor."
                            >
                                <MoneyInput
                                    id="settings-cushion"
                                    value={settings.cushionAmount}
                                    onValueChange={(value) => actions.updateSettings({ cushionAmount: value ?? 0 })}
                                />
                            </Field>
                            <Field
                                label="Prestaciones (% del salario)"
                                htmlFor="settings-benefits"
                                hint="Se descuenta del salario en cada mes, salvo que lo ajustes a mano."
                            >
                                <PercentInput
                                    id="settings-benefits"
                                    value={settings.benefitsRate}
                                    onValueChange={(benefitsRate) => actions.updateSettings({ benefitsRate })}
                                />
                            </Field>
                        </div>
                    </Panel>
                    <Panel aria-labelledby="debt-settings">
                        <PanelHeader id="debt-settings" title="Plan de deudas" />
                        <div className="px-4 pb-5 sm:px-[18px]">
                            <div className="mb-4 flex flex-col gap-1.5">
                                <span className="text-[13px] font-medium text-ft-ink-2">Estrategia de prioridad</span>
                                <Segmented
                                    label="Estrategia de prioridad"
                                    options={STRATEGY_OPTIONS}
                                    value={settings.debtStrategy}
                                    onChange={(debtStrategy) => actions.updateSettings({ debtStrategy })}
                                    className="self-start"
                                />
                                <p className="text-[13px] leading-5 text-ft-ink-3">{STRATEGY_HINTS[settings.debtStrategy]}</p>
                            </div>
                            <Switch
                                checked={settings.redirectDebtOverpayments}
                                label="Redirigir lo que pago de más en deudas baratas"
                                onCheckedChange={(redirectDebtOverpayments) => actions.updateSettings({ redirectDebtOverpayments })}
                            />
                            <p className="mt-1.5 text-[13px] leading-5 text-ft-ink-3">
                                Si está activo, cada deuda queda en su cuota mínima y lo que pagas de más se suma a la bolsa extra
                                de la deuda más cara.
                            </p>
                        </div>
                    </Panel>
                    <Panel aria-labelledby="category-settings">
                        <PanelHeader id="category-settings" title="Categorías" aside="Iguales en todos los meses" />
                        <ul className="px-4 pb-3 sm:px-[18px]">
                            {CATEGORY_ORDER.map((category) => (
                                <li
                                    key={category}
                                    className="grid grid-cols-1 gap-1.5 border-b border-ft-line-soft py-3 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-start sm:gap-4"
                                >
                                    <CategoryPill category={category} className="justify-self-start" />
                                    <p className="text-[13px] leading-5 text-ft-ink-2">{CATEGORY_DESCRIPTIONS[category]}</p>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>

                <Panel aria-labelledby="account-settings">
                    <PanelHeader id="account-settings" title="Cuentas" aside="Dónde sale cada gasto" />
                    <ul className="px-4 sm:px-[18px]">
                        {active.map((account, index) => (
                            <AccountRow
                                key={account.id}
                                account={account}
                                accounts={accounts}
                                isFirst={index === 0}
                                isLast={index === active.length - 1}
                                onMessage={setMessage}
                            />
                        ))}
                    </ul>
                    <form
                        className="flex gap-2 border-t border-ft-line-soft px-4 py-4 sm:px-[18px]"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void addAccount()
                        }}
                    >
                        <label htmlFor="settings-new-account" className="sr-only">
                            Nueva cuenta
                        </label>
                        <input
                            id="settings-new-account"
                            className={inputClassName}
                            placeholder="Nueva cuenta: Nequi, Bancolombia, tarjeta…"
                            value={newAccount}
                            maxLength={60}
                            onChange={(event) => setNewAccount(event.target.value)}
                        />
                        <FtButton type="submit" variant="secondary" disabled={!newAccount.trim() || busy}>
                            <Plus aria-hidden="true" />
                            Agregar
                        </FtButton>
                    </form>
                    {message ? (
                        <p role="status" className="px-4 pb-4 text-[13px] text-ft-ink-2 sm:px-[18px]">
                            {message}
                        </p>
                    ) : null}
                    {archived.length > 0 ? (
                        <div className="border-t border-ft-line px-4 py-3 sm:px-[18px]">
                            <p className="text-[12.5px] font-semibold text-ft-ink-3">Archivadas</p>
                            <ul>
                                {archived.map((account) => (
                                    <li key={account.id} className="flex min-h-11 items-center justify-between gap-3 text-sm text-ft-ink-2">
                                        {account.name}
                                        <FtButton
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => actions.updateAccount(account.id, { archived: false })}
                                        >
                                            <ArchiveRestore aria-hidden="true" />
                                            Restaurar
                                        </FtButton>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </Panel>
            </div>
        </div>
    )
}
