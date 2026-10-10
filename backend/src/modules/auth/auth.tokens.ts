import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { durationToSeconds } from '../../config/duration.ts'
import { env } from '../../config/env.ts'
import { UnauthorizedError } from '../../utils/app-error.ts'
import type { AccessTokenClaims, RefreshTokenClaims } from './auth.types.ts'

// JWT firmados con HS256 y secretos distintos por tipo. La verificación exige algoritmo, emisor,
// audiencia, tipo de cabecera y claims de tiempo e identidad: un token de refresh no sirve como
// bearer ni al revés, y un token sin `exp` se rechaza. Los claims no son confidenciales (ids y
// rol), por lo que no se cifran.

const textEncoder = new TextEncoder()
const accessSecret = textEncoder.encode(env.JWT_ACCESS_SECRET)
const refreshSecret = textEncoder.encode(env.JWT_REFRESH_SECRET)

const ACCESS_TOKEN_TYPE = 'at+jwt'
const REFRESH_TOKEN_TYPE = 'rt+jwt'

const accessClaimsSchema = z.object({
    jti: z.string().min(1),
    role: z.enum(['USER', 'ADMIN']),
    sid: z.uuid(),
    sub: z.uuid(),
})

const refreshClaimsSchema = z.object({
    jti: z.uuid(),
    sid: z.uuid(),
    sub: z.uuid(),
})

export function createOpaqueToken() {
    return randomBytes(32).toString('base64url')
}

export function createNumericCode(length = 6) {
    return Array.from({ length }, () => randomInt(0, 10).toString()).join('')
}

export function createTokenSalt() {
    return randomBytes(16).toString('hex')
}

export function hashToken(token: string, salt?: string) {
    return createHash('sha256')
        .update(salt ? `${salt}:${token}` : token)
        .digest('hex')
}

export function tokenHashMatches(token: string, expectedHash: string, salt?: string | null) {
    const actual = Buffer.from(hashToken(token, salt ?? undefined), 'hex')
    const expected = Buffer.from(expectedHash, 'hex')

    return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function accessTokenLifetimeSeconds() {
    return durationToSeconds(env.JWT_ACCESS_TTL)
}

export async function signAccessToken(input: { role: AccessTokenClaims['role']; sessionId: string; userId: string }) {
    const accessTokenExpiresInSeconds = accessTokenLifetimeSeconds()
    const issuedAt = Math.floor(Date.now() / 1000)
    const accessToken = await new SignJWT({ role: input.role, sid: input.sessionId })
        .setProtectedHeader({ alg: 'HS256', typ: ACCESS_TOKEN_TYPE })
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_ACCESS_AUDIENCE)
        .setSubject(input.userId)
        .setJti(randomUUID())
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + accessTokenExpiresInSeconds)
        .sign(accessSecret)

    return { accessToken, accessTokenExpiresInSeconds }
}

export async function signRefreshToken(input: { expiresAt: Date; sessionId: string; tokenId: string; userId: string }) {
    return new SignJWT({ sid: input.sessionId })
        .setProtectedHeader({ alg: 'HS256', typ: REFRESH_TOKEN_TYPE })
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_REFRESH_AUDIENCE)
        .setSubject(input.userId)
        .setJti(input.tokenId)
        .setIssuedAt()
        .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
        .sign(refreshSecret)
}

const INVALID_SESSION_MESSAGE = 'Tu sesión expiró. Vuelve a iniciar sesión.'

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
        const { payload } = await jwtVerify(token, accessSecret, {
            algorithms: ['HS256'],
            audience: env.JWT_ACCESS_AUDIENCE,
            issuer: env.JWT_ISSUER,
            requiredClaims: ['exp', 'iat', 'jti', 'sub'],
            typ: ACCESS_TOKEN_TYPE,
        })
        const claims = accessClaimsSchema.parse(payload)

        return { role: claims.role, sessionId: claims.sid, userId: claims.sub }
    } catch {
        throw new UnauthorizedError(INVALID_SESSION_MESSAGE, 'SESSION_INVALID')
    }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    try {
        const { payload } = await jwtVerify(token, refreshSecret, {
            algorithms: ['HS256'],
            audience: env.JWT_REFRESH_AUDIENCE,
            issuer: env.JWT_ISSUER,
            requiredClaims: ['exp', 'iat', 'jti', 'sub'],
            typ: REFRESH_TOKEN_TYPE,
        })
        const claims = refreshClaimsSchema.parse(payload)

        return { sessionId: claims.sid, tokenId: claims.jti, userId: claims.sub }
    } catch {
        throw new UnauthorizedError(INVALID_SESSION_MESSAGE, 'SESSION_INVALID')
    }
}
