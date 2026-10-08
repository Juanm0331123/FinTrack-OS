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

export function parseAmountInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')

    return digits ? Number(digits) : null
}

export function parseDecimalInput(raw: string) {
    const compact = raw.replace(/\s/g, '')
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

export function toPercentInput(fraction: number) {
    return String(Math.round(fraction * 100 * 1_000_000) / 1_000_000).replace('.', ',')
}
