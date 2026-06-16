'use client'

import { useRef, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'

import { APP_ROUTES } from '@/shared/config/routes'
import { logoutSession } from '../auth/auth.api'
import {
    clearAuthSession,
    clearPendingVerification,
    getAuthSessionSnapshot,
    isAuthSessionExpired,
    parseAuthSessionSnapshot,
    subscribeAuthSessionStore,
} from '../auth/auth.storage'
import { DashboardShell } from './dashboard-shell'

export function DashboardPage() {
    const router = useRouter()
    const redirectedRef = useRef(false)
    const sessionSnapshot = useSyncExternalStore(
        subscribeAuthSessionStore,
        getAuthSessionSnapshot,
        () => '',
    )
    const session = parseAuthSessionSnapshot(sessionSnapshot)
    const sessionExpiresAt = session?.accessTokenExpiresAt ?? ''
    const hasValidSession = Boolean(sessionExpiresAt) && !isAuthSessionExpired(sessionExpiresAt)

    useEffect(() => {
        if (redirectedRef.current) {
            return
        }

        if (!session) {
            redirectedRef.current = true
            router.replace(APP_ROUTES.home)
            return
        }

        if (!sessionExpiresAt) {
            return
        }

        if (isAuthSessionExpired(sessionExpiresAt)) {
            redirectedRef.current = true
            clearAuthSession()
            router.replace(APP_ROUTES.home)
        }
    }, [router, session, sessionExpiresAt])

    async function handleLogout() {
        try {
            await logoutSession(session?.accessToken)
        } catch {
            // Local cleanup still needs to happen even if the cookie was already gone.
        } finally {
            clearAuthSession()
            clearPendingVerification()
            router.replace(APP_ROUTES.home)
        }
    }

    if (!hasValidSession) {
        return null
    }

    return <DashboardShell onLogout={handleLogout} />
}
