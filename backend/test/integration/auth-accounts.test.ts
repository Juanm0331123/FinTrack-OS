import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import bcrypt from 'bcryptjs'
import { installFakeProviders, type FakeProviders } from '../support/fake-providers.ts'
import {
    cookieValue,
    createUser,
    deleteUsers,
    deleteUsersByEmail,
    lastCodeSentTo,
    login,
    outbox,
    prisma,
    startApi,
    stopDatabase,
    testEmail,
    type TestApi,
    type TestClient,
    TEST_PASSWORD,
} from '../support/harness.ts'

let api: TestApi
let providers: FakeProviders
const createdUsers: string[] = []
const createdEmails: string[] = []

before(async () => {
    api = await startApi()
    providers = installFakeProviders()
})

beforeEach(() => {
    providers.behavior = 'ok'
})

after(async () => {
    providers.restore()
    await deleteUsers(...createdUsers)
    await deleteUsersByEmail(...createdEmails)
    await api.close()
    await stopDatabase()
})

function trackEmail(email = testEmail()) {
    createdEmails.push(email)

    return email
}

function registerBody(email: string, password = TEST_PASSWORD) {
    return { email, firstName: 'Persona', lastName: 'Prueba', password }
}

async function oauthLogin(client: TestClient, provider: 'github' | 'google', intent: 'login' | 'register' = 'login') {
    const start = await client.get(`/api/auth/oauth/${provider}/start?intent=${intent}`)
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await client.get(`/api/auth/oauth/${provider}/callback?code=provider-code&state=${encodeURIComponent(state)}`)
    const fragment = new URLSearchParams(new URL(callback.headers.get('location')!).hash.slice(1))

    return { callback, fragment }
}

describe('registration (REG-01)', () => {
    it('resolves two concurrent registrations of the same email coherently, without index errors', async () => {
        const email = trackEmail()
        const [first, second] = await Promise.all([
            api.client().post('/api/auth/register', registerBody(email)),
            api.client().post('/api/auth/register', registerBody(email)),
        ])
        const statuses = [first.status, second.status].sort()

        // El límite de envío por correo deja pasar uno y frena el duplicado inmediato con 429; si
        // ambos llegan al servicio, ambos responden 201 sobre la misma cuenta pendiente.
        assert.ok(
            JSON.stringify(statuses) === '[201,201]' || JSON.stringify(statuses) === '[201,429]',
            `unexpected statuses ${statuses}`,
        )

        for (const response of [first, second]) {
            assert.doesNotMatch(response.text, /Unique constraint|constraint/i)
        }

        assert.equal(await prisma.user.count({ where: { email } }), 1)
    })

    it('reports a real conflict for an active account with a stable code and no internal details', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const response = await api.client().post('/api/auth/register', registerBody(user.email))

        assert.equal(response.status, 409)
        assert.equal(response.body.code, 'EMAIL_ALREADY_REGISTERED')
    })

    it('gives an inactive account the same answer as an active one', async () => {
        const user = await createUser({ status: 'INACTIVE' })

        createdUsers.push(user.id)

        const response = await api.client().post('/api/auth/register', registerBody(user.email))

        assert.equal(response.status, 409)
        assert.equal(response.body.code, 'EMAIL_ALREADY_REGISTERED')
    })

    it('does not return the verification code unless development exposure is enabled', async () => {
        const email = trackEmail()
        const response = await api.client().post('/api/auth/register', registerBody(email))

        assert.equal(response.status, 201)
        assert.equal('verificationCode' in response.body.data, false)
    })
})

