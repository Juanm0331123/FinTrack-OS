'use client'

import { refreshSession } from './auth.api'
import { createSessionManager, type SessionChannel, type SessionManager } from './session-manager'

const SESSION_HINT_KEY = 'fintrack.auth.has-session'
const LEGACY_SESSION_KEY = 'fintrack.auth.session'
const CHANNEL_NAME = 'fintrack-auth'
const LOCK_NAME = 'fintrack-auth-refresh'

function readHint() {
    try {
        // Versiones anteriores guardaban el access token aquí: se elimina y solo queda la marca.
        window.localStorage.removeItem('fintrack.auth.pending-verification')

        if (window.localStorage.getItem(LEGACY_SESSION_KEY) !== null) {
            window.localStorage.removeItem(LEGACY_SESSION_KEY)
            window.localStorage.setItem(SESSION_HINT_KEY, '1')
        }

        return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
    } catch {
        return false
    }
}

function writeHint(present: boolean) {
    try {
        if (present) {
            window.localStorage.setItem(SESSION_HINT_KEY, '1')
        } else {
            window.localStorage.removeItem(SESSION_HINT_KEY)
        }
    } catch {
        // Sin almacenamiento (modo privado estricto) la app sigue funcionando en esta pestaña.
    }
}

function createChannel(): SessionChannel | undefined {
    if (typeof BroadcastChannel === 'undefined') {
        return undefined
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)

    return {
        post: (message) => channel.postMessage(message),
        subscribe: (handler) => {
            channel.onmessage = (event: MessageEvent) => handler(event.data)
        },
    }
}

function withBrowserLock<T>(work: () => Promise<T>) {
    if (typeof navigator === 'undefined' || !navigator.locks) {
        return work()
    }

    return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, work) as Promise<T>
}

let browserSession: SessionManager | null = null

export function getBrowserSession() {
    browserSession ??= createSessionManager({
        channel: typeof window === 'undefined' ? undefined : createChannel(),
        hint: { get: () => (typeof window === 'undefined' ? false : readHint()), set: writeHint },
        now: () => Date.now(),
        refresh: refreshSession,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        withLock: withBrowserLock,
    })

    return browserSession
}
