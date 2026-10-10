'use client'

import {
    type ClipboardEvent,
    type KeyboardEvent,
    useRef,
} from 'react'

import { cn } from '@/shared/lib/utils'
import { codeDigits, pasteCode, writeDigit } from './one-time-code'

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
    const digits = codeDigits(value, length)

    function focusAt(index: number) {
        inputRefs.current[Math.min(Math.max(index, 0), length - 1)]?.focus()
    }

    function updateValue(index: number, typed: string) {
        const incoming = typed.replace(/\D/g, '')

        // Varios dígitos de golpe (autocompletado del sistema): se reparten como un pegado.
        if (incoming.length > 1) {
            onChange(pasteCode(value, index, incoming, length))
            focusAt(index + incoming.length)
            return
        }

        onChange(writeDigit(value, index, incoming, length))

        if (incoming && index < length - 1) {
            focusAt(index + 1)
        }
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault()
            focusAt(index - 1)
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault()
            focusAt(index - 1)
        }

        if (event.key === 'ArrowRight' && index < length - 1) {
            event.preventDefault()
            focusAt(index + 1)
        }
    }

    function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '')

        if (!pasted) {
            return
        }

        event.preventDefault()
        onChange(pasteCode(value, index, pasted, length))
        focusAt(index + pasted.length)
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
                    aria-label={`Dígito ${index + 1} del código`}
                    aria-describedby={describedBy}
                    className={cn(
                        'h-14 rounded-2xl border border-border bg-card text-center font-mono text-xl font-semibold text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
                        error &&
                            'border-destructive/60 focus-visible:border-destructive/60 focus-visible:ring-destructive/20',
                    )}
                    value={digit}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateValue(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={(event) => handlePaste(index, event)}
                />
            ))}
        </div>
    )
}
