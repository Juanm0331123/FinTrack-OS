import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    classifyConsumedTokenReplay,
    isSessionUsable,
    newSessionExpiry,
    renewedIdleExpiry,
} from './session-policy.ts'

const DAY = 24 * 60 * 60
const LIFETIMES = { absoluteSeconds: 30 * DAY, idleSeconds: 7 * DAY }
const LOGIN_AT = new Date('2026-10-01T12:00:00.000Z')

describe('newSessionExpiry', () => {
    it('opens a session that ends after 7 idle days and at most 30 days after login', () => {
        const expiry = newSessionExpiry(LOGIN_AT, LIFETIMES)

        assert.equal(expiry.idleExpiresAt.toISOString(), '2026-10-08T12:00:00.000Z')
        assert.equal(expiry.absoluteExpiresAt.toISOString(), '2026-10-31T12:00:00.000Z')
    })
})

describe('renewedIdleExpiry', () => {
    const absoluteExpiresAt = new Date('2026-10-31T12:00:00.000Z')

    it('extends the idle window from the renewal time', () => {
        const renewedAt = new Date('2026-10-10T08:00:00.000Z')

        assert.equal(renewedIdleExpiry(renewedAt, absoluteExpiresAt, LIFETIMES.idleSeconds).toISOString(), '2026-10-17T08:00:00.000Z')
    })

    it('never extends past the absolute limit, however often the session renews', () => {
        const renewedAt = new Date('2026-10-29T08:00:00.000Z')

        assert.equal(
            renewedIdleExpiry(renewedAt, absoluteExpiresAt, LIFETIMES.idleSeconds).toISOString(),
            absoluteExpiresAt.toISOString(),
        )
    })
})

describe('isSessionUsable', () => {
    const session = {
        absoluteExpiresAt: new Date('2026-10-31T12:00:00.000Z'),
        idleExpiresAt: new Date('2026-10-08T12:00:00.000Z'),
        revokedAt: null,
    }

    it('accepts an open session inside both windows', () => {
        assert.equal(isSessionUsable(session, new Date('2026-10-05T00:00:00.000Z')), true)
    })

    it('rejects a session idle for longer than its window', () => {
        assert.equal(isSessionUsable(session, new Date('2026-10-08T12:00:00.001Z')), false)
    })

    it('rejects a session past its absolute limit', () => {
        assert.equal(
            isSessionUsable({ ...session, idleExpiresAt: session.absoluteExpiresAt }, new Date('2026-11-01T00:00:00.000Z')),
            false,
        )
    })

    it('rejects a revoked session even inside its windows', () => {
        assert.equal(isSessionUsable({ ...session, revokedAt: LOGIN_AT }, new Date('2026-10-02T00:00:00.000Z')), false)
    })
})

describe('classifyConsumedTokenReplay', () => {
    const usedAt = new Date('2026-10-05T10:00:00.000Z')

    it('treats a replay inside the grace window as a concurrent retry from another tab', () => {
        assert.equal(classifyConsumedTokenReplay(usedAt, new Date('2026-10-05T10:00:20.000Z'), 30), 'concurrent-retry')
    })

    it('treats a later replay as reuse of an old or stolen token', () => {
        assert.equal(classifyConsumedTokenReplay(usedAt, new Date('2026-10-05T10:00:31.000Z'), 30), 'reuse')
    })
})
