import { describe, expect, it } from 'vitest'

import { createFlowGuard } from './flow-guard'

describe('createFlowGuard', () => {
    it('lets the current run apply its result', () => {
        const run = createFlowGuard().begin()

        expect(run.isCurrent()).toBe(true)
        expect(run.signal.aborted).toBe(false)
    })

    it('marks a run started before a cancellation as stale and aborts its request', () => {
        const guard = createFlowGuard()
        const before = guard.begin()

        guard.invalidate()

        const after = guard.begin()

        expect(before.isCurrent()).toBe(false)
        expect(before.signal.aborted).toBe(true)
        expect(after.isCurrent()).toBe(true)
        expect(after.signal.aborted).toBe(false)
    })
})
