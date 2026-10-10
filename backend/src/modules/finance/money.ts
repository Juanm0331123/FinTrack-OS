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

// ROUND(valor; decimales) de Excel con la misma regla. Se usa también para tasas y porcentajes,
// que se guardan con la escala de su columna (tasas 6, tasa de prestaciones 4, porcentaje 2): así
// lo que se compara en un reintento es exactamente lo que quedó guardado.
export function roundHalfUpTo(value: number, decimals: number) {
    if (!Number.isFinite(value)) {
        throw new RangeError('El valor debe ser un número finito.')
    }

    const { fraction, integer } = toPlainDecimal(value)
    const scale = 10n ** BigInt(decimals)
    let units = BigInt(integer || '0') * scale + BigInt(`${fraction}${'0'.repeat(decimals)}`.slice(0, decimals) || '0')

    if ((fraction[decimals] ?? '0') >= '5') {
        units += 1n
    }

    const rounded = Number(units) / 10 ** decimals

    return value < 0 && rounded !== 0 ? -rounded : rounded
}

export function roundHalfUpToCents(value: number) {
    return roundHalfUpTo(value, 2)
}
