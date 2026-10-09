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
//
// Generaciones: cerrar sesión, iniciar otra o recibir un cambio de otra pestaña abre una generación
// nueva. Una renovación iniciada en una generación anterior no adopta, difunde, cierra ni marca
// nada al terminar: su resultado se descarta (y al cerrar sesión además se cancela la petición).

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

// La sesión vigente ya no es de la cuenta con la que empezó la operación.
export class SessionChangedError extends Error {
    constructor() {
        super('La sesión cambió a otra cuenta. Recarga la página para continuar.')
        this.name = 'SessionChangedError'
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
    refresh: (signal?: AbortSignal) => Promise<AuthenticatedResponse>
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
    let refreshAbort: AbortController | null = null
    let generation = 0
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

    // Abre una generación nueva: las renovaciones en curso quedan obsoletas y la siguiente petición
    // inicia otra en lugar de unirse a la anterior.
    function startGeneration(options: { cancel: boolean }) {
        generation += 1
        refreshInFlight = null

        if (options.cancel) {
            refreshAbort?.abort()
        }

        refreshAbort = null
    }

    function currentSession() {
        return snapshot.status === 'authenticated' ? snapshot.session : null
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
            startGeneration({ cancel: false })
            adopt(message.session, false)
        } else {
            startGeneration({ cancel: true })
            signOut(false)
        }
    })

    async function refreshWithRetry(startedIn: number, signal: AbortSignal): Promise<AuthSession | null> {
        let lastError: unknown
        const startedAs = currentSession()?.user.id ?? null
        const isStale = () => startedIn !== generation

        for (let attempt = 0; attempt < MAX_REFRESH_ATTEMPTS; attempt += 1) {
            if (isStale()) {
                return currentSession()
            }

            // Otra pestaña pudo renovar mientras esperábamos el lock: se reutiliza su sesión.
            if (isFresh(snapshot.session)) {
                return snapshot.session
            }

            try {
                const response = await deps.refresh(signal)

                if (isStale()) {
                    return currentSession()
                }

                // La cookie es de otra cuenta (otro inicio de sesión en este navegador): no se cambia
                // de cuenta en silencio con los datos de la anterior en pantalla.
                if (startedAs !== null && response.user.id !== startedAs) {
                    signOut(true)

                    return null
                }

                const session = toSession(response)

                adopt(session, true)

                return session
            } catch (error) {
                lastError = error

                if (isStale()) {
                    return currentSession()
                }

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

        if (isStale()) {
            return currentSession()
        }

        publish({ session: snapshot.session, status: 'unavailable' })
        throw new SessionUnavailableError(
            lastError instanceof Error ? lastError.message : 'No pudimos renovar tu sesión. Revisa tu conexión.',
        )
    }

    function refreshCoordinated() {
        if (!refreshInFlight) {
            const startedIn = generation
            const controller = new AbortController()
            const work = () => refreshWithRetry(startedIn, controller.signal)
            const running: Promise<AuthSession | null> = (deps.withLock ? deps.withLock(work) : work()).finally(() => {
                if (refreshInFlight === running) {
                    refreshInFlight = null
                    refreshAbort = null
                }
            })

            refreshAbort = controller
            refreshInFlight = running
        }

        return refreshInFlight
    }

    return {
        clear() {
            startGeneration({ cancel: true })
            signOut(true)
        },

        // Con userId, el token solo se entrega si la sesión sigue siendo de esa cuenta: una
        // operación iniciada por A nunca viaja con la identidad de B.
        async ensureAccessToken(options: { forceRefresh?: boolean; userId?: string } = {}) {
            let session: AuthSession | null

            if (!options.forceRefresh && isFresh(snapshot.session)) {
                session = snapshot.session
            } else {
                if (options.forceRefresh && snapshot.session) {
                    publish({ session: { ...snapshot.session, accessTokenExpiresAt: new Date(0).toISOString() }, status: snapshot.status })
                }

                session = await refreshCoordinated()
            }

            if (options.userId !== undefined && session !== null && session.user.id !== options.userId) {
                throw new SessionChangedError()
            }

            return session?.accessToken ?? null
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
            startGeneration({ cancel: false })
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
