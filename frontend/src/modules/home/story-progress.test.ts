import { describe, expect, it } from 'vitest'

import { resolveStoryFrame, resolveStoryProgress } from './story-progress'

describe('resolveStoryProgress', () => {
    it('mantiene la primera y última escenas fuera del recorrido y llega a la mitad entre ambas', () => {
        const centers = [400, 1400, 2400, 3400]

        expect(resolveStoryProgress(centers, -200)).toBe(0)
        expect(resolveStoryProgress(centers, 1900)).toBe(0.5)
        expect(resolveStoryProgress(centers, 5000)).toBe(1)
    })

    it('sin recorrido medible conserva el estado inicial sin NaN ni división por cero', () => {
        expect(resolveStoryProgress([], 500)).toBe(0)
        expect(resolveStoryProgress([500], 500)).toBe(0)
        expect(resolveStoryProgress([500, 500], 500)).toBe(0)
        expect(resolveStoryProgress([900, 500], 700)).toBe(0)
        expect(resolveStoryProgress([400, 3400], Number.NaN)).toBe(0)
    })
})

describe('resolveStoryFrame', () => {
    it('muestra cada capítulo en su centro y mezcla solo las dos escenas vecinas en los puntos medios', () => {
        expect(resolveStoryFrame(0).weights).toEqual([1, 0, 0, 0])
        expect(resolveStoryFrame(1 / 3).weights).toEqual([0, 1, 0, 0])
        expect(resolveStoryFrame(2 / 3).weights).toEqual([0, 0, 1, 0])
        expect(resolveStoryFrame(1).weights).toEqual([0, 0, 0, 1])
        expect(resolveStoryFrame(0.5).weights).toEqual([0, 0.5, 0.5, 0])
        expect(resolveStoryFrame(0.5).index).toBe(2)
    })

    it('acota entradas fuera del recorrido y conserva una escena inicial para entradas no válidas', () => {
        expect(resolveStoryFrame(-10)).toEqual({ index: 0, weights: [1, 0, 0, 0] })
        expect(resolveStoryFrame(50)).toEqual({ index: 3, weights: [0, 0, 0, 1] })
        expect(resolveStoryFrame(Number.NaN)).toEqual({ index: 0, weights: [1, 0, 0, 0] })
    })

    it('al subir reproduce exactamente los estados de bajada, incluso después de visitar otra escena', () => {
        const positions = [0, 0.12, 1 / 6, 0.21, 1 / 3, 0.49, 0.5, 0.51, 2 / 3, 5 / 6, 0.9, 1]
        const down = positions.map(resolveStoryFrame)
        const up = [...positions].reverse().map(resolveStoryFrame).reverse()

        expect(up).toEqual(down)
        expect(resolveStoryFrame(0.5)).toEqual({ index: 2, weights: [0, 0.5, 0.5, 0] })
    })

    it('no salta de opacidad al cruzar un punto medio ni en sus bordes', () => {
        for (const position of [1 / 6 - 0.05, 1 / 6, 1 / 6 + 0.05, 0.45, 0.5, 0.55, 5 / 6 - 0.05, 5 / 6, 5 / 6 + 0.05]) {
            const before = resolveStoryFrame(position - 0.000001)
            const after = resolveStoryFrame(position + 0.000001)

            expect(before.weights.reduce((total, value) => total + value, 0)).toBeCloseTo(1)
            expect(after.weights.reduce((total, value) => total + value, 0)).toBeCloseTo(1)
            before.weights.forEach((weight, index) => {
                expect(Math.abs(weight - after.weights[index])).toBeLessThan(0.001)
            })
        }
    })
})
