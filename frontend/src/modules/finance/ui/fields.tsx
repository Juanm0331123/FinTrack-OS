'use client'

import { useId, useState, type ChangeEvent, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { formatAmount, parseAmountInput, percentInputToFraction, toPercentInput } from '../lib/format'

export const inputClassName =
    'h-11 w-full min-w-0 rounded-lg border border-ft-line bg-white px-3 text-sm text-ft-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ft-focus focus:ring-[3px] focus:ring-ft-focus-soft disabled:bg-ft-hover disabled:text-ft-ink-3 lg:h-10'

export const selectClassName = cn(inputClassName, 'cursor-pointer appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9')

export const SELECT_CHEVRON_STYLE = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
}

export function Field({
    children,
    className,
    hint,
    htmlFor,
    label,
}: {
    children: ReactNode
    className?: string
    hint?: ReactNode
    htmlFor?: string
    label: ReactNode
}) {
    return (
        <div className={cn('min-w-0', className)}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ft-ink-2">
                {label}
            </label>
            {children}
            {hint ? <p className="mt-1.5 text-[12.5px] leading-5 text-ft-ink-3">{hint}</p> : null}
        </div>
    )
}

// Borrador de un monto mientras se edita: el texto escrito se conserva tal cual (sin reformatear a
// cada tecla) y solo un valor válido llega al libro. Un formato rechazado deja el último valor
// válido y muestra el motivo asociado al campo. La validez nativa impide que un formulario
// envíe ese valor anterior mientras el texto visible sea inválido.
export function useAmountDraft(value: number | null, onValueChange: (value: number | null) => void) {
    const [draft, setDraft] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    return {
        error,
        inputProps: {
            'aria-invalid': error ? true : undefined,
            onBlur: () => {
                if (!error) {
                    setDraft(null)
                }
            },
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
                const parsed = parseAmountInput(event.target.value)

                event.currentTarget.setCustomValidity(parsed.ok ? '' : parsed.error)
                setDraft(event.target.value)

                if (parsed.ok) {
                    setError(null)
                    onValueChange(parsed.value)
                } else {
                    setError(parsed.error)
                }
            },
            value: draft ?? (value === null ? '' : formatAmount(value)),
        },
    }
}

// Toda la caja del campo (44 px, con prefijo y relleno) enfoca su input, no solo el texto.
function focusInnerInput(event: MouseEvent<HTMLDivElement>) {
    const input = event.currentTarget.querySelector('input')

    if (input && event.target !== input) {
        event.preventDefault()
        input.focus()
    }
}

export function FieldError({ id, message }: { id: string; message: string | null }) {
    return (
        <p id={id} aria-live="polite" className={cn('text-[12.5px] font-medium text-ft-neg', message ? 'mt-1.5' : 'sr-only')}>
            {message}
        </p>
    )
}

type MoneyInputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value' | 'prefix'> & {
    onValueChange: (value: number | null) => void
    prefix?: string
    value: number | null
    wrapperClassName?: string
}

export function MoneyInput({
    className,
    onValueChange,
    prefix = '$',
    value,
    wrapperClassName,
    ...props
}: MoneyInputProps) {
    const errorId = useId()
    const { error, inputProps } = useAmountDraft(value, onValueChange)
    const describedBy = [props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined

    return (
        <>
            <div
                onMouseDown={focusInnerInput}
                className={cn(
                    'flex h-11 items-center gap-1.5 rounded-lg border bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft lg:h-10',
                    error ? 'border-ft-neg' : 'border-ft-line',
                    wrapperClassName,
                )}
            >
                <span aria-hidden="true" className="text-[13px] text-ft-ink-3">
                    {prefix}
                </span>
                <input
                    {...props}
                    {...inputProps}
                    aria-describedby={describedBy}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className={cn(
                        'h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ft-ink outline-none tabular',
                        className,
                    )}
                />
            </div>
            <FieldError id={errorId} message={error} />
        </>
    )
}

// scale: decimales de la fracción que guarda el API (tasas 6, prestaciones 4).
export function PercentInput({
    id,
    onValueChange,
    scale = 6,
    value,
    ...props
}: Omit<ComponentProps<'input'>, 'onChange' | 'value'> & {
    onValueChange: (fraction: number) => void
    scale?: number
    value: number
}) {
    const [draft, setDraft] = useState(() => toPercentInput(value))

    return (
        <div
            onMouseDown={focusInnerInput}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-ft-line bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft lg:h-10"
        >
            <input
                {...props}
                id={id}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ft-ink outline-none tabular"
                value={draft}
                onChange={(event) => {
                    setDraft(event.target.value)

                    const fraction = percentInputToFraction(event.target.value, scale)

                    if (fraction !== null) {
                        onValueChange(fraction)
                    }
                }}
                onBlur={() => setDraft(toPercentInput(value))}
            />
            <span aria-hidden="true" className="text-[13px] text-ft-ink-3">
                %
            </span>
        </div>
    )
}

export function Segmented<T extends string>({
    className,
    label,
    onChange,
    options,
    scrollable = false,
    value,
}: {
    className?: string
    label: string
    onChange: (value: T) => void
    options: ReadonlyArray<{ label: ReactNode; value: T }>
    scrollable?: boolean
    value: T
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className={cn(
                'flex flex-wrap gap-0.5 rounded-[9px] bg-ft-muted p-[3px]',
                scrollable && 'max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[scrollbar-width:none]',
                className,
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                    className="h-11 min-w-11 flex-none cursor-pointer rounded-[7px] px-2.5 lg:h-8 lg:min-w-0 text-[13px] font-medium text-ft-ink-2 transition-colors duration-150 outline-none hover:text-ft-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ft-focus aria-pressed:bg-white aria-pressed:text-ft-ink aria-pressed:shadow-[0_1px_2px_rgba(16,24,40,0.1)]"
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export function Switch({
    checked,
    className,
    label,
    onCheckedChange,
}: {
    checked: boolean
    className?: string
    label: ReactNode
    onCheckedChange: (checked: boolean) => void
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'group inline-flex min-h-11 cursor-pointer lg:min-h-10 items-center gap-2.5 rounded-lg text-left text-sm font-medium text-ft-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus',
                className,
            )}
        >
            <span
                aria-hidden="true"
                className="relative h-6 w-10 flex-none rounded-full bg-ft-control transition-colors duration-150 group-aria-checked:bg-ft-primary"
            >
                <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(16,24,40,0.2)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-aria-checked:translate-x-4" />
            </span>
            <span>{label}</span>
        </button>
    )
}

export function focusNextInGroup(event: KeyboardEvent<HTMLInputElement>, group: string) {
    if (event.key !== 'Enter') {
        return
    }

    event.preventDefault()

    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-input-group="${group}"]`))
    const index = inputs.indexOf(event.currentTarget)
    const next = inputs[index + (event.shiftKey ? -1 : 1)]

    if (next) {
        next.focus()
        next.select()
    } else {
        event.currentTarget.blur()
    }
}
