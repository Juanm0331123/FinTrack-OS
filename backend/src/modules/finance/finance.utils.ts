const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function assertYearMonth(value: string) {
    if (!YEAR_MONTH_PATTERN.test(value)) {
        throw new Error(`Invalid yearMonth value "${value}".`)
    }
}

export function parseYearMonth(value: string) {
    assertYearMonth(value)

    const [year, month] = value.split('-').map(Number)

    return {
        month,
        year,
    }
}

export function getMonthBounds(yearMonth: string) {
    const { month, year } = parseYearMonth(yearMonth)
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0))

    return { end, start }
}

export function getPreviousYearMonth(yearMonth: string) {
    const { month, year } = parseYearMonth(yearMonth)
    const previousMonth = month === 1 ? 12 : month - 1
    const previousYear = month === 1 ? year - 1 : year

    return `${previousYear}-${String(previousMonth).padStart(2, '0')}`
}

export function getNextYearMonth(yearMonth: string) {
    const { month, year } = parseYearMonth(yearMonth)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

export function getCurrentYearMonth(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function toDateOnly(value: Date | string) {
    const parsed = value instanceof Date ? value : new Date(value)

    return new Date(
        Date.UTC(
            parsed.getUTCFullYear(),
            parsed.getUTCMonth(),
            parsed.getUTCDate(),
        ),
    )
}

export function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10)
}

export function roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

export function decimalToNumber(value: unknown) {
    if (typeof value === 'number') {
        return value
    }

    if (typeof value === 'string') {
        return Number(value)
    }

    if (
        value &&
        typeof value === 'object' &&
        'toNumber' in value &&
        typeof value.toNumber === 'function'
    ) {
        return value.toNumber()
    }

    return Number(value ?? 0)
}
