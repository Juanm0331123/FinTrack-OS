'use client'

import {
    type ClipboardEvent,
    type KeyboardEvent,
    useRef,
} from 'react'

import { cn } from '@/shared/lib/utils'

type OneTimeCodeInputProps = {
    describedBy?: string
    error?: boolean
    length?: number
    onChange: (value: string) => void
    value: string
}

export function OneTimeCodeInput({
    describedBy,
    error = false,
    length = 6,
    onChange,
    value,
}: OneTimeCodeInputProps) {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([])
    const digits = Array.from({ length }, (_, index) => value[index] ?? '')

    function updateValue(index: number, nextDigit: string) {
        const sanitizedDigit = nextDigit.replace(/\D/g, '').slice(-1)
        const nextDigits = [...digits]
        nextDigits[index] = sanitizedDigit
        onChange(nextDigits.join(''))

        if (sanitizedDigit && index < length - 1) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault()
            inputRefs.current[index - 1]?.focus()
        }

        if (event.key === 'ArrowRight' && index < length - 1) {
            event.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        const pastedValue = event.clipboardData
            .getData('text')
            .replace(/\D/g, '')
            .slice(0, length)

        if (!pastedValue) {
            return
        }

        event.preventDefault()
        onChange(pastedValue)

        const nextFocusIndex = Math.min(pastedValue.length, length - 1)
        inputRefs.current[nextFocusIndex]?.focus()
    }

    return (
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((digit, index) => (
                <input
                    key={`otp-${index}`}
                    ref={(element) => {
                        inputRefs.current[index] = element
                    }}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digito ${index + 1} del codigo`}
                    aria-describedby={describedBy}
                    className={cn(
                        'h-14 rounded-2xl border border-border bg-card text-center font-mono text-xl font-semibold text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
                        error &&
                            'border-destructive/60 focus-visible:border-destructive/60 focus-visible:ring-destructive/20',
                    )}
                    maxLength={1}
                    value={digit}
                    onChange={(event) => updateValue(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                />
            ))}
        </div>
    )
}
