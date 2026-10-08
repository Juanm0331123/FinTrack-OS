'use client'

import { useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { formatAmount, parseAmountInput, parseDecimalInput, toPercentInput } from '../lib/format'

export const inputClassName =
    'h-11 w-full min-w-0 rounded-lg border border-ft-line bg-white px-3 text-sm text-ft-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ft-focus focus:ring-[3px] focus:ring-ft-focus-soft disabled:bg-ft-hover disabled:text-ft-ink-3 sm:h-10'

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
    return (
        <div
            className={cn(
                'flex h-11 items-center gap-1.5 rounded-lg border border-ft-line bg-white px-3 sm:h-10 transition-[border-color,box-shadow] duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft',
                wrapperClassName,
            )}
        >
            <span aria-hidden="true" className="text-[13px] text-ft-ink-3">
                {prefix}
            </span>
            <input
                {...props}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                    'h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ft-ink outline-none tabular',
                    className,
                )}
                value={value === null ? '' : formatAmount(value)}
                onChange={(event) => onValueChange(parseAmountInput(event.target.value))}
            />
        </div>
    )
}

export function PercentInput({
    id,
    onValueChange,
    value,
    ...props
}: Omit<ComponentProps<'input'>, 'onChange' | 'value'> & {
    onValueChange: (fraction: number) => void
    value: number
}) {
    const [draft, setDraft] = useState(() => toPercentInput(value))

    return (
        <div className="flex h-11 items-center gap-1.5 rounded-lg border border-ft-line bg-white px-3 sm:h-10 transition-[border-color,box-shadow] duration-150 focus-within:border-ft-focus focus-within:ring-[3px] focus-within:ring-ft-focus-soft">
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

                    const parsed = parseDecimalInput(event.target.value)

                    if (parsed !== null && parsed <= 100) {
                        onValueChange(Math.round(parsed * 10_000) / 1_000_000)
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
                    className="h-[38px] flex-none cursor-pointer rounded-[7px] px-2.5 sm:h-8 text-[13px] font-medium text-ft-ink-2 transition-colors duration-150 outline-none hover:text-ft-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ft-focus aria-pressed:bg-white aria-pressed:text-ft-ink aria-pressed:shadow-[0_1px_2px_rgba(16,24,40,0.1)]"
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
                'group inline-flex min-h-11 cursor-pointer sm:min-h-10 items-center gap-2.5 rounded-lg text-left text-sm font-medium text-ft-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus',
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
