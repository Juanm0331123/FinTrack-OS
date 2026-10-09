// Redondeo a centavos con la regla de ROUND(valor; 2) de Excel: la mitad se aleja de cero y se
// evalúa sobre el decimal que se escribió, no sobre su aproximación binaria. `1.005 * 100` en
// coma flotante da 100.49999…, por eso aquí se opera con los dígitos de la representación
// decimal más corta del número (la que JavaScript produce con String()).

function toPlainDecimal(value: number) {
    const [mantissa, exponentText] = Math.abs(value).toString().split('e')
    const [integerPart, fractionPart = ''] = mantissa.split('.')
    const exponent = Number(exponentText ?? 0)
    let digits = integerPart + fractionPart
    let pointIndex = integerPart.length + exponent

    if (pointIndex <= 0) {
        digits = '0'.repeat(1 - pointIndex) + digits
        pointIndex = 1
    }

    if (pointIndex > digits.length) {
        digits += '0'.repeat(pointIndex - digits.length)
    }

    return { fraction: digits.slice(pointIndex), integer: digits.slice(0, pointIndex) }
}

export function roundHalfUpToCents(value: number) {
    if (!Number.isFinite(value)) {
        throw new RangeError('El monto debe ser un número finito.')
    }

    const { fraction, integer } = toPlainDecimal(value)
    let cents = BigInt(integer || '0') * 100n + BigInt(`${fraction}00`.slice(0, 2))

    if ((fraction[2] ?? '0') >= '5') {
        cents += 1n
    }

    const rounded = Number(cents) / 100

    return value < 0 && rounded !== 0 ? -rounded : rounded
}
