import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../../config/env.ts'
import { UnauthorizedError } from '../../utils/app-error.ts'
import type { AccessTokenClaims, RefreshTokenClaims } from './auth.types.ts'

const textEncoder = new TextEncoder()
const accessSecret = textEncoder.encode(env.JWT_ACCESS_SECRET)
const refreshSecret = textEncoder.encode(env.JWT_REFRESH_SECRET)

function parseDurationToSeconds(value: string) {
    const match = value.trim().match(/^(\d+)(s|m|h|d)$/i)

    if (!match) {
        throw new Error(
            `Unsupported duration "${value}". Use a value like 15m, 1h, or 7d.`,
        )
    }

    const amount = Number(match[1])
    const unit = match[2].toLowerCase()

    if (unit === 's') {
        return amount
    }

    if (unit === 'm') {
        return amount * 60
    }

    if (unit === 'h') {
        return amount * 60 * 60
    }

    return amount * 60 * 60 * 24
}

function assertSubject(value: unknown) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new UnauthorizedError('Invalid token subject.')
    }

    return value
}

function assertStringClaim(value: unknown, claimName: string) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new UnauthorizedError(`Invalid token claim: ${claimName}.`)
    }

    return value
}

export function createOpaqueToken() {
    return randomBytes(32).toString('base64url')
}

export function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

export async function signAccessToken(input: {
    role: AccessTokenClaims['role']
    userId: string
}) {
    const accessTokenExpiresInSeconds = parseDurationToSeconds(env.JWT_ACCESS_TTL)
    const issuedAt = Math.floor(Date.now() / 1000)
    const expirationTime = issuedAt + accessTokenExpiresInSeconds
    const accessToken = await new SignJWT({
        role: input.role,
        tokenType: 'access',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(issuedAt)
        .setSubject(input.userId)
        .setExpirationTime(expirationTime)
        .sign(accessSecret)

    return {
        accessToken,
        accessTokenExpiresInSeconds,
    }
}

export async function signRefreshToken(input: {
    role: RefreshTokenClaims['role']
    sessionId: string
    userId: string
}) {
    const refreshTokenExpiresInSeconds = parseDurationToSeconds(env.JWT_REFRESH_TTL)
    const issuedAt = Math.floor(Date.now() / 1000)
    const expirationTime = issuedAt + refreshTokenExpiresInSeconds
    const refreshToken = await new SignJWT({
        role: input.role,
        tokenType: 'refresh',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(issuedAt)
        .setJti(input.sessionId)
        .setSubject(input.userId)
        .setExpirationTime(expirationTime)
        .sign(refreshSecret)

    return {
        refreshToken,
        refreshTokenExpiresAt: new Date(expirationTime * 1000),
        refreshTokenMaxAgeMs: refreshTokenExpiresInSeconds * 1000,
    }
}

export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, accessSecret, {
            algorithms: ['HS256'],
        })

        return {
            role: assertStringClaim(payload.role, 'role') as AccessTokenClaims['role'],
            tokenType: assertStringClaim(
                payload.tokenType,
                'tokenType',
            ) as AccessTokenClaims['tokenType'],
            userId: assertSubject(payload.sub),
        }
    } catch {
        throw new UnauthorizedError('Invalid or expired access token.')
    }
}

export async function verifyRefreshToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, refreshSecret, {
            algorithms: ['HS256'],
        })

        return {
            role: assertStringClaim(
                payload.role,
                'role',
            ) as RefreshTokenClaims['role'],
            sessionId: assertStringClaim(payload.jti, 'jti'),
            tokenType: assertStringClaim(
                payload.tokenType,
                'tokenType',
            ) as RefreshTokenClaims['tokenType'],
            userId: assertSubject(payload.sub),
        }
    } catch {
        throw new UnauthorizedError('Invalid or expired refresh token.')
    }
}