describe('one-time codes (AUTH-03, AUTH-08)', () => {
    it('consumes a verification code once under concurrent submissions', async () => {
        const email = trackEmail()

        await api.client().post('/api/auth/register', registerBody(email))

        const code = lastCodeSentTo(email)
        const results = await Promise.all(
            [1, 2, 3].map(() => api.client().post('/api/auth/verify-email-code', { code, email, password: TEST_PASSWORD })),
        )

        assert.deepEqual(
            results.map((result) => result.status).sort(),
            [200, 401, 401],
        )
        assert.equal(await prisma.authSession.count({ where: { user: { email } } }), 1)
    })

    it('revokes a code after repeated wrong attempts', async () => {
        const email = trackEmail()

        await api.client().post('/api/auth/register', registerBody(email))

        const code = lastCodeSentTo(email)
        const wrong = code === '000000' ? '111111' : '000000'

        for (let attempt = 0; attempt < 5; attempt += 1) {
            assert.equal((await api.client().post('/api/auth/verify-email-code', { code: wrong, email, password: TEST_PASSWORD })).status, 401)
        }

        assert.equal((await api.client().post('/api/auth/verify-email-code', { code, email, password: TEST_PASSWORD })).status, 401)
    })

    it('consumes a password-reset code and the reset authorization once', async () => {
        const user = await createUser()

        createdUsers.push(user.id)
        await api.client().post('/api/auth/forgot-password/request', { email: user.email })

        const code = lastCodeSentTo(user.email)
        const verifications = await Promise.all(
            [1, 2].map(() => api.client().post('/api/auth/forgot-password/verify-code', { code, email: user.email })),
        )

        assert.deepEqual(verifications.map((item) => item.status).sort(), [200, 401])

        const resetToken = verifications.find((item) => item.status === 200)!.body.data.resetToken
        const resets = await Promise.all(
            ['Nueva-clave-uno-1', 'Nueva-clave-dos-2'].map((password) =>
                api.client().post('/api/auth/forgot-password/reset', { email: user.email, password, resetToken }),
            ),
        )

        assert.deepEqual(resets.map((item) => item.status).sort(), [200, 401])
    })

    it('recovers access legitimately and closes every previous session and bearer', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const device = api.client()
        const accessToken = await login(device, user)

        await api.client().post('/api/auth/forgot-password/request', { email: user.email })

        const verified = await api.client().post('/api/auth/forgot-password/verify-code', {
            code: lastCodeSentTo(user.email),
            email: user.email,
        })
        const reset = await api.client().post('/api/auth/forgot-password/reset', {
            email: user.email,
            password: 'Recuperada-2026',
            resetToken: verified.body.data.resetToken,
        })

        assert.equal(reset.status, 200)
        assert.equal((await device.get('/api/auth/me', { token: accessToken })).status, 401)
        assert.equal((await device.post('/api/auth/refresh')).status, 401)
        assert.equal(
            (await api.client().post('/api/auth/login', { email: user.email, password: 'Recuperada-2026' })).status,
            200,
        )
    })
})

describe('OAuth linking (AUTH-01)', () => {
    for (const provider of ['google', 'github'] as const) {
        it(`${provider}: a password chosen by whoever pre-registered the email stops working once the owner verifies`, async () => {
            const email = trackEmail()
            const attackerPassword = 'Clave-del-atacante-1'

            assert.equal((await api.client().post('/api/auth/register', registerBody(email, attackerPassword))).status, 201)

            if (provider === 'google') {
                providers.google = { email, email_verified: true, name: 'Dueña Real', sub: `google-${email}` }
            } else {
                providers.github = { emails: [{ email, primary: true, verified: true }], id: Math.floor(Math.random() * 1e9), login: 'duena', name: 'Dueña Real' }
            }

            const owner = api.client()
            const { fragment } = await oauthLogin(owner, provider)

            assert.equal(fragment.get('status'), 'pending_verification')

            const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })

            assert.equal(verified.status, 200)
            assert.equal(verified.body.data.user.firstName, 'Dueña')

            const attacker = await api.client().post('/api/auth/login', { email, password: attackerPassword })

            assert.equal(attacker.status, 401, 'the pre-registration password must not grant access')
        })

        it(`${provider}: linking to an active account keeps the owner’s password and opens a session`, async () => {
            const user = await createUser()

            createdUsers.push(user.id)

            if (provider === 'google') {
                providers.google = { email: user.email, email_verified: true, name: 'Titular', sub: `google-${user.email}` }
            } else {
                providers.github = { emails: [{ email: user.email, primary: true, verified: true }], id: Math.floor(Math.random() * 1e9), login: 'titular', name: 'Titular' }
            }

            const client = api.client()
            const { fragment } = await oauthLogin(client, provider)

            assert.equal(fragment.get('status'), 'success')
            assert.equal(fragment.has('accessToken'), false, 'no tokens travel in the redirect URL')
            assert.ok(cookieValue(client), 'the refresh cookie is set for the frontend to call /refresh')
            assert.equal((await client.post('/api/auth/refresh')).status, 200)
            assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: user.password })).status, 200)
        })
    }

    it('github: ignores an unverified address and requires a verified one', async () => {
        providers.github = {
            emails: [{ email: trackEmail(), primary: true, verified: false }],
            id: 99_000_001,
            login: 'sin-verificar',
            name: null,
        }

        const { fragment } = await oauthLogin(api.client(), 'github')

        assert.equal(fragment.get('status'), 'error')
        assert.equal(fragment.get('code'), 'OAUTH_EMAIL_NOT_VERIFIED')
    })

    it('rejects a callback whose state does not match the cookie', async () => {
        const client = api.client()

        await client.get('/api/auth/oauth/google/start?intent=login')

        const callback = await client.get('/api/auth/oauth/google/callback?code=x&state=forged-state')
        const fragment = new URLSearchParams(new URL(callback.headers.get('location')!).hash.slice(1))

        assert.equal(fragment.get('code'), 'OAUTH_STATE_INVALID')
    })
})

