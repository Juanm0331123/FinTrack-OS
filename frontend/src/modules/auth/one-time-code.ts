// Modelo del código de un solo uso, independiente del DOM. Cada casilla es una posición fija: un
// hueco se guarda como espacio, así escribir fuera de orden o borrar en medio no desplaza el resto.
const HOLE = ' '

export function codeDigits(value: string, length: number) {
    return Array.from({ length }, (_, index) => (/\d/.test(value[index] ?? '') ? value[index] : ''))
}

function serialize(digits: string[]) {
    return digits.map((digit) => digit || HOLE).join('').trimEnd()
}

export function writeDigit(value: string, index: number, typed: string, length: number) {
    const digits = codeDigits(value, length)

    digits[index] = typed.replace(/\D/g, '').slice(-1)

    return serialize(digits)
}

// Pegado (o autocompletado) desde una casilla: llena las siguientes con los dígitos recibidos.
export function pasteCode(value: string, index: number, text: string, length: number) {
    const digits = codeDigits(value, length)
    const incoming = text.replace(/\D/g, '').slice(0, length - index)

    for (const [offset, digit] of [...incoming].entries()) {
        digits[index + offset] = digit
    }

    return serialize(digits)
}

export function isCompleteCode(value: string, length: number) {
    return value.length === length && /^\d+$/.test(value)
}
