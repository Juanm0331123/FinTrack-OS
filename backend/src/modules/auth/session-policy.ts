// Política de vida de una sesión (familia de refresh tokens). Funciones puras: el tiempo entra
// como parámetro para poder probarlas con fechas fijas.
//
// - Inactividad: cada renovación extiende la sesión `idleSeconds` desde ahora.
// - Absoluta: ninguna renovación pasa de `createdAt + absoluteSeconds`; después hay que iniciar
//   sesión de nuevo, aunque el usuario esté activo.
// - Reintento concurrente: si un refresh ya consumido vuelve a llegar dentro de `graceSeconds`,
//   se trata como carrera entre pestañas (409, sin revocar). Fuera de esa ventana es reutilización
//   de un token robado o antiguo y se revoca solo esa familia.

export type SessionLifetimes = {
    absoluteSeconds: number
    idleSeconds: number
}

export function newSessionExpiry(now: Date, lifetimes: SessionLifetimes) {
    const absoluteExpiresAt = new Date(now.getTime() + lifetimes.absoluteSeconds * 1000)
    const idleExpiresAt = new Date(Math.min(now.getTime() + lifetimes.idleSeconds * 1000, absoluteExpiresAt.getTime()))

    return { absoluteExpiresAt, idleExpiresAt }
}

export function renewedIdleExpiry(now: Date, absoluteExpiresAt: Date, idleSeconds: number) {
    return new Date(Math.min(now.getTime() + idleSeconds * 1000, absoluteExpiresAt.getTime()))
}

export function isSessionUsable(
    session: { absoluteExpiresAt: Date; idleExpiresAt: Date; revokedAt: Date | null },
    now: Date,
) {
    return !session.revokedAt && session.absoluteExpiresAt > now && session.idleExpiresAt > now
}

export type ReplayVerdict = 'concurrent-retry' | 'reuse'

export function classifyConsumedTokenReplay(usedAt: Date, now: Date, graceSeconds: number): ReplayVerdict {
    return now.getTime() - usedAt.getTime() <= graceSeconds * 1000 ? 'concurrent-retry' : 'reuse'
}
