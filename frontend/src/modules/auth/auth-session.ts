'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { getBrowserSession } from './browser-session'
import type { SessionSnapshot } from './session-manager'

const SERVER_SNAPSHOT: SessionSnapshot = { session: null, status: 'unknown' }

function subscribe(listener: () => void) {
    return getBrowserSession().subscribe(listener)
}

function getSnapshot() {
    return getBrowserSession().getSnapshot()
}

export async function resolveAuthSession() {
    try {
        return await getBrowserSession().resolve()
    } catch {
        return null
    }
}

export function useResolvedAuthSession() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)

    useEffect(() => {
        if (snapshot.status === 'unknown') {
            void resolveAuthSession()
        }
    }, [snapshot.status])

    const authenticated = snapshot.status === 'authenticated' && snapshot.session !== null

    return {
        isAuthenticated: authenticated,
        isLoading: snapshot.status === 'unknown',
        retryAfterSeconds: snapshot.retryAfterSeconds,
        session: snapshot.session,
        status: snapshot.status,
    }
}
