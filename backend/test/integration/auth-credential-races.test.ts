import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, beforeEach, describe, it } from 'node:test'
import bcrypt from 'bcryptjs'
import { installFakeProviders, type FakeProviders } from '../support/fake-providers.ts'
import {
    createUser,
    deleteUsers,
    deleteUsersByEmail,
    lastCodeSentTo,
    login,
    prisma,
    startApi,
    stopDatabase,
    testEmail,
    type TestApi,
    type TestClient,
} from '../support/harness.ts'

// Regresiones de la revisión independiente (RAUTH-01, RAUTH-02, RAUTH-03). Las barreras se
// colocan en métodos públicos del repositorio para intercalar operaciones reales sobre
// PostgreSQL; la otra operación pasa por la API HTTP real.
const { AuthRepository } = await import('../../src/modules/auth/auth.repository.ts')
const { AuthService } = await import('../../src/modules/auth/auth.service.ts')

type Repository = InstanceType<typeof AuthRepository>

let api: TestApi
let providers: FakeProviders
const createdUsers: string[] = []
const createdEmails: string[] = []

before(async () => {
    api = await startApi()
    providers = installFakeProviders()
})

beforeEach(async () => {
    providers.behavior = 'ok'
    // Los límites de envío por correo son otro control; aquí se aíslan para encadenar flujos.
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'email-' } } })
})

after(async () => {
    providers.restore()
    await deleteUsers(...createdUsers)
    await deleteUsersByEmail(...createdEmails)
    await api.close()
    await stopDatabase()
})

function trackEmail() {
    const email = testEmail('race')

    createdEmails.push(email)

    return email
}

function barrier() {
    let release: () => void = () => undefined
    const reached = new Promise<void>((resolve) => {
        release = resolve
    })

    return { reached, release: () => release() }
}

async function register(email: string, password: string) {
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'email-' } } })

    return api.client().post('/api/auth/register', { email, firstName: 'Persona', password })
}

async function oauthPending(email: string, sub: string = randomUUID()): Promise<TestClient> {
    providers.google = { email, email_verified: true, name: 'Titular Real', sub }

    const client = api.client()
    const start = await client.get('/api/auth/oauth/google/start?intent=login')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await client.get(`/api/auth/oauth/google/callback?code=c&state=${encodeURIComponent(state)}`)

    assert.equal(new URLSearchParams(new URL(callback.headers.get('location')!).hash.slice(1)).get('status'), 'pending_verification')

    return client
}

describe('pending account credentials are bound to the verification (RAUTH-01)', () => {
    it('does not activate a password set by a re-registration after the owner linked OAuth', async () => {
        const email = trackEmail()

        assert.equal((await register(email, 'Clave-inicial-1')).status, 201)

        const owner = await oauthPending(email)

        assert.equal((await register(email, 'Clave-reemplazo-2')).status, 201)

        // El dueño solo tiene el código (llegó a su correo), no la contraseña del re-registro.
        const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })
        const attackerLogin = await api.client().post('/api/auth/login', { email, password: 'Clave-reemplazo-2' })

        assert.equal(verified.status, 401)
        assert.notEqual(attackerLogin.status, 200)
        assert.equal(await prisma.authSession.count({ where: { user: { email } } }), 0)
    })

    it('rejects the original OAuth code when the password was replaced while it was outstanding', async () => {
        const email = trackEmail()
        const owner = await oauthPending(email)
        const originalCode = lastCodeSentTo(email)
        const updated = barrier()
        const proceed = barrier()

        class PausingRepository extends AuthRepository {
            override async updatePendingUser(...args: Parameters<Repository['updatePendingUser']>) {
                const result = await super.updatePendingUser(...args)

                updated.release()
                await proceed.reached

                return result
            }
        }

        const replacing = new AuthService(new PausingRepository()).register({ email, firstName: 'Atacante', password: 'Clave-carrera-3' })

        await updated.reached

        const verified = await owner.post('/api/auth/verify-email-code', { code: originalCode, email })

        proceed.release()
        await replacing

        const replacementLogin = await api.client().post('/api/auth/login', { email, password: 'Clave-carrera-3' })

        assert.equal(verified.status, 401)
        assert.notEqual(replacementLogin.status, 200)
    })

    it('lets the email owner who registered activate with the code and their password', async () => {
        const email = trackEmail()

        assert.equal((await register(email, 'Clave-propia-4')).status, 201)

        const wrongPassword = await api.client().post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email, password: 'Otra-clave-5' })
        const verified = await api.client().post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email, password: 'Clave-propia-4' })

        assert.equal(wrongPassword.status, 401)
        assert.equal(verified.status, 200)
    })

    it('lets the owner reclaim a squatted email by registering again, without the squatter’s password working', async () => {
        const email = trackEmail()

        await register(email, 'Clave-ocupante-6')
        await register(email, 'Clave-duena-7')

        const verified = await api.client().post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email, password: 'Clave-duena-7' })

        assert.equal(verified.status, 200)
        assert.equal((await api.client().post('/api/auth/login', { email, password: 'Clave-ocupante-6' })).status, 401)
    })

    it('still activates an OAuth-only pending account with the code when nothing changed its credentials', async () => {
        const email = trackEmail()
        const owner = await oauthPending(email)
        const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })

        assert.equal(verified.status, 200)
    })
})

