'use client'

import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
    formatCurrencyInputValue,
    getCurrencySymbol,
    parseCurrencyInputValue,
} from './dashboard-money'

type CurrencyInputProps = Omit<
    React.ComponentProps<typeof Input>,
    'onChange' | 'type' | 'value'
> & {
    currencyCode: string
    onValueChange: (value: number) => void
    value: number
}

export function CurrencyInput({
    className,
    currencyCode,
    onValueChange,
    value,
    ...props
}: CurrencyInputProps) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-muted-foreground">
                {getCurrencySymbol(currencyCode)}
            </span>
            <Input
                {...props}
                type="text"
                inputMode="decimal"
                className={cn('pl-9 finance-number', className)}
                value={formatCurrencyInputValue(value, currencyCode)}
                onChange={(event) => {
                    const nextValue = parseCurrencyInputValue(
                        event.target.value,
                        currencyCode,
                    )

                    onValueChange(nextValue)
                }}
            />
        </div>
    )
}
