'use client'

import { Copy, FilePlus2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { monthLabel, monthName, shiftYearMonth } from '../domain/year-month'
import { useSelectedMonth } from '../hooks/use-selected-month'
import { useAccounts, usePreviousSheet, useSettings } from '../hooks/use-workbook-data'
import { useWorkbookActions } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import {
    Field,
    inputClassName,
    MoneyInput,
    PercentInput,
    SELECT_CHEVRON_STYLE,
    selectClassName,
} from '../ui/fields'
import { EmptyState } from '../ui/layout-parts'
import { Panel } from '../ui/panel'

const MONTHS_BACK = 11

function messageOf(error: unknown) {
    return error instanceof Error ? error.message : 'No pudimos crear la hoja.'
}

function startMonthOptions(currentYearMonth: string, selected: string) {
    const options = Array.from({ length: MONTHS_BACK + 2 }, (_, index) =>
        shiftYearMonth(currentYearMonth, index - MONTHS_BACK),
    )

    return options.includes(selected) ? options : [...options, selected].sort()
}

export function CreateMonthState({ yearMonth }: { yearMonth: string }) {
    const previous = usePreviousSheet(yearMonth)
    const actions = useWorkbookActions()
    const [busy, setBusy] = useState<'NONE' | 'PREVIOUS' | null>(null)
    const [error, setError] = useState<string | null>(null)

    const create = async (copyFrom: 'NONE' | 'PREVIOUS') => {
        setBusy(copyFrom)
        setError(null)

        try {
            await actions.createSheet(yearMonth, copyFrom)
        } catch (createError) {
            setError(messageOf(createError))
        } finally {
            setBusy(null)
        }
    }

    return (
        <Panel>
            <EmptyState
                title={`${monthLabel(yearMonth)} todavía no tiene hoja`}
                action={
                    <>
                        {previous ? (
                            <FtButton variant="primary" disabled={busy !== null} onClick={() => void create('PREVIOUS')}>
                                <Copy aria-hidden="true" />
                                {busy === 'PREVIOUS' ? 'Copiando…' : `Copiar ${monthName(previous.yearMonth)}`}
                            </FtButton>
                        ) : null}
                        <FtButton
                            variant={previous ? 'secondary' : 'primary'}
                            disabled={busy !== null}
                            onClick={() => void create('NONE')}
                        >
                            <FilePlus2 aria-hidden="true" />
                            {busy === 'NONE' ? 'Creando…' : 'Crear hoja vacía'}
                        </FtButton>
                    </>
                }
            >
                <p>
                    Cada mes vive en su propia hoja.
                    {previous
                        ? ` Copia ${monthLabel(previous.yearMonth).toLowerCase()} para traer el salario, los descuentos y tus filas de gastos (los pagos llegan pendientes y los bolsillos sin gastos), o empieza en blanco.`
                        : ' Empieza en blanco y llena ingresos y gastos.'}
                </p>
                {error ? (
                    <p role="alert" className="mt-2 font-medium text-ft-neg">
                        {error}
                    </p>
                ) : null}
            </EmptyState>
        </Panel>
    )
}

export function FirstRunSetup({ yearMonth }: { yearMonth: string }) {
    const settings = useSettings()
    const accounts = useAccounts()
    const actions = useWorkbookActions()
    const router = useRouter()
    const { currentYearMonth, hrefFor } = useSelectedMonth()
    const [startMonth, setStartMonth] = useState(yearMonth)
    const monthOptions = useMemo(
        () => startMonthOptions(currentYearMonth || yearMonth, yearMonth),
        [currentYearMonth, yearMonth],
    )
    const [cushion, setCushion] = useState<number | null>(settings?.cushionAmount || null)
    const [benefitsRate, setBenefitsRate] = useState(settings?.benefitsRate ?? 0.08)
    const [accountName, setAccountName] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const activeAccounts = (accounts ?? []).filter((account) => !account.archived)

    const addAccount = async () => {
        const name = accountName.trim()

        if (!name) {
            return
        }

        setError(null)

        try {
            await actions.createAccount(name)
            setAccountName('')
        } catch (accountError) {
            setError(messageOf(accountError))
        }
    }

    const start = async () => {
        setBusy(true)
        setError(null)
        actions.updateSettings({ benefitsRate, cushionAmount: cushion ?? 0 })
        actions.flush()

        try {
            await actions.createSheet(startMonth, 'NONE')

            if (startMonth !== yearMonth) {
                router.replace(hrefFor(startMonth))
            }
        } catch (createError) {
            setError(messageOf(createError))
            setBusy(false)
        }
    }

    return (
        <Panel aria-labelledby="setup-title" className="mx-auto max-w-2xl">
            <div className="border-b border-ft-line px-5 py-5 sm:px-6">
                <h1 id="setup-title" className="text-2xl font-semibold tracking-[-0.02em] text-ft-ink">
                    Configura tu primer mes
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-ft-ink-2">
                    Cada mes tiene su hoja con ingresos y gastos, y un resumen que se calcula solo. Estos datos los
                    puedes cambiar después en Configuración.
                </p>
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
                <Field
                    label="Primer mes"
                    htmlFor="setup-month"
                    hint="Si quieres registrar meses anteriores, empieza por el más antiguo. Los siguientes los creas copiando el anterior."
                >
                    <select
                        id="setup-month"
                        className={selectClassName}
                        style={SELECT_CHEVRON_STYLE}
                        value={startMonth}
                        onChange={(event) => setStartMonth(event.target.value)}
                    >
                        {monthOptions.map((option) => (
                            <option key={option} value={option}>
                                {monthLabel(option)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field
                    label="Colchón mínimo en disponible"
                    htmlFor="setup-cushion"
                    hint="Lo mínimo que quieres que te quede disponible al cerrar cada mes."
                >
                    <MoneyInput id="setup-cushion" placeholder="0" value={cushion} onValueChange={setCushion} />
                </Field>
                <Field
                    label="Prestaciones (% del salario)"
                    htmlFor="setup-benefits"
                    hint="Salud y pensión que te descuentan del salario. En Colombia suele ser 8%."
                >
                    <PercentInput id="setup-benefits" scale={4} value={benefitsRate} onValueChange={setBenefitsRate} />
                </Field>
                <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ft-ink-2">Tus cuentas</p>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Cuentas">
                        {activeAccounts.map((account) => (
                            <li
                                key={account.id}
                                className="inline-flex h-8 items-center rounded-full bg-ft-muted px-3 text-[13px] font-medium text-ft-ink"
                            >
                                {account.name}
                            </li>
                        ))}
                    </ul>
                    <form
                        className="mt-2 flex gap-2"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void addAccount()
                        }}
                    >
                        <label htmlFor="setup-account" className="sr-only">
                            Nueva cuenta
                        </label>
                        <input
                            id="setup-account"
                            className={inputClassName}
                            placeholder="Nequi, Bancolombia, tarjeta…"
                            value={accountName}
                            maxLength={60}
                            onChange={(event) => setAccountName(event.target.value)}
                        />
                        <FtButton type="submit" variant="secondary" disabled={!accountName.trim()}>
                            <Plus aria-hidden="true" />
                            Agregar
                        </FtButton>
                    </form>
                </div>
                {error ? (
                    <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-ft-neg">
                        <X className="size-4" aria-hidden="true" />
                        {error}
                    </p>
                ) : null}
            </div>
            <div className="flex justify-end border-t border-ft-line px-5 py-4 sm:px-6">
                <FtButton variant="primary" disabled={busy} onClick={() => void start()}>
                    {busy ? 'Creando…' : `Crear la hoja de ${monthName(startMonth)}`}
                </FtButton>
            </div>
        </Panel>
    )
}
