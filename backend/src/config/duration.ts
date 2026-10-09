const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/i

const UNIT_SECONDS: Record<string, number> = {
    d: 24 * 60 * 60,
    h: 60 * 60,
    m: 60,
    s: 1,
}

export function isDuration(value: string) {
    const match = value.trim().match(DURATION_PATTERN)

    return Boolean(match) && Number(match?.[1]) > 0
}

export function durationToSeconds(value: string) {
    const match = value.trim().match(DURATION_PATTERN)

    if (!match) {
        throw new Error(`Duración no soportada "${value}". Usa un valor como 15m, 1h o 7d.`)
    }

    return Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()]
}

export function durationToMilliseconds(value: string) {
    return durationToSeconds(value) * 1000
}
