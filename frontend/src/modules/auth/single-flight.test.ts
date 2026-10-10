import { describe, expect, it, vi } from 'vitest'

import { createSingleFlight } from './single-flight'

describe('createSingleFlight', () => {
    it('ignores a second submission while the first is still running', async () => {
        const flight = createSingleFlight()
        let release: () => void = () => undefined
        const task = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
        const first = flight.run(task)
        const second = flight.run(task)

        release()
        await Promise.all([first, second])

        expect(task).toHaveBeenCalledTimes(1)
    })

    it('accepts a new submission after the previous one finished, even if it failed', async () => {
        const flight = createSingleFlight()
        const task = vi.fn().mockRejectedValueOnce(new Error('falló')).mockResolvedValueOnce(undefined)

        await expect(flight.run(task)).rejects.toThrow('falló')
        await flight.run(task)

        expect(task).toHaveBeenCalledTimes(2)
    })
})
