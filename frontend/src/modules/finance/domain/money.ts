// Contrato monetario aprobado en PRODUCT.md: centavos, equivalente a ROUND(valor; 2), con la
// misma regla que el backend al guardar. El libro original no aplica ROUND monetario.
// La mitad se aleja de cero y se evalúa sobre el decimal que se escribió, no sobre su
// aproximación binaria (`1.005 * 100` en coma flotante da 100.49999…). Por eso se opera con los
// dígitos de la representación decimal más corta del número (la que produce String()).
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

// ROUND(valor; decimales) con la regla anterior. También normaliza tasas y porcentajes a la escala
// de su columna en el API (tasas 6, prestaciones 4, porcentaje compartido 2).
export function roundHalfUp(value: number, decimals: number) {
    if (!Number.isFinite(value)) {
        return value
    }

    // Los valores del API caben de sobra en enteros exactos de coma flotante (≤ 10¹⁴ unidades).
    const scale = 10 ** decimals
    const { fraction, integer } = toPlainDecimal(value)
    let units = Number(integer || '0') * scale + Number(`${fraction}${'0'.repeat(decimals)}`.slice(0, decimals) || '0')

    if ((fraction[decimals] ?? '0') >= '5') {
        units += 1
    }

    const rounded = units / scale

    return value < 0 && rounded !== 0 ? -rounded : rounded
}

export function roundMoney(value: number) {
    return roundHalfUp(value, 2)
}

export function sumAmounts(entries: ReadonlyArray<{ amount: number | null }>) {
    let total = 0

    for (const entry of entries) {
        total += entry.amount ?? 0
    }

    return roundMoney(total)
}
