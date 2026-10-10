import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { SignJWT } from 'jose'
import {
    cookieValue,
    createUser,
    deleteUsers,
    login,
    prisma,
    startApi,
    stopDatabase,
    type TestApi,
    type TestUser,
} from '../support/harness.ts'

let api: TestApi
const createdUsers: string[] = []

async function newUser() {
    const user = await createUser()

    createdUsers.push(user.id)

    return user
}

async function signedIn(user: TestUser) {
    const client = api.client()
    const accessToken = await login(client, user)

    return { accessToken, client }
}

before(async () => {
    api = await startApi()
})

after(async () => {
    await deleteUsers(...createdUsers)
    await api.close()
    await stopDatabase()
})

describe('refresh rotation (AUTH-03)', () => {
    it('lets exactly one of two simultaneous refreshes with the same cookie rotate the session', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const tabB = api.client(client.ip)

        tabB.cookies.set('refresh_token', cookieValue(client)!)

        const [first, second] = await Promise.all([client.post('/api/auth/refresh'), tabB.post('/api/auth/refresh')])
        const statuses = [first.status, second.status].sort()

        assert.deepEqual(statuses, [200, 409], 'one rotation wins, the concurrent duplicate is told to retry')

        const loser = first.status === 409 ? first : second

        assert.equal(loser.body.code, 'REFRESH_TOKEN_ROTATED')

        const openTokens = await prisma.refreshToken.count({
            where: { revokedAt: null, session: { userId: user.id }, usedAt: null },
        })

        assert.equal(openTokens, 1, 'a single valid branch remains')
    })

    it('keeps the session alive after a concurrent retry: the loser retries with the new cookie', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const staleCookie = cookieValue(client)!
        const winner = await client.post('/api/auth/refresh')
        const stale = api.client(client.ip)

        stale.cookies.set('refresh_token', staleCookie)

        const retryWithOldCookie = await stale.post('/api/auth/refresh')
        const retryWithNewCookie = await client.post('/api/auth/refresh')

        assert.equal(winner.status, 200)
        assert.equal(retryWithOldCookie.status, 409)
        assert.equal(retryWithNewCookie.status, 200)
    })

    it('treats a rotated token replayed after the grace window as reuse and closes only that family', async () => {
        const user = await newUser()
        const laptop = await signedIn(user)
        const phone = await signedIn(user)
        const stolenCookie = cookieValue(laptop.client)!

        assert.equal((await laptop.client.post('/api/auth/refresh')).status, 200)
        await prisma.refreshToken.updateMany({
            data: { usedAt: new Date(Date.now() - 120_000) },
            where: { session: { userId: user.id }, usedAt: { not: null } },
        })

        const attacker = api.client()

        attacker.cookies.set('refresh_token', stolenCookie)

        const replay = await attacker.post('/api/auth/refresh')
        const laptopAfter = await laptop.client.post('/api/auth/refresh')
        const phoneAfter = await phone.client.post('/api/auth/refresh')

        assert.equal(replay.status, 401)
        assert.equal(replay.body.code, 'SESSION_REVOKED')
        assert.equal(laptopAfter.status, 401, 'the compromised family is closed')
        assert.equal(phoneAfter.status, 200, 'an independent device keeps its session')
    })
})

describe('old refresh tokens (AUTH-04)', () => {
    it('does not let an expired refresh token revoke anything, even if its row still exists', async () => {
        const user = await newUser()
        const old = await signedIn(user)
        const oldCookie = cookieValue(old.client)!

        await prisma.authSession.updateMany({
            data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
            where: { userId: user.id },
        })

        const current = await signedIn(user)
        const expiredToken = await new SignJWT({ sid: '00000000-0000-4000-8000-000000000000' })
            .setProtectedHeader({ alg: 'HS256', typ: 'rt+jwt' })
            .setIssuer('fintrack-os')
            .setAudience('fintrack-refresh')
            .setSubject(user.id)
            .setJti('00000000-0000-4000-8000-000000000001')
            .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
            .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
            .sign(new TextEncoder().encode(process.env.JWT_REFRESH_SECRET))

        for (const cookie of [oldCookie, expiredToken]) {
            const replayer = api.client()

            replayer.cookies.set('refresh_token', cookie)
            assert.equal((await replayer.post('/api/auth/refresh')).status, 401)
        }

        assert.equal((await current.client.get('/api/auth/me', { token: current.accessToken })).status, 200)
        assert.equal((await current.client.post('/api/auth/refresh')).status, 200)
    })
})

