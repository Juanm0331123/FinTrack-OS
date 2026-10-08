const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function isYearMonth(value: string) {
    return YEAR_MONTH_PATTERN.test(value)
}

export function parseYearMonth(value: string) {
    if (!isYearMonth(value)) {
        throw new Error(`Invalid yearMonth value "${value}".`)
    }

    const [year, month] = value.split('-').map(Number)

    return { month, year }
}

export function formatYearMonth(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`
}

export function shiftYearMonth(value: string, delta: number) {
    const { month, year } = parseYearMonth(value)
    const index = year * 12 + (month - 1) + delta

    return formatYearMonth(Math.floor(index / 12), (index % 12) + 1)
}
