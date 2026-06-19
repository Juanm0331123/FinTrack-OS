const currencyFormatterCache = new Map<string, Intl.NumberFormat>()
const numberFormatterCache = new Map<string, Intl.NumberFormat>()

function getCurrencyFormatter(currencyCode: string) {
    const cacheKey = `currency:${currencyCode}`

    if (!currencyFormatterCache.has(cacheKey)) {
        currencyFormatterCache.set(
            cacheKey,
            new Intl.NumberFormat('es-CO', {
                currency: currencyCode,
                style: 'currency',
            }),
        )
    }

    return currencyFormatterCache.get(cacheKey)!
}

function getNumberFormatter(currencyCode: string) {
    const fractionDigits = getCurrencyFractionDigits(currencyCode)
    const cacheKey = `number:${currencyCode}:${fractionDigits}`

    if (!numberFormatterCache.has(cacheKey)) {
        numberFormatterCache.set(
            cacheKey,
            new Intl.NumberFormat('es-CO', {
                maximumFractionDigits: fractionDigits,
                minimumFractionDigits: 0,
            }),
        )
    }

    return numberFormatterCache.get(cacheKey)!
}

export function formatCurrency(value: number, currencyCode: string) {
    return getCurrencyFormatter(currencyCode).format(value)
}

export function formatCurrencyInputValue(value: number, currencyCode: string) {
    return getNumberFormatter(currencyCode).format(value)
}

export function getCurrencyFractionDigits(currencyCode: string) {
    return (
        getCurrencyFormatter(currencyCode).resolvedOptions().maximumFractionDigits ?? 0
    )
}

export function getCurrencySymbol(currencyCode: string) {
    return (
        getCurrencyFormatter(currencyCode)
            .formatToParts(0)
            .find((part) => part.type === 'currency')?.value ?? currencyCode
    )
}

export function parseCurrencyInputValue(rawValue: string, currencyCode: string) {
    const fractionDigits = getCurrencyFractionDigits(currencyCode)
    const decimalSeparator = fractionDigits > 0 ? ',' : ''
    const sanitized = rawValue
        .replace(new RegExp(`[^0-9${decimalSeparator}]`, 'g'), '')
        .replace(/^0+(?=\d)/, '')

    if (!sanitized) {
        return 0
    }

    if (!fractionDigits) {
        return Number(sanitized)
    }

    const [integerPart, decimalPart = ''] = sanitized.split(decimalSeparator)
    const normalizedValue = `${integerPart || '0'}.${decimalPart.slice(0, fractionDigits)}`

    return Number(normalizedValue)
}