describe('bearer invalidation (AUTH-06)', () => {
    it('logout invalidates the access token of that session but not other devices', async () => {
        const user = await newUser()
        const laptop = await signedIn(user)
        const phone = await signedIn(user)

        assert.equal((await laptop.client.post('/api/auth/logout', {}, { token: laptop.accessToken })).status, 200)
        assert.equal((await laptop.client.get('/api/auth/me', { token: laptop.accessToken })).status, 401)
        assert.equal((await laptop.client.get('/api/finance/workbook', { token: laptop.accessToken })).status, 401)
        assert.equal((await phone.client.get('/api/auth/me', { token: phone.accessToken })).status, 200)
    })

    it('logout-all invalidates every issued access token and refresh cookie', async () => {
        const user = await newUser()
        const laptop = await signedIn(user)
        const phone = await signedIn(user)

        assert.equal((await laptop.client.post('/api/auth/logout-all', {}, { token: laptop.accessToken })).status, 200)

        for (const device of [laptop, phone]) {
            assert.equal((await device.client.get('/api/auth/me', { token: device.accessToken })).status, 401)
        }

        assert.equal((await phone.client.post('/api/auth/refresh')).status, 401)
    })
})

describe('session lifetime (AUTH-07)', () => {
    it('refuses to renew past the absolute limit even while the user stays active', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)

        assert.equal((await client.post('/api/auth/refresh')).status, 200)
        await prisma.authSession.updateMany({
            data: { absoluteExpiresAt: new Date(Date.now() - 1000) },
            where: { userId: user.id },
        })

        const refresh = await client.post('/api/auth/refresh')

        assert.equal(refresh.status, 401)
        assert.equal(refresh.body.code, 'SESSION_EXPIRED')
    })

    it('never extends a renewal beyond the absolute expiry', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const absolute = new Date(Date.now() + 60 * 60 * 1000)

        await prisma.authSession.updateMany({ data: { absoluteExpiresAt: absolute }, where: { userId: user.id } })
        assert.equal((await client.post('/api/auth/refresh')).status, 200)

        const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } })
        const newestToken = await prisma.refreshToken.findFirstOrThrow({
            orderBy: { createdAt: 'desc' },
            where: { sessionId: session.id },
        })

        assert.ok(session.idleExpiresAt <= absolute)
        assert.ok(newestToken.expiresAt <= absolute)
    })

    it('purges a user’s long-expired sessions when a new one starts', async () => {
        const user = await newUser()

        await signedIn(user)
        await prisma.authSession.updateMany({
            data: { absoluteExpiresAt: new Date('2020-01-01'), idleExpiresAt: new Date('2020-01-01') },
            where: { userId: user.id },
        })
        await signedIn(user)

        assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 1)
    })
})

