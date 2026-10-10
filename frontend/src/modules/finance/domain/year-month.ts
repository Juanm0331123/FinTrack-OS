// Contrato del API: hojas entre 2000-01 y 2099-12.
const YEAR_MONTH_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/

// La fecha de negocio (hoy, mes actual, vencimientos) es la de Colombia, sin importar la zona
// horaria del dispositivo. Bogotá no tiene horario de verano, pero se usa Intl para no depender de
// un desfase fijo.
const BUSINESS_TIME_ZONE = 'America/Bogota'

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
})

const MONTH_NAMES = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
]

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function pad(value: number) {
    return String(value).padStart(2, '0')
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

export function isYearMonth(value: string | null | undefined): value is string {
    return typeof value === 'string' && YEAR_MONTH_PATTERN.test(value)
}

export function parseYearMonth(value: string) {
    const [year, month] = value.split('-').map(Number)

    return { month, year }
}

export function formatYearMonth(year: number, month: number) {
    return `${year}-${pad(month)}`
}

// Fecha AAAA-MM-DD de ese instante en Bogotá.
export function toIsoDate(date: Date) {
    const parts = Object.fromEntries(businessDateFormatter.formatToParts(date).map((part) => [part.type, part.value]))

    return `${parts.year}-${parts.month}-${parts.day}`
}

export function toYearMonth(date: Date) {
    return toIsoDate(date).slice(0, 7)
}

export function shiftYearMonth(value: string, delta: number) {
    const { month, year } = parseYearMonth(value)
    const index = year * 12 + (month - 1) + delta

    return formatYearMonth(Math.floor(index / 12), (index % 12) + 1)
}

export function daysInMonth(value: string) {
    const { month, year } = parseYearMonth(value)

    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isoDateFor(value: string, day: number) {
    return `${value}-${pad(Math.min(Math.max(day, 1), daysInMonth(value)))}`
}

export function yearOf(value: string) {
    return parseYearMonth(value).year
}

export function monthName(value: string) {
    return MONTH_NAMES[parseYearMonth(value).month - 1]
}

export function monthLabel(value: string) {
    return `${capitalize(monthName(value))} ${yearOf(value)}`
}

export function shortMonthLabel(value: string) {
    return capitalize(monthName(value).slice(0, 3))
}

export function weekdayName(isoDate: string) {
    const [year, month, day] = isoDate.split('-').map(Number)

    return WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

export function longDayLabel(isoDate: string) {
    const [, month, day] = isoDate.split('-').map(Number)

    return `${capitalize(weekdayName(isoDate))} ${day} de ${MONTH_NAMES[month - 1]}`
}

export function shortDayLabel(isoDate: string) {
    const day = Number(isoDate.slice(8, 10))

    return `${capitalize(weekdayName(isoDate).slice(0, 3))} ${day}`
}
