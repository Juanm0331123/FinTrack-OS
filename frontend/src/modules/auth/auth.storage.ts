'use client'

import type {
    AuthSession,
    AuthUser,
    PendingVerificationState,
} from './auth.types'

const AUTH_SESSION_STORAGE_KEY = 'fintrack.auth.session'
const PENDING_VERIFICATION_STORAGE_KEY = 'fintrack.auth.pending-verification'
const AUTH_SESSION_EVENT = 'fintrack:auth-session-change'

function isBrowser() {
    return typeof window !== 'undefined'
}

function notifyAuthSessionChange() {
    if (!isBrowser()) {
        return
    }

    window.dispatchEvent(new Event(AUTH_SESSION_EVENT))
}

export function saveAuthSession(input: {
    accessToken: string
    accessTokenExpiresInSeconds: number
    user: AuthUser
}) {
    if (!isBrowser()) {
        return
    }

    const session: AuthSession = {
        accessToken: input.accessToken,
        accessTokenExpiresAt: new Date(
            Date.now() + input.accessTokenExpiresInSeconds * 1000,
        ).toISOString(),
        user: input.user,
    }

    window.localStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify(session),
    )
    notifyAuthSessionChange()
}

export function loadAuthSession() {
    if (!isBrowser()) {
        return null
    }

    const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)

    if (!rawValue) {
        return null
    }

    try {
        return JSON.parse(rawValue) as AuthSession
    } catch {
        window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
        return null
    }
}

export function isAuthSessionExpired(accessTokenExpiresAt: string) {
    return new Date(accessTokenExpiresAt).getTime() <= Date.now()
}

export function getAuthSessionSnapshot() {
    if (!isBrowser()) {
        return ''
    }

    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? ''
}

export function parseAuthSessionSnapshot(rawValue: string) {
    if (!rawValue) {
        return null
    }

    try {
        return JSON.parse(rawValue) as AuthSession
    } catch {
        return null
    }
}

export function subscribeAuthSessionStore(onStoreChange: () => void) {
    if (!isBrowser()) {
        return () => undefined
    }

    const handleStorage = (event: StorageEvent) => {
        if (!event.key || event.key === AUTH_SESSION_STORAGE_KEY) {
            onStoreChange()
        }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(AUTH_SESSION_EVENT, onStoreChange)

    return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(AUTH_SESSION_EVENT, onStoreChange)
    }
}

export function loadActiveAuthSession() {
    const session = parseAuthSessionSnapshot(getAuthSessionSnapshot())

    if (!session) {
        return null
    }

    if (isAuthSessionExpired(session.accessTokenExpiresAt)) {
        clearAuthSession()
        return null
    }

    return session
}

export function clearAuthSession() {
    if (!isBrowser()) {
        return
    }

    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    notifyAuthSessionChange()
}

export function savePendingVerification(state: PendingVerificationState) {
    if (!isBrowser()) {
        return
    }

    window.localStorage.setItem(
        PENDING_VERIFICATION_STORAGE_KEY,
        JSON.stringify(state),
    )
}

export function loadPendingVerification() {
    if (!isBrowser()) {
        return null
    }

    const rawValue = window.localStorage.getItem(PENDING_VERIFICATION_STORAGE_KEY)

    if (!rawValue) {
        return null
    }

    try {
        return JSON.parse(rawValue) as PendingVerificationState
    } catch {
        window.localStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY)
        return null
    }
}

export function clearPendingVerification() {
    if (!isBrowser()) {
        return
    }

    window.localStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY)
}

export function isPendingVerificationExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now()
}

export function maskEmailAddress(email: string) {
    const [localPart, domain] = email.split('@')

    if (!localPart || !domain) {
        return email
    }

    const visibleStart = localPart.slice(0, 2)
    const visibleEnd = localPart.length > 4 ? localPart.slice(-1) : ''
    const maskedLength = Math.max(localPart.length - visibleStart.length - visibleEnd.length, 2)

    return `${visibleStart}${'*'.repeat(maskedLength)}${visibleEnd}@${domain}`
}
