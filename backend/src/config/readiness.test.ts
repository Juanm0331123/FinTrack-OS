import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createReadinessProbe } from './readiness.ts'

describe('createReadinessProbe (ROPS-04)', () => {
    it('coalesces concurrent checks and reuses the result within the window', async () => {
        let now = 0
        let checks = 0
        const probe = createReadinessProbe({ check: async () => (checks += 1) > 0, now: () => now, ttlMs: 2000 })

        assert.deepEqual(await Promise.all([probe(), probe(), probe()]), [true, true, true])
        now = 1999
        assert.equal(await probe(), true)
        assert.equal(checks, 1)

        now = 2000
        await probe()
        assert.equal(checks, 2)
    })

    it('shares a failed result too, so an outage is not amplified', async () => {
        let checks = 0
        const probe = createReadinessProbe({ check: async () => ((checks += 1), false), now: () => 0, ttlMs: 2000 })

        assert.deepEqual(await Promise.all([probe(), probe()]), [false, false])
        assert.equal(await probe(), false)
        assert.equal(checks, 1)
    })

    it('treats a thrown check as not ready', async () => {
        const probe = createReadinessProbe({ check: async () => Promise.reject(new Error('caída')), ttlMs: 2000 })

        assert.equal(await probe(), false)
    })
})
