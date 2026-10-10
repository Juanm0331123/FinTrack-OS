import { roundHalfUp } from '../domain/money'

const amountFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

const percentFormatters = new Map<number, Intl.NumberFormat>()

const NBSP = ' '
const MINUS = '−'

export function formatAmount(value: number) {
    return amountFormatter.format(Math.round(value))
}

export function formatMoney(value: number) {
    const rounded = Math.round(value)
    const sign = rounded < 0 ? MINUS : ''

    return `${sign}$${NBSP}${amountFormatter.format(Math.abs(rounded))}`
}

export function formatSignedMoney(value: number) {
    return value > 0 ? `+${formatMoney(value)}` : formatMoney(value)
}

export function formatCompactMoney(value: number) {
    const absolute = Math.abs(value)

    if (absolute >= 1_000_000) {
        const millions = Math.round(absolute / 100_000) / 10

        return `${millions.toLocaleString('es-CO')}${NBSP}M`
    }

    if (absolute >= 1_000) {
        return `${Math.round(absolute / 1_000)}k`
    }

    return formatAmount(absolute)
}

export function formatPercent(value: number, digits = 2) {
    let formatter = percentFormatters.get(digits)

    if (!formatter) {
        formatter = new Intl.NumberFormat('es-CO', {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
            style: 'percent',
        })
        percentFormatters.set(digits, formatter)
    }

    return formatter.format(value)
}

// Máximo que admite el API (numeric(14, 2)) en pesos enteros.
const MAX_AMOUNT = 999_999_999_999

export type AmountInput = { ok: true; value: number | null } | { error: string; ok: false }

// Montos en pesos enteros con formato es-CO: el punto separa miles y la coma inicia decimales. Se
// aceptan ",00" (pegado de un valor formateado); centavos, signos y separadores mal puestos se
// rechazan con un motivo en lugar de reinterpretarse en silencio.
export function parseAmountInput(raw: string): AmountInput {
    const compact = raw.replace(/\s/g, '').replace(/^\$/, '')

    if (!compact) {
        return { ok: true, value: null }
    }

    if (/[-−]/.test(compact)) {
        return { error: 'El valor no puede ser negativo.', ok: false }
    }

    const [whole, cents, ...rest] = compact.split(',')

    if (rest.length > 0 || !/^[\d.]*$/.test(whole) || (cents !== undefined && !/^\d*$/.test(cents))) {
        return { error: 'Escribe solo números.', ok: false }
    }

    if (cents !== undefined && /[1-9]/.test(cents)) {
        return { error: 'Escribe el valor en pesos, sin centavos.', ok: false }
    }

    if (!/^\d+$/.test(whole) && !/^\d{1,3}(\.\d{3})+$/.test(whole)) {
        return whole ? { error: 'Revisa los puntos de miles: van cada tres dígitos.', ok: false } : { error: 'Escribe solo números.', ok: false }
    }

    const value = Number(whole.replace(/\./g, ''))

    return value > MAX_AMOUNT ? { error: 'El valor es demasiado alto.', ok: false } : { ok: true, value }
}

export function parseDecimalInput(raw: string) {
    const compact = raw.replace(/\s/g, '')

    if (/[-−]/.test(compact)) {
        return null
    }

    const normalized = compact.includes(',')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact
    const cleaned = normalized.replace(/[^0-9.]/g, '')

    if (!cleaned) {
        return null
    }

    const value = Number(cleaned)

    return Number.isFinite(value) ? value : null
}

// Porcentaje escrito (p. ej. "12,5") → fracción que guarda el API con `scale` decimales (la escala
// de su columna), o null si no es válido.
export function percentInputToFraction(raw: string, scale: number) {
    const parsed = parseDecimalInput(raw)

    return parsed !== null && parsed <= 100 ? roundHalfUp(roundHalfUp(parsed, scale - 2) / 100, scale) : null
}

export function toPercentInput(fraction: number) {
    return String(Math.round(fraction * 100 * 1_000_000) / 1_000_000).replace('.', ',')
}