describe('JWT claims (AUTH-13)', () => {
    async function signWith(secret: string, claims: { aud?: string; exp?: number | null; typ?: string }, user: TestUser) {
        const builder = new SignJWT({ role: 'USER', sid: '00000000-0000-4000-8000-000000000000' })
            .setProtectedHeader({ alg: 'HS256', typ: claims.typ ?? 'at+jwt' })
            .setIssuer('fintrack-os')
            .setAudience(claims.aud ?? 'fintrack-api')
            .setSubject(user.id)
            .setJti('jti')
            .setIssuedAt()

        if (claims.exp !== null) {
            builder.setExpirationTime(claims.exp ?? Math.floor(Date.now() / 1000) + 600)
        }

        return builder.sign(new TextEncoder().encode(secret))
    }

    it('rejects tampered, expired, claim-less and cross-type tokens', async () => {
        const user = await newUser()
        const { accessToken, client } = await signedIn(user)
        const [header, payload, signature] = accessToken.split('.')
        const tampered = `${header}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), role: 'ADMIN' })).toString('base64url')}.${signature}`
        const accessSecret = process.env.JWT_ACCESS_SECRET!
        const candidates = {
            expired: await signWith(accessSecret, { exp: Math.floor(Date.now() / 1000) - 10 }, user),
            noExpiry: await signWith(accessSecret, { exp: null }, user),
            refreshAsBearer: cookieValue(client)!,
            tampered,
            wrongAudience: await signWith(accessSecret, { aud: 'fintrack-refresh' }, user),
            wrongType: await signWith(accessSecret, { typ: 'rt+jwt' }, user),
        }

        for (const [label, token] of Object.entries(candidates)) {
            const response = await client.get('/api/auth/me', { token })

            assert.equal(response.status, 401, `${label} must be rejected`)
        }
    })

    it('rejects an access token used as the refresh cookie', async () => {
        const user = await newUser()
        const { accessToken } = await signedIn(user)
        const client = api.client()

        client.cookies.set('refresh_token', accessToken)
        assert.equal((await client.post('/api/auth/refresh')).status, 401)
    })
})

describe('cookie parsing (AUTH-12)', () => {
    it('ignores an unrelated malformed cookie and still refreshes', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const response = await client.post('/api/auth/refresh', undefined, {
            headers: { Cookie: `harmless=%E0%A4%A; refresh_token=${cookieValue(client)}` },
        })

        assert.equal(response.status, 200)
    })

    it('answers a malformed refresh cookie with a controlled 401, not a 500', async () => {
        const client = api.client()
        const response = await client.post('/api/auth/refresh', undefined, { headers: { Cookie: 'refresh_token=%E0%A4%A' } })

        assert.equal(response.status, 401)
        assert.equal(response.body.success, false)
    })
})

describe('refresh cookie contract', () => {
    it('sets an HttpOnly, SameSite=Lax cookie scoped to /api/auth and never returns the refresh token in the body', async () => {
        const user = await newUser()
        const client = api.client()
        const response = await client.post('/api/auth/login', { email: user.email, password: user.password })
        const setCookie = response.headers.getSetCookie().find((header) => header.startsWith('refresh_token='))!

        assert.match(setCookie, /HttpOnly/i)
        assert.match(setCookie, /SameSite=Lax/i)
        assert.match(setCookie, /Path=\/api\/auth/i)
        assert.equal('refreshToken' in response.body.data, false)
        assert.equal(response.headers.get('cache-control'), 'no-store')
    })

    it('rejects a refresh coming from a cross-site page (CSRF)', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const crossSite = await client.post('/api/auth/refresh', undefined, {
            headers: { 'Sec-Fetch-Site': 'cross-site' },
            withOrigin: false,
        })
        const foreignOrigin = await client.post('/api/auth/refresh', undefined, { headers: { Origin: 'https://evil.example' } })

        assert.equal(crossSite.status, 403)
        assert.equal(foreignOrigin.status, 403)
    })

    it('ignores refresh tokens sent in the body or headers', async () => {
        const user = await newUser()
        const { client } = await signedIn(user)
        const token = cookieValue(client)!
        const outsider = api.client()

        assert.equal((await outsider.post('/api/auth/refresh', { refreshToken: token })).status, 422)
        assert.equal((await outsider.post('/api/auth/refresh', undefined, { headers: { 'x-refresh-token': token } })).status, 401)
    })
})
