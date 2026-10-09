// Readiness pública compartida: todas las visitas dentro de una ventana corta reutilizan el mismo
// resultado y, mientras hay una comprobación en curso, esperan esa misma promesa. Así un tráfico
// alto al endpoint público no se traduce en una consulta a la base por visita.
export function createReadinessProbe(options: { check: () => Promise<boolean>; now?: () => number; ttlMs: number }) {
    const now = options.now ?? Date.now
    let cached: { checkedAt: number; ready: boolean } | null = null
    let inFlight: Promise<boolean> | null = null

    return function isReady() {
        if (cached && now() - cached.checkedAt < options.ttlMs) {
            return Promise.resolve(cached.ready)
        }

        inFlight ??= options
            .check()
            .catch(() => false)
            .then((ready) => {
                cached = { checkedAt: now(), ready }
                inFlight = null

                return ready
            })

        return inFlight
    }
}
