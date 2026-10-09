type Job = () => Promise<unknown>

type KeyState = {
    chain: Promise<void>
    patch: Record<string, unknown> | null
    send: ((patch: Record<string, unknown>) => Promise<unknown>) | null
    timer: ReturnType<typeof setTimeout> | null
}

export type SaveQueueStatus = {
    error: string | null
    pending: number
}

export type SaveQueue = ReturnType<typeof createSaveQueue>

function errorMessage(error: unknown) {
    return error instanceof Error && error.message
        ? error.message
        : 'No pudimos guardar el último cambio.'
}

export function createSaveQueue(options: {
    debounceMs?: number
    onStatus: (status: SaveQueueStatus) => void
}) {
    const debounceMs = options.debounceMs ?? 600
    const keys = new Map<string, KeyState>()
    const failed: Array<{ job: Job; key: string }> = []
    let running = 0
    let waiting = 0
    let lastError: string | null = null
    // Cada dispose abre una época nueva: los trabajos encolados en una época anterior no se
    // ejecutan y sus fallos no se registran.
    let epoch = 0

    function emit() {
        options.onStatus({ error: lastError, pending: running + waiting })
    }

    function stateFor(key: string) {
        let state = keys.get(key)

        if (!state) {
            state = { chain: Promise.resolve(), patch: null, send: null, timer: null }
            keys.set(key, state)
        }

        return state
    }

    function enqueue(key: string, job: Job) {
        const state = stateFor(key)
        const queuedIn = epoch

        running += 1
        emit()

        state.chain = state.chain.then(async () => {
            try {
                if (queuedIn === epoch) {
                    await job()
                }
            } catch (error) {
                if (queuedIn === epoch) {
                    lastError = errorMessage(error)
                    failed.push({ job, key })
                }
            } finally {
                running -= 1
                emit()
            }
        })

        return state.chain
    }

    function flush(key: string) {
        const state = keys.get(key)

        if (!state?.timer) {
            return
        }

        clearTimeout(state.timer)
        state.timer = null
        waiting -= 1

        const patch = state.patch
        const send = state.send

        state.patch = null

        if (patch && send) {
            void enqueue(key, () => send(patch))
        } else {
            emit()
        }
    }

    return {
        cancel(key: string) {
            const state = keys.get(key)

            if (state?.timer) {
                clearTimeout(state.timer)
                state.timer = null
                state.patch = null
                waiting -= 1
                emit()
            }
        },
        // Descarta todo lo pendiente sin enviarlo: temporizadores, parches acumulados, trabajos aún
        // no iniciados y fallos por reintentar. Se usa al cerrar el libro o cambiar de cuenta.
        dispose() {
            epoch += 1

            for (const state of keys.values()) {
                if (state.timer) {
                    clearTimeout(state.timer)
                }
            }

            keys.clear()
            failed.length = 0
            waiting = 0
            lastError = null
            emit()
        },
        flushAll() {
            for (const key of keys.keys()) {
                flush(key)
            }
        },
        // Resuelve cuando terminan los trabajos ya encolados (no espera parches con temporizador).
        async idle() {
            await Promise.all([...keys.values()].map((state) => state.chain))
        },
        hasUnsaved() {
            return running + waiting > 0
        },
        patch<T extends Record<string, unknown>>(key: string, patch: T, send: (merged: T) => Promise<unknown>) {
            const state = stateFor(key)

            state.patch = { ...(state.patch ?? {}), ...patch }
            state.send = send as (merged: Record<string, unknown>) => Promise<unknown>

            if (state.timer) {
                clearTimeout(state.timer)
            } else {
                waiting += 1
                emit()
            }

            state.timer = setTimeout(() => flush(key), debounceMs)
        },
        retryFailed() {
            const jobs = failed.splice(0)

            lastError = null
            emit()

            for (const { job, key } of jobs) {
                void enqueue(key, job)
            }
        },
        run(key: string, job: Job) {
            return enqueue(key, job)
        },
    }
}
