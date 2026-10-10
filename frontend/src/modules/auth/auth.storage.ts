'use client'

import type { PendingVerificationSource, PendingVerificationState } from './auth.types'

// Estado temporal de flujos de verificación. Va en sessionStorage (dura lo que la pestaña) y
// nunca contiene tokens de sesión: el access token vive solo en memoria (session-manager.ts).
//
// El storage es una ayuda opcional para sobrevivir a una recarga: cualquier operación puede
// fallar (modo privado, cuota, política del navegador) y entonces el flujo sigue en memoria. Lo
// leído se valida: un valor incompatible, de otra versión o vencido se descarta.
const PENDING_VERIFICATION_STORAGE_KEY = 'fintrack.auth.pending-verification'
const PASSWORD_RESET_HANDOFF_KEY = 'fintrack.auth.password-reset-required'

const SOURCES: readonly PendingVerificationSource[] = ['login', 'register', 'google', 'github']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

function storage() {
    try {
        return typeof window === 'undefined' ? null : window.sessionStorage
    } catch {
        return null
    }
}

function safely<T>(operation: (store: Storage) => T, fallback: T): T {
    try {
        const store = storage()

        return store ? operation(store) : fallback
    } catch {
        return fallback
    }
}

function remove(key: string) {
    safely((store) => store.removeItem(key), undefined)
}

// Lee y valida; lo que no pasa la validación se borra para no volver a romper la página.
function readValid<T>(key: string, parse: (value: unknown) => T | null): T | null {
    const raw = safely((store) => store.getItem(key), null)

    if (raw === null) {
        return null
    }

    let parsed: T | null = null

    try {
        parsed = parse(JSON.parse(raw))
    } catch {
        parsed = null
    }

    if (parsed === null) {
        remove(key)
    }

    return parsed
}

function write(key: string, value: unknown) {
    return safely((store) => {
        store.setItem(key, JSON.stringify(value))

        return true
    }, false)
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFutureDate(value: unknown): value is string {
    return typeof value === 'string' && Number.isFinite(new Date(value).getTime()) && !isPendingVerificationExpired(value)
}

function isEmail(value: unknown): value is string {
    return typeof value === 'string' && EMAIL_PATTERN.test(value)
}

function parsePendingVerification(value: unknown): PendingVerificationState | null {
    if (
        !isRecord(value) ||
        !isEmail(value.email) ||
        !isFutureDate(value.expiresAt) ||
        !SOURCES.includes(value.source as PendingVerificationSource)
    ) {
        return null
    }

    return {
        email: value.email,
        expiresAt: value.expiresAt,
        source: value.source as PendingVerificationSource,
        ...(typeof value.verificationCode === 'string' ? { verificationCode: value.verificationCode } : {}),
    }
}

// Devuelve false si no se pudo persistir: el flujo continúa igual con el estado en memoria.
export function savePendingVerification(state: PendingVerificationState) {
    return write(PENDING_VERIFICATION_STORAGE_KEY, state)
}

export function loadPendingVerification() {
    return readValid(PENDING_VERIFICATION_STORAGE_KEY, parsePendingVerification)
}

export function clearPendingVerification() {
    remove(PENDING_VERIFICATION_STORAGE_KEY)
}

export function isPendingVerificationExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now()
}

export type PasswordResetHandoff = {
    email: string
    expiresAt: string
}

function parseHandoff(value: unknown): PasswordResetHandoff | null {
    return isRecord(value) && isEmail(value.email) && isFutureDate(value.expiresAt)
        ? { email: value.email, expiresAt: value.expiresAt }
        : null
}

// El login detectó una contraseña heredada de más de 72 bytes y el backend ya envió un código de
// recuperación: la página de recuperación continúa directamente en el paso de verificación. El
// handoff se lee después del montaje (no en render) y se conserva hasta que el flujo termina o se
// reinicia, para que una recarga no pierda el paso.
export function savePasswordResetHandoff(state: PasswordResetHandoff) {
    return write(PASSWORD_RESET_HANDOFF_KEY, state)
}

export function peekPasswordResetHandoff() {
    return readValid(PASSWORD_RESET_HANDOFF_KEY, parseHandoff)
}

export function clearPasswordResetHandoff() {
    remove(PASSWORD_RESET_HANDOFF_KEY)
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
