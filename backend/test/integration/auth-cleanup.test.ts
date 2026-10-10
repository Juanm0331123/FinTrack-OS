import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'
import { installFakeProviders, type FakeProviders } from '../support/fake-providers.ts'
import { deleteUsersByEmail, lastCodeSentTo, prisma, startApi, stopDatabase, testEmail, TEST_PASSWORD, type TestApi } from '../support/harness.ts'

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
const createdEmails: string[] = []
let api: TestApi
let providers: FakeProviders

before(async () => {
    api = await startApi()
    providers = installFakeProviders()
})

after(async () => {
    providers.restore()
    await deleteUsersByEmail(...createdEmails)
    await api.close()
    await stopDatabase()
})

function trackedEmail() {
    const email = testEmail('cleanup')

    createdEmails.push(email)

    return email
}

function cleanup() {
    const result = spawnSync(process.execPath, ['scripts/cleanup-auth.ts'], {
        cwd: backendRoot,
        encoding: 'utf8',
        env: { ...process.env, AUTH_RETENTION_DAYS: '30' },
    })

    assert.equal(result.status, 0, result.stderr)
}

async function expireVerificationCodes(email: string) {
    const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)

    await prisma.authToken.updateMany({
        data: { createdAt: old, expiresAt: old },
        where: { type: 'EMAIL_VERIFICATION', user: { email } },
    })
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'email-' } } })
}

async function oauthPending(email: string) {
    providers.google = { email, email_verified: true, name: 'Persona OAuth', sub: randomUUID() }

    const owner = api.client()
    const start = await owner.get('/api/auth/oauth/google/start?intent=login')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await owner.get(`/api/auth/oauth/google/callback?code=c&state=${encodeURIComponent(state)}`)

    assert.equal(new URLSearchParams(new URL(callback.headers.get('location')!).hash.slice(1)).get('status'), 'pending_verification')

    return owner
}

describe('verification provenance survives auth cleanup (AUTH-R3-01)', () => {
    it('lets an OAuth-only pending user verify a resent code after retention cleanup', async () => {
        const email = trackedEmail()
        const owner = await oauthPending(email)
        const expiredCode = lastCodeSentTo(email)

        await expireVerificationCodes(email)
        cleanup()

        assert.equal((await owner.post('/api/auth/verify-email-code', { code: expiredCode, email })).status, 401, 'retaining provenance never makes an expired code usable')
        assert.equal((await owner.post('/api/auth/resend-email-code', { email })).status, 200)

        const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })

        assert.equal(verified.status, 200, 'an OAuth account does not know a generated password')

        await expireVerificationCodes(email)
        cleanup()

        assert.equal(await prisma.authToken.count({ where: { user: { email } } }), 0, 'activation releases the retained marker')
    })

    it('still requires the registration password after cleanup even if OAuth was previously linked', async () => {
        const email = trackedEmail()
        const owner = await oauthPending(email)

        await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'email-' } } })

        const registered = await api.client().post('/api/auth/register', { email, firstName: 'Persona', password: TEST_PASSWORD })

        assert.equal(registered.status, 201)
        await expireVerificationCodes(email)
        cleanup()

        assert.equal((await owner.post('/api/auth/resend-email-code', { email })).status, 200)

        const code = lastCodeSentTo(email)
        const withoutPassword = await owner.post('/api/auth/verify-email-code', { code, email })
        const withPassword = await owner.post('/api/auth/verify-email-code', { code, email, password: TEST_PASSWORD })

        assert.equal(withoutPassword.status, 401, 'a retained OAuth link cannot authorize a later registration password')
        assert.equal(withPassword.status, 200)
    })

    it('keeps only the current pending marker and releases it when the security stamp changes', async () => {
        const email = trackedEmail()

        await oauthPending(email)
        await expireVerificationCodes(email)

        const user = await prisma.user.findUniqueOrThrow({ where: { email } })
        const marker = await prisma.authToken.findFirstOrThrow({ where: { userId: user.id } })
        const older = new Date(marker.createdAt.getTime() - 1000)

        await prisma.authToken.update({ data: { revokedAt: marker.createdAt }, where: { id: marker.id } })
        await prisma.authToken.createMany({
            data: [
                { createdAt: older, expiresAt: older, requiresPassword: true, securityStamp: user.securityStamp, tokenHash: randomUUID(), tokenSalt: randomUUID(), type: 'EMAIL_VERIFICATION', userId: user.id },
                { createdAt: marker.createdAt, expiresAt: older, securityStamp: randomUUID(), tokenHash: randomUUID(), tokenSalt: randomUUID(), type: 'EMAIL_VERIFICATION', userId: user.id },
                { createdAt: marker.createdAt, expiresAt: older, securityStamp: user.securityStamp, tokenHash: randomUUID(), type: 'EMAIL_VERIFICATION', userId: user.id },
                { createdAt: marker.createdAt, expiresAt: older, securityStamp: user.securityStamp, tokenHash: randomUUID(), tokenSalt: randomUUID(), type: 'PASSWORD_RESET', userId: user.id },
            ],
        })

        cleanup()

        assert.deepEqual(
            (await prisma.authToken.findMany({ select: { id: true }, where: { userId: user.id } })).map((token) => token.id),
            [marker.id],
            'cleanup retains one current marker, including a revoked one, and removes all expired historical tokens',
        )

        await prisma.user.update({ data: { securityStamp: randomUUID() }, where: { id: user.id } })
        cleanup()

        assert.equal(await prisma.authToken.count({ where: { userId: user.id } }), 0, 'a changed stamp releases the obsolete marker')
    })
})
