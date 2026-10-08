const DAY_MS = 24 * 60 * 60 * 1000

function utcDate(year: number, month: number, day: number) {
    return new Date(Date.UTC(year, month - 1, day))
}

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}

function nextMonday(date: Date) {
    const weekday = date.getUTCDay()

    return weekday === 1 ? date : addDays(date, (8 - weekday) % 7)
}

function isoOf(date: Date) {
    return date.toISOString().slice(0, 10)
}

export function easterSunday(year: number) {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1

    return utcDate(year, month, day)
}

const holidayCache = new Map<number, Map<string, string>>()

export function getColombianHolidays(year: number) {
    const cached = holidayCache.get(year)

    if (cached) {
        return cached
    }

    const easter = easterSunday(year)
    const holidays: Array<[Date, string]> = [
        [utcDate(year, 1, 1), 'Año Nuevo'],
        [nextMonday(utcDate(year, 1, 6)), 'Reyes Magos'],
        [nextMonday(utcDate(year, 3, 19)), 'San José'],
        [addDays(easter, -3), 'Jueves Santo'],
        [addDays(easter, -2), 'Viernes Santo'],
        [utcDate(year, 5, 1), 'Día del Trabajo'],
        [addDays(easter, 43), 'Ascensión del Señor'],
        [addDays(easter, 64), 'Corpus Christi'],
        [addDays(easter, 71), 'Sagrado Corazón'],
        [nextMonday(utcDate(year, 6, 29)), 'San Pedro y San Pablo'],
        [utcDate(year, 7, 20), 'Día de la Independencia'],
        [utcDate(year, 8, 7), 'Batalla de Boyacá'],
        [nextMonday(utcDate(year, 8, 15)), 'Asunción de la Virgen'],
        [nextMonday(utcDate(year, 10, 12)), 'Día de la Raza'],
        [nextMonday(utcDate(year, 11, 1)), 'Todos los Santos'],
        [nextMonday(utcDate(year, 11, 11)), 'Independencia de Cartagena'],
        [utcDate(year, 12, 8), 'Inmaculada Concepción'],
        [utcDate(year, 12, 25), 'Navidad'],
    ]
    const result = new Map(holidays.map(([date, name]) => [isoOf(date), name]))

    holidayCache.set(year, result)

    return result
}
