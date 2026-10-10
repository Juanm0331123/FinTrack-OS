import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSaveQueue, type SaveQueueStatus } from './save-queue'

function setup() {
    const statuses: SaveQueueStatus[] = []
    const queue = createSaveQueue({ debounceMs: 500, onStatus: (status) => statuses.push(status) })

    return { queue, statuses }
}

describe('createSaveQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('coalesces patches for the same key into one request after the debounce', async () => {
        const { queue } = setup()
        const send = vi.fn(async () => undefined)

        queue.patch('entry:1', { amount: 1 }, send)
        queue.patch('entry:1', { amount: 12 }, send)
        queue.patch('entry:1', { isPaid: true }, send)

        expect(send).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(500)

        expect(send).toHaveBeenCalledTimes(1)
        expect(send).toHaveBeenCalledWith({ amount: 12, isPaid: true })
    })

    it('runs jobs of the same key in order: create, then patch, then delete', async () => {
        const { queue } = setup()
        const calls: string[] = []
        let finishCreate: () => void = () => undefined

        void queue.run('entry:1', () => new Promise<void>((resolve) => {
            calls.push('create:start')
            finishCreate = () => {
                calls.push('create:end')
                resolve()
            }
        }))
        queue.patch('entry:1', { amount: 5 }, async () => {
            calls.push('patch')
        })
        await vi.advanceTimersByTimeAsync(500)
        void queue.run('entry:1', async () => {
            calls.push('delete')
        })

        expect(calls).toEqual(['create:start'])
        finishCreate()
        await vi.runAllTimersAsync()

        expect(calls).toEqual(['create:start', 'create:end', 'patch', 'delete'])
    })

    it('reports pending work while waiting and idle when done', async () => {
        const { queue, statuses } = setup()

        queue.patch('settings', { cushionAmount: 1 }, async () => undefined)

        expect(queue.hasUnsaved()).toBe(true)
        expect(statuses.at(-1)).toEqual({ error: null, failed: 0, pending: 1 })

        await vi.advanceTimersByTimeAsync(500)

        expect(queue.hasUnsaved()).toBe(false)
        expect(statuses.at(-1)).toEqual({ error: null, failed: 0, pending: 0 })
    })

    it('keeps failed jobs and retries them on demand', async () => {
        const { queue, statuses } = setup()
        let attempts = 0

        void queue.run('debt:1', async () => {
            attempts += 1

            if (attempts === 1) {
                throw new Error('Sin conexión')
            }
        })
        await vi.runAllTimersAsync()

        expect(statuses.at(-1)).toEqual({ error: 'Sin conexión', failed: 1, pending: 0 })
        expect(queue.hasUnsaved()).toBe(true)

        queue.retryFailed()
        await vi.runAllTimersAsync()

        expect(attempts).toBe(2)
        expect(statuses.at(-1)).toEqual({ error: null, failed: 0, pending: 0 })
    })

    it('drops a pending patch when the key is cancelled', async () => {
        const { queue } = setup()
        const send = vi.fn(async () => undefined)

        queue.patch('entry:9', { amount: 3 }, send)
        queue.cancel('entry:9')
        await vi.advanceTimersByTimeAsync(1000)

        expect(send).not.toHaveBeenCalled()
        expect(queue.hasUnsaved()).toBe(false)
    })

    it('sends every waiting patch immediately on flush', async () => {
        const { queue } = setup()
        const send = vi.fn(async () => undefined)

        queue.patch('sheet:2026-03', { salary: 100 }, send)
        queue.flushAll()
        await vi.advanceTimersByTimeAsync(0)

        expect(send).toHaveBeenCalledWith({ salary: 100 })
    })
})
