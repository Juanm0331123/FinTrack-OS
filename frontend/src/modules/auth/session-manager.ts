import { AuthApiError } from './auth.api'
import type { AuthenticatedResponse, AuthSession } from './auth.types'

// Sesión del navegador. El access token vive solo en memoria: no se guarda en localStorage ni
// sessionStorage, así un XSS no encuentra un token persistente que robar. Lo único persistente es
// una marca sin secretos ("hubo sesión") para saber si vale la pena llamar a /auth/refresh al
// cargar la página; el refresh token sigue en la cookie HttpOnly.
//
// Renovación coordinada:
// - en una pestaña, todas las peticiones comparten una sola renovación en curso;
// - entre pestañas, un lock exclusivo (Web Locks) serializa la renovación y un BroadcastChannel
//   reparte la sesión nueva, así las demás pestañas no gastan la misma cookie;
// - 401/403 cierran la sesión; 409 (otra pestaña rotó la cookie) se reintenta; 429 respeta
//   Retry-After; 5xx y fallos de red conservan la sesión y se reintentan un número acotado de veces.

const REFRESH_MARGIN_MS = 30_000
const MAX_REFRESH_ATTEMPTS = 3

export type SessionStatus = 'authenticated' | 'unauthenticated' | 'unavailable' | 'unknown'

export type SessionSnapshot = {
    retryAfterSeconds?: number
    session: AuthSession | null
    status: SessionStatus
}

export class SessionUnavailableError extends Error {
    readonly retryAfterSeconds?: number

    constructor(message: string, retryAfterSeconds?: number) {
        super(message)
        this.name = 'SessionUnavailableError'
        this.retryAfterSeconds = retryAfterSeconds
    }
}

type ChannelMessage = { session: AuthSession; type: 'session' } | { type: 'signed-out' }

export type SessionChannel = {
    post(message: ChannelMessage): void
    subscribe(handler: (message: unknown) => void): void
}

export type SessionManagerDeps = {
    channel?: SessionChannel
    hint: { get(): boolean; set(present: boolean): void }
    now: () => number
    refresh: () => Promise<AuthenticatedResponse>
    sleep: (ms: number) => Promise<void>
    withLock?: <T>(work: () => Promise<T>) => Promise<T>
}

function isMessage(value: unknown): value is ChannelMessage {
    return typeof value === 'object' && value !== null && 'type' in value
}

function retryAfterOf(error: AuthApiError) {
    const seconds = Number(error.details?.retryAfterSeconds ?? error.retryAfterSeconds)

    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

export function createSessionManager(deps: SessionManagerDeps) {
    let snapshot: SessionSnapshot = { session: null, status: 'unknown' }
    let refreshInFlight: Promise<AuthSession | null> | null = null
    const listeners = new Set<() => void>()

    function publish(next: SessionSnapshot) {
        snapshot = next

        for (const listener of listeners) {
            listener()
        }
    }

    function toSession(response: AuthenticatedResponse): AuthSession {
        return {
            accessToken: response.accessToken,
            accessTokenExpiresAt: new Date(deps.now() + response.accessTokenExpiresInSeconds * 1000).toISOString(),
            user: response.user,
        }
    }

    function isFresh(session: AuthSession | null): session is AuthSession {
        return Boolean(session) && new Date(session!.accessTokenExpiresAt).getTime() - deps.now() > REFRESH_MARGIN_MS
    }

    function adopt(session: AuthSession, broadcast: boolean) {
        deps.hint.set(true)
        publish({ session, status: 'authenticated' })

        if (broadcast) {
            deps.channel?.post({ session, type: 'session' })
        }
    }

    function signOut(broadcast: boolean) {
        deps.hint.set(false)
        publish({ session: null, status: 'unauthenticated' })

        if (broadcast) {
            deps.channel?.post({ type: 'signed-out' })
        }
    }

    deps.channel?.subscribe((message) => {
        if (!isMessage(message)) {
            return
        }

        if (message.type === 'session') {
            adopt(message.session, false)
        } else {
            signOut(false)
        }
    })

    async function refreshWithRetry(): Promise<AuthSession | null> {
        let lastError: unknown

        for (let attempt = 0; attempt < MAX_REFRESH_ATTEMPTS; attempt += 1) {
            // Otra pestaña pudo renovar mientras esperábamos el lock: se reutiliza su sesión.
            if (isFresh(snapshot.session)) {
                return snapshot.session
            }

            try {
                const session = toSession(await deps.refresh())

                adopt(session, true)

                return session
            } catch (error) {
                lastError = error

                if (error instanceof AuthApiError) {
                    if (error.status === 401 || error.status === 403) {
                        signOut(true)

                        return null
                    }

                    if (error.status === 429) {
                        const retryAfterSeconds = retryAfterOf(error)

                        publish({ retryAfterSeconds, session: snapshot.session, status: 'unavailable' })
                        throw new SessionUnavailableError(error.message, retryAfterSeconds)
                    }
                }

                await deps.sleep(300 * 2 ** attempt)
            }
        }

        publish({ session: snapshot.session, status: 'unavailable' })
        throw new SessionUnavailableError(
            lastError instanceof Error ? lastError.message : 'No pudimos renovar tu sesión. Revisa tu conexión.',
        )
    }

    function refreshCoordinated() {
        refreshInFlight ??= (deps.withLock ? deps.withLock(refreshWithRetry) : refreshWithRetry()).finally(() => {
            refreshInFlight = null
        })

        return refreshInFlight
    }

    return {
        clear() {
            signOut(true)
        },

        async ensureAccessToken(options: { forceRefresh?: boolean } = {}) {
            if (!options.forceRefresh && isFresh(snapshot.session)) {
                return snapshot.session.accessToken
            }

            if (options.forceRefresh && snapshot.session) {
                publish({ session: { ...snapshot.session, accessTokenExpiresAt: new Date(0).toISOString() }, status: snapshot.status })
            }

            return (await refreshCoordinated())?.accessToken ?? null
        },

        getSnapshot() {
            return snapshot
        },

        // Resolución inicial al cargar una página: sin marca de sesión no hay llamada de red.
        async resolve() {
            if (isFresh(snapshot.session)) {
                return snapshot.session
            }

            if (!deps.hint.get()) {
                signOut(false)

                return null
            }

            return refreshCoordinated()
        },

        setSession(response: AuthenticatedResponse) {
            adopt(toSession(response), true)
        },

        subscribe(listener: () => void) {
            listeners.add(listener)

            return () => {
                listeners.delete(listener)
            }
        },
    }
}

export type SessionManager = ReturnType<typeof createSessionManager>
