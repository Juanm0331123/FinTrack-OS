'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { refreshSession } from './auth.api'
import {
    clearAuthSession,
    getAuthSessionSnapshot,
    isAuthSessionActive,
    loadAuthSession,
    parseAuthSessionSnapshot,
    saveAuthSession,
    subscribeAuthSessionStore,
} from './auth.storage'
import type { AuthSession } from './auth.types'

type ResolvedAuthSessionState =
    | {
          session: null
          status: 'idle' | 'loading' | 'unauthenticated'
      }
    | {
          session: AuthSession
          status: 'authenticated'
      }

export async function resolveAuthSession() {
    const storedSession = loadAuthSession()

    if (isAuthSessionActive(storedSession)) {
        return storedSession
    }

    try {
        const refreshedSession = await refreshSession()
        saveAuthSession(refreshedSession)

        return loadAuthSession()
    } catch {
        if (storedSession) {
            clearAuthSession()
        }

        return null
    }
}

export function useResolvedAuthSession() {
    const sessionSnapshot = useSyncExternalStore(
        subscribeAuthSessionStore,
        getAuthSessionSnapshot,
        () => '',
    )
    const parsedSession = parseAuthSessionSnapshot(sessionSnapshot)
    const activeSession = isAuthSessionActive(parsedSession) ? parsedSession : null
    const hasFailedRefreshRef = useRef(false)
    const [state, setState] = useState<ResolvedAuthSessionState>(() =>
        activeSession
            ? {
                  session: activeSession,
                  status: 'authenticated',
              }
            : {
                  session: null,
                  status: 'idle',
              },
    )

    useEffect(() => {
        if (activeSession) {
            hasFailedRefreshRef.current = false
            return
        }

        if (hasFailedRefreshRef.current) {
            return
        }

        let cancelled = false

        setState((currentState) =>
            currentState.status === 'loading'
                ? currentState
                : {
                      session: null,
                      status: 'loading',
                  },
        )

        void resolveAuthSession().then((session) => {
            if (cancelled) {
                return
            }

            if (session && isAuthSessionActive(session)) {
                hasFailedRefreshRef.current = false
                setState({
                    session,
                    status: 'authenticated',
                })
                return
            }

            hasFailedRefreshRef.current = true
            setState({
                session: null,
                status: 'unauthenticated',
            })
        })

        return () => {
            cancelled = true
        }
    }, [activeSession, sessionSnapshot])

    if (activeSession) {
        return {
            isAuthenticated: true,
            isLoading: false,
            session: activeSession,
            status: 'authenticated' as const,
        }
    }

    if (state.status === 'authenticated') {
        return {
            isAuthenticated: true,
            isLoading: false,
            session: state.session,
            status: state.status,
        }
    }

    const isLoading = state.status === 'idle' || state.status === 'loading'

    return {
        isAuthenticated: false,
        isLoading,
        session: state.session,
        status: state.status,
    }
}
