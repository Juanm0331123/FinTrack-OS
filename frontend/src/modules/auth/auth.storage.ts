'use client'

import type { PendingVerificationState } from './auth.types'

// Estado temporal de flujos de verificación. Va en sessionStorage (dura lo que la pestaña) y
// nunca contiene tokens de sesión: el access token vive solo en memoria (session-manager.ts).
const PENDING_VERIFICATION_STORAGE_KEY = 'fintrack.auth.pending-verification'
const PASSWORD_RESET_HANDOFF_KEY = 'fintrack.auth.password-reset-required'

function storage() {
    try {
        return typeof window === 'undefined' ? null : window.sessionStorage
    } catch {
        return null
    }
}

function readJson<T>(key: string) {
    const raw = storage()?.getItem(key)

    if (!raw) {
        return null
    }

    try {
        return JSON.parse(raw) as T
    } catch {
        storage()?.removeItem(key)
        return null
    }
}

export function savePendingVerification(state: PendingVerificationState) {
    storage()?.setItem(PENDING_VERIFICATION_STORAGE_KEY, JSON.stringify(state))
}

export function loadPendingVerification() {
    return readJson<PendingVerificationState>(PENDING_VERIFICATION_STORAGE_KEY)
}

export function clearPendingVerification() {
    storage()?.removeItem(PENDING_VERIFICATION_STORAGE_KEY)
}

export function isPendingVerificationExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now()
}

export type PasswordResetHandoff = {
    email: string
    expiresAt: string
}

// El login detectó una contraseña heredada de más de 72 bytes y el backend ya envió un código de
// recuperación: la página de recuperación continúa directamente en el paso de verificación.
export function savePasswordResetHandoff(state: PasswordResetHandoff) {
    storage()?.setItem(PASSWORD_RESET_HANDOFF_KEY, JSON.stringify(state))
}

export function takePasswordResetHandoff() {
    const state = readJson<PasswordResetHandoff>(PASSWORD_RESET_HANDOFF_KEY)

    storage()?.removeItem(PASSWORD_RESET_HANDOFF_KEY)

    return state
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