describe('provider deadlines and validation (AUTH-11)', () => {
    const cases = [
        ['timeout', 'OAUTH_PROVIDER_TIMEOUT'],
        ['server-error', 'OAUTH_PROVIDER_UNAVAILABLE'],
        ['malformed', 'OAUTH_INVALID_RESPONSE'],
        ['rejected', 'OAUTH_CODE_REJECTED'],
    ] as const

    for (const [behavior, code] of cases) {
        it(`classifies a provider ${behavior} as ${code} within the deadline`, async () => {
            providers.behavior = behavior

            const startedAt = Date.now()
            const { fragment } = await oauthLogin(api.client(), 'google')

            assert.equal(fragment.get('status'), 'error')
            assert.equal(fragment.get('code'), code)
            assert.ok(Date.now() - startedAt < 3000, 'the request does not hang on the provider')
        })
    }
})

describe('sensitive account changes (AUTH-02)', () => {
    it('no longer changes email or password through PATCH /users/:id', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const client = api.client()
        const token = await login(client, user)

        for (const body of [{ email: testEmail() }, { password: 'Otra-clave-2026' }]) {
            const response = await client.patch(`/api/users/${user.id}`, body, { token })

            assert.equal(response.status, 422)
        }
    })

    it('requires the current password to change it, keeps this session and closes the others', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const current = api.client()
        const other = api.client()
        const token = await login(current, user)
        const otherToken = await login(other, user)
        const wrong = await current.post('/api/auth/password', { currentPassword: 'incorrecta-123', newPassword: 'Nueva-clave-2026' }, { token })

        assert.equal(wrong.status, 403)
        assert.equal(wrong.body.code, 'CURRENT_PASSWORD_INVALID')

        const changed = await current.post('/api/auth/password', { currentPassword: user.password, newPassword: 'Nueva-clave-2026' }, { token })

        assert.equal(changed.status, 200)
        assert.equal((await current.get('/api/auth/me', { token })).status, 200)
        assert.equal((await other.get('/api/auth/me', { token: otherToken })).status, 401)
        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: user.password })).status, 401)
    })

    it('changes the email only after the new address confirms the code', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const client = api.client()
        const other = api.client()
        const token = await login(client, user)
        const otherToken = await login(other, user)
        const newEmail = trackEmail()
        const wrongPassword = await client.post('/api/auth/email-change', { currentPassword: 'mala-clave-1', newEmail }, { token })

        assert.equal(wrongPassword.status, 403)

        const requested = await client.post('/api/auth/email-change', { currentPassword: user.password, newEmail }, { token })

        assert.equal(requested.status, 200)
        assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email, user.email, 'unchanged until confirmed')

        const confirmed = await client.post('/api/auth/email-change/confirm', { code: lastCodeSentTo(newEmail) }, { token })

        assert.equal(confirmed.status, 200)
        assert.equal(confirmed.body.data.user.email, newEmail)
        assert.equal((await other.get('/api/auth/me', { token: otherToken })).status, 401)
        assert.ok(outbox().some((message) => message.to === user.email && /cambió/.test(message.subject)), 'old address notified')
    })

    it('rejects an expired email-change code', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const client = api.client()
        const token = await login(client, user)
        const newEmail = trackEmail()

        await client.post('/api/auth/email-change', { currentPassword: user.password, newEmail }, { token })
        await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) }, where: { type: 'EMAIL_CHANGE', userId: user.id } })

        const confirmed = await client.post('/api/auth/email-change/confirm', { code: lastCodeSentTo(newEmail) }, { token })

        assert.equal(confirmed.status, 400)
        assert.equal(confirmed.body.code, 'EMAIL_CHANGE_CODE_EXPIRED')
    })
})