describe('sessions only open for the credentials that were checked (RAUTH-02)', () => {
    async function staleLogin(user: { email: string; password: string }, interfere: () => Promise<void>) {
        const waiting = barrier()
        const resume = barrier()

        class PausingRepository extends AuthRepository {
            override async createSession(...args: Parameters<Repository['createSession']>) {
                waiting.release()
                await resume.reached

                return super.createSession(...args)
            }
        }

        const pending = new AuthService(new PausingRepository())
            .login({ email: user.email, password: user.password }, {})
            .then(
                (result) => ({ result }),
                (error: unknown) => ({ error }),
            )

        await waiting.reached
        await interfere()
        resume.release()

        return pending
    }

    it('refuses a login that checked the old password after the password change finished', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const owner = api.client()
        const token = await login(owner, user)
        const outcome = await staleLogin(user, async () => {
            const changed = await owner.post('/api/auth/password', { currentPassword: user.password, newPassword: 'Clave-nueva-8' }, { token })

            assert.equal(changed.status, 200)
        })

        assert.ok('error' in outcome, 'the stale login must not open a session')
        assert.equal(await prisma.authSession.count({ where: { revokedAt: null, userId: user.id } }), 1, 'only the owner’s current session')
    })

    it('refuses a login that finishes after a password recovery', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const outcome = await staleLogin(user, async () => {
            await api.client().post('/api/auth/forgot-password/request', { email: user.email })

            const verified = await api.client().post('/api/auth/forgot-password/verify-code', { code: lastCodeSentTo(user.email), email: user.email })
            const reset = await api.client().post('/api/auth/forgot-password/reset', {
                email: user.email,
                password: 'Clave-recuperada-9',
                resetToken: verified.body.data.resetToken,
            })

            assert.equal(reset.status, 200)
        })

        assert.ok('error' in outcome)
        assert.equal(await prisma.authSession.count({ where: { revokedAt: null, userId: user.id } }), 0)
    })

    it('refuses a login that finishes after an administrator deactivated the account', async () => {
        const user = await createUser()
        const admin = await createUser({ role: 'ADMIN' })

        createdUsers.push(user.id, admin.id)

        const adminClient = api.client()
        const adminToken = await login(adminClient, admin)
        const outcome = await staleLogin(user, async () => {
            assert.equal((await adminClient.patch(`/api/users/${user.id}`, { status: 'INACTIVE' }, { token: adminToken })).status, 200)
        })

        assert.ok('error' in outcome)
        assert.equal(await prisma.authSession.count({ where: { revokedAt: null, userId: user.id } }), 0)
    })

    it('refuses a login that finishes after logout-all closed every session', async () => {
        const user = await createUser()

        createdUsers.push(user.id)

        const owner = api.client()
        const token = await login(owner, user)
        const outcome = await staleLogin(user, async () => {
            assert.equal((await owner.post('/api/auth/logout-all', {}, { token })).status, 200)
        })

        assert.ok('error' in outcome)
        assert.equal(await prisma.authSession.count({ where: { revokedAt: null, userId: user.id } }), 0)
    })

    it('keeps normal logins working', async () => {
        const user = await createUser()

        createdUsers.push(user.id)
        assert.ok(await login(api.client(), user))
    })
})

describe('legacy hashes that may hide a longer password (RAUTH-03)', () => {
    const prefix = 'é'.repeat(36)

    async function legacyUser(password: string) {
        const user = await prisma.user.create({
            data: {
                email: testEmail('legacy'),
                firstName: 'Heredada',
                passwordHash: await bcrypt.hash(password, 4),
                passwordHashVersion: 1,
                status: 'ACTIVE',
            },
            select: { email: true, id: true },
        })

        createdUsers.push(user.id)

        return user
    }

    it('does not open a session with the exact 72-byte prefix of a legacy long password', async () => {
        const user = await legacyUser(`${prefix}sufijo-fuera-de-bcrypt`)

        for (const password of [`${prefix}sufijo-fuera-de-bcrypt`, prefix]) {
            const response = await api.client().post('/api/auth/login', { email: user.email, password })

            assert.equal(response.status, 403, `${Buffer.byteLength(password)}-byte input`)
            assert.equal(response.body.code, 'PASSWORD_RESET_REQUIRED')
        }
    })

    it('accepts a 72-byte password whose hash was created under the 72-byte rule', async () => {
        const email = trackEmail()

        await register(email, prefix)

        const verified = await api.client().post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email, password: prefix })

        assert.equal(verified.status, 200)
        assert.equal((await api.client().post('/api/auth/login', { email, password: prefix })).status, 200)
    })

    it('keeps short legacy passwords working', async () => {
        const user = await legacyUser('Clave-corta-10')

        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: 'Clave-corta-10' })).status, 200)
    })
})

