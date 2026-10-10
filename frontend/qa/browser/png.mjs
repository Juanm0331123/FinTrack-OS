// Decodificador PNG mínimo (RGBA/RGB de 8 bits, sin entrelazado), suficiente para leer píxeles de
// las capturas de Chrome y medir contraste sobre el fondo real (gradientes incluidos).
import { inflateSync } from 'node:zlib'

export function decodePng(buffer) {
    let offset = 8
    let width = 0
    let height = 0
    let colorType = 0
    const idat = []

    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset)
        const type = buffer.toString('ascii', offset + 4, offset + 8)
        const data = buffer.subarray(offset + 8, offset + 8 + length)

        if (type === 'IHDR') {
            width = data.readUInt32BE(0)
            height = data.readUInt32BE(4)
            colorType = data[9]

            if (data[8] !== 8 || data[12] !== 0) {
                throw new Error('PNG no soportado: se esperaba 8 bits sin entrelazado.')
            }
        } else if (type === 'IDAT') {
            idat.push(data)
        } else if (type === 'IEND') {
            break
        }

        offset += 12 + length
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0

    if (!channels) {
        throw new Error(`Tipo de color PNG no soportado: ${colorType}`)
    }

    const raw = inflateSync(Buffer.concat(idat))
    const stride = width * channels
    const pixels = Buffer.alloc(height * stride)

    for (let y = 0; y < height; y += 1) {
        const filter = raw[y * (stride + 1)]
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))

        for (let x = 0; x < stride; x += 1) {
            const left = x >= channels ? pixels[y * stride + x - channels] : 0
            const up = y > 0 ? pixels[(y - 1) * stride + x] : 0
            const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0
            let value = line[x]

            if (filter === 1) value += left
            else if (filter === 2) value += up
            else if (filter === 3) value += Math.floor((left + up) / 2)
            else if (filter === 4) {
                const p = left + up - upLeft
                const pa = Math.abs(p - left)
                const pb = Math.abs(p - up)
                const pc = Math.abs(p - upLeft)

                value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
            }

            pixels[y * stride + x] = value & 0xff
        }
    }

    return {
        height,
        pixel(x, y) {
            const index = Math.round(y) * stride + Math.round(x) * channels

            return [pixels[index], pixels[index + 1], pixels[index + 2]]
        },
        width,
    }
}

function channel(value) {
    const srgb = value / 255

    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function luminance([r, g, b]) {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

    return (light + 0.05) / (dark + 0.05)
}