describe('bcrypt 72-byte limit (AUTH-09)', () => {
    const base = 'é'.repeat(36)

    it('rejects new passwords longer than 72 UTF-8 bytes with an explicit message', async () => {
        const response = await api.client().post('/api/auth/register', registerBody(trackEmail(), `${base}x`))

        assert.equal(response.status, 422)
        assert.match(response.body.errors[0].message, /72 bytes/)
    })

    it('accepts a 72-byte password and distinguishes it from a different one', async () => {
        const password = 'é'.repeat(36)
        const user = await createUser({ password })

        createdUsers.push(user.id)
        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password })).status, 200)
        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: `${'é'.repeat(35)}e` })).status, 401)
    })

    it('stops a legacy long password and its truncation twin, and sends a reset code', async () => {
        const legacy = `${base}suffix-one`
        const user = await createUser({ password: legacy })

        createdUsers.push(user.id)
        assert.equal(await bcrypt.compare(`${base}suffix-two`, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash), true)

        for (const password of [legacy, `${base}suffix-two`]) {
            const response = await api.client().post('/api/auth/login', { email: user.email, password })

            assert.equal(response.status, 403)
            assert.equal(response.body.code, 'PASSWORD_RESET_REQUIRED')
            assert.equal('accessToken' in (response.body.data ?? {}), false)
        }

        assert.ok(lastCodeSentTo(user.email))
    })
})

describe('email sending limits (AUTH-08)', () => {
    it('enforces a per-address cooldown with Retry-After, independent of the client IP', async () => {
        const email = trackEmail()

        assert.equal((await api.client().post('/api/auth/register', registerBody(email))).status, 201)

        const again = await api.client().post('/api/auth/resend-email-code', { email })

        assert.equal(again.status, 429)
        assert.equal(again.body.code, 'EMAIL_RATE_LIMITED')
        assert.ok(Number(again.headers.get('retry-after')) > 0)
        assert.ok(again.headers.get('ratelimit-policy'))
    })
})

describe('account enumeration (AUTH-10)', () => {
    it('answers resend and password reset the same for unknown, pending and active emails', async () => {
        const active = await createUser()
        const pendingEmail = trackEmail()

        createdUsers.push(active.id)
        await api.client().post('/api/auth/register', registerBody(pendingEmail))

        for (const path of ['/api/auth/resend-email-code', '/api/auth/forgot-password/request']) {
            const shapes = []

            for (const email of [trackEmail(), pendingEmail, active.email]) {
                // El enfriamiento por correo es otro control (probado aparte); aquí se aísla.
                await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'email-' } } })

                const response = await api.client().post(path, { email })

                assert.equal(response.status, 200, `${path} for ${email}`)
                shapes.push(Object.keys(response.body.data).sort().join(','))
            }

            assert.equal(new Set(shapes).size, 1, `${path} responses differ in shape`)
        }
    })

    it('uses the same message for an unknown email and a wrong password', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const unknown = await api.client().post('/api/auth/login', { email: trackEmail(), password: 'Algo-cualquiera-1' })
        const wrong = await api.client().post('/api/auth/login', { email: user.email, password: 'Algo-cualquiera-1' })

        assert.equal(unknown.status, 401)
        assert.deepEqual(unknown.body, wrong.body)
    })

    it('spends comparable work on unknown and known emails (bcrypt on both paths)', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const timeLogin = async (email: string) => {
            const startedAt = performance.now()

            await api.client().post('/api/auth/login', { email, password: 'Algo-cualquiera-1' })

            return performance.now() - startedAt
        }

        // El usuario de prueba usa coste 4; el hash ficticio, coste 12 como las cuentas reales.
        // Lo que se comprueba es que el camino desconocido NO sale antes de ejecutar bcrypt.
        const unknownMs = await timeLogin(trackEmail())

        assert.ok(unknownMs >= 100, `unknown email answered in ${Math.round(unknownMs)} ms, without bcrypt work`)
        assert.ok((await timeLogin(user.email)) > 0)
    })
})