// Segunda revisión independiente (RAUTH-01-R2, AUTH-R2-02, RAUTH-03-R2, AUTH-R2-04).
describe('credential provenance after the second review', () => {
    it('does not let a repeated OAuth login activate a password set by a re-registration (RAUTH-01-R2)', async () => {
        const email = trackEmail()
        const sub = randomUUID()

        await oauthPending(email, sub)
        assert.equal((await register(email, 'Clave-intrusa-11')).status, 201)

        // El titular vuelve a entrar con el mismo proveedor y recibe un código nuevo.
        const owner = await oauthPending(email, sub)
        const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })
        const intruder = await api.client().post('/api/auth/login', { email, password: 'Clave-intrusa-11' })

        assert.equal(verified.status, 200, 'the owner activates the account with the provider')
        assert.equal(intruder.status, 401, 'the re-registration password never works')
    })

    it('does not let a password change that checked the old password overwrite a finished recovery (AUTH-R2-02)', async () => {
        const user = await createUser()

        createdUsers.push(user.id)
        await login(api.client(), user)

        const session = await prisma.authSession.findFirstOrThrow({ select: { id: true }, where: { revokedAt: null, userId: user.id } })
        const waiting = barrier()
        const resume = barrier()

        class PausingRepository extends AuthRepository {
            override async changePassword(...args: Parameters<Repository['changePassword']>) {
                waiting.release()
                await resume.reached

                return super.changePassword(...args)
            }
        }

        const staleChange = new AuthService(new PausingRepository())
            .changePassword({ sessionId: session.id, userId: user.id }, { currentPassword: user.password, newPassword: 'Clave-obsoleta-12' })
            .then(
                () => 'completed',
                (error: { code?: string }) => error.code,
            )

        await waiting.reached
        await api.client().post('/api/auth/forgot-password/request', { email: user.email })

        const code = await api.client().post('/api/auth/forgot-password/verify-code', { code: lastCodeSentTo(user.email), email: user.email })
        const reset = await api.client().post('/api/auth/forgot-password/reset', {
            email: user.email,
            password: 'Clave-recuperada-13',
            resetToken: code.body.data.resetToken,
        })

        assert.equal(reset.status, 200)
        resume.release()

        assert.equal(await staleChange, 'CREDENTIALS_CHANGED')
        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: 'Clave-recuperada-13' })).status, 200)
        assert.equal((await api.client().post('/api/auth/login', { email: user.email, password: 'Clave-obsoleta-12' })).status, 401)
    })

    it('does not accept the 71-byte prefix of a legacy password whose 72nd byte is NUL (RAUTH-03-R2)', async () => {
        const prefix = 'x'.repeat(71)
        const user = await prisma.user.create({
            data: {
                email: testEmail('legacy-nul'),
                firstName: 'Heredada',
                passwordHash: await bcrypt.hash(`${prefix}\u0000cola-ignorada`, 4),
                passwordHashVersion: 1,
                status: 'ACTIVE',
            },
            select: { email: true, id: true },
        })

        createdUsers.push(user.id)

        const response = await api.client().post('/api/auth/login', { email: user.email, password: prefix })

        assert.equal(response.status, 403)
        assert.equal(response.body.code, 'PASSWORD_RESET_REQUIRED')
    })

    it('never authenticates an input that contains NUL and never stores a new password with NUL (RAUTH-03-R2)', async () => {
        const stored = 'y'.repeat(71)
        const user = await createUser({ password: stored })

        createdUsers.push(user.id)

        // bcrypt añade un NUL final: «71 bytes + NUL» y «71 bytes» producen el mismo hash.
        const withNul = await api.client().post('/api/auth/login', { email: user.email, password: `${stored}\u0000` })
        const registration = await register(trackEmail(), 'Clave-con-nulo\u0000-14')

        assert.equal(withNul.status, 401)
        assert.equal(registration.status, 422)
    })

    it('resends a code an OAuth-only account can use without a password after the previous one was revoked (AUTH-R2-04)', async () => {
        const email = trackEmail()
        const owner = await oauthPending(email)
        const code = lastCodeSentTo(email)
        const wrong = code === '000000' ? '111111' : '000000'

        for (let attempt = 0; attempt < 5; attempt += 1) {
            assert.equal((await owner.post('/api/auth/verify-email-code', { code: wrong, email })).status, 401)
        }

        assert.equal((await owner.post('/api/auth/resend-email-code', { email })).status, 200)

        const verified = await owner.post('/api/auth/verify-email-code', { code: lastCodeSentTo(email), email })

        assert.equal(verified.status, 200)
    })
})
