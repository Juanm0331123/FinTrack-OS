type Job = () => Promise<unknown>

type PatchSender = (patch: Record<string, unknown>) => Promise<unknown>

// Recibe la respuesta del servidor y los campos que siguen representados por ese envío (ninguna
// edición posterior los superó): solo esos pueden adoptar el valor canónico devuelto.
type PatchApplier = (result: unknown, fields: string[]) => void

// Cada campo escrito recibe una revisión creciente. Un envío solo «representa» un campo mientras
// su revisión siga siendo la última escrita para ese campo: así un reintento antiguo nunca pisa una
// edición posterior (ya guardada, en vuelo o esperando su temporizador).
type FieldWrite = { rev: number; value: unknown }

type Writes = Record<string, FieldWrite>

type PatchHandlers = { apply?: PatchApplier; send: PatchSender; sequenceKey: string }

type KeyState = {
    chain: Promise<void>
    handlers: PatchHandlers | null
    latest: Map<string, number>
    patch: Writes | null
    timer: ReturnType<typeof setTimeout> | null
}

type Failure =
    | { job: Job; key: string; kind: 'run' }
    | { handlers: PatchHandlers; key: string; kind: 'patch'; writes: Writes }

export type SaveQueueStatus = {
    error: string | null
    // Trabajos que fallaron y esperan reintento o descarte: siguen siendo cambios sin guardar.
    failed: number
    pending: number
}

export type SaveQueue = ReturnType<typeof createSaveQueue>

// El servidor rechazó el cambio de forma definitiva y quien lo encoló ya revirtió su efecto local:
// se informa el motivo, pero no queda nada por reintentar ni por guardar.
export class SaveRejectedError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SaveRejectedError'
    }
}

function errorMessage(error: unknown) {
    return error instanceof Error && error.message
        ? error.message
        : 'No pudimos guardar el último cambio.'
}

function valuesOf(writes: Writes) {
    return Object.fromEntries(Object.entries(writes).map(([field, write]) => [field, write.value]))
}

const RUN_FIELD = '*'

export function createSaveQueue(options: {
    debounceMs?: number
    onStatus: (status: SaveQueueStatus) => void
}) {
    const debounceMs = options.debounceMs ?? 600
    const keys = new Map<string, KeyState>()
    const failed: Failure[] = []
    let running = 0
    let waiting = 0
    let revision = 0
    let lastError: string | null = null
    // Cada dispose abre una época nueva: los trabajos encolados en una época anterior no se
    // ejecutan y sus fallos no se registran.
    let epoch = 0

    function emit() {
        options.onStatus({ error: lastError, failed: failed.length, pending: running + waiting })
    }

    function stateFor(key: string) {
        let state = keys.get(key)

        if (!state) {
            state = { chain: Promise.resolve(), handlers: null, latest: new Map(), patch: null, timer: null }
            keys.set(key, state)
        }

        return state
    }

    function enqueue(key: string, job: Job, onFailure: () => Failure) {
        const state = stateFor(key)
        const queuedIn = epoch

        // Un trabajo (crear, borrar, gasto) también cuenta como escritura de la clave.
        state.latest.set(RUN_FIELD, ++revision)

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

                    if (!(error instanceof SaveRejectedError)) {
                        failed.push(onFailure())
                    }
                }
            } finally {
                running -= 1
                emit()
            }
        })

        return state.chain
    }

    // Solo los campos cuya última escritura sigue siendo la de este envío.
    function currentWrites(key: string, writes: Writes) {
        const latest = keys.get(key)?.latest
        const current: Writes = {}

        for (const [field, write] of Object.entries(writes)) {
            if (latest?.get(field) === write.rev) {
                current[field] = write
            }
        }

        return current
    }

    function enqueuePatch(key: string, writes: Writes, handlers: PatchHandlers) {
        const queuedIn = epoch

        return enqueue(
            handlers.sequenceKey,
            async () => {
                const result = await handlers.send(valuesOf(writes))
                const fields = Object.keys(currentWrites(key, writes))

                if (queuedIn === epoch && handlers.apply && fields.length > 0) {
                    handlers.apply(result, fields)
                }
            },
            () => ({ handlers, key, kind: 'patch', writes }),
        )
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
        const handlers = state.handlers

        state.patch = null

        if (patch && handlers) {
            void enqueuePatch(key, patch, handlers)
        } else {
            emit()
        }
    }

    return {
        cancel(key: string) {
            const state = keys.get(key)

            // Un registro retirado no conserva revisiones para reintentar sus parches antiguos.
            state?.latest.clear()

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
        // Descarta los fallos pendientes sin reenviarlos (el llamador recarga el estado del servidor).
        discardFailed() {
            failed.length = 0
            lastError = null
            emit()
        },
        // Cierra un aviso informativo (un rechazo ya revertido) cuando no quedan fallos pendientes.
        dismissError() {
            if (failed.length === 0 && lastError !== null) {
                lastError = null
                emit()
            }
        },
        hasFailed() {
            return failed.length > 0
        },
        hasUnsaved() {
            return running + waiting + failed.length > 0
        },
        // Revisión actual: sirve de marca para saber qué se escribió después (touchedSince).
        revision() {
            return revision
        },
        // Campos escritos en cada clave después de la revisión dada ('*' = un trabajo de la clave).
        touchedSince(since: number) {
            const touched = new Map<string, Set<string>>()

            for (const [key, state] of keys) {
                for (const [field, rev] of state.latest) {
                    if (rev > since) {
                        const fields = touched.get(key) ?? new Set<string>()

                        fields.add(field)
                        touched.set(key, fields)
                    }
                }
            }

            return touched
        },
        patch<T extends Record<string, unknown>, R = unknown>(
            key: string,
            patch: T,
            send: (merged: T) => Promise<R>,
            apply?: (result: R, fields: string[]) => void,
            sequenceKey = key,
        ) {
            const state = stateFor(key)
            const rev = ++revision
            const writes: Writes = { ...(state.patch ?? {}) }

            for (const [field, value] of Object.entries(patch)) {
                writes[field] = { rev, value }
                state.latest.set(field, rev)
            }

            state.patch = writes
            // Las revisiones pertenecen al registro, pero puede compartir la cadena de su padre
            // (gastos de bolsillo: no se envían antes de crear la fila o el propio gasto).
            state.handlers = { apply: apply as PatchApplier | undefined, send: send as PatchSender, sequenceKey }

            if (state.timer) {
                clearTimeout(state.timer)
            } else {
                waiting += 1
                emit()
            }

            state.timer = setTimeout(() => flush(key), debounceMs)
        },
        retryFailed() {
            const failures = failed.splice(0)

            lastError = null
            emit()

            for (const failure of failures) {
                if (failure.kind === 'run') {
                    void enqueue(failure.key, failure.job, () => failure)
                    continue
                }

                const writes = currentWrites(failure.key, failure.writes)

                if (Object.keys(writes).length > 0) {
                    void enqueuePatch(failure.key, writes, failure.handlers)
                }
            }
        },
        run(key: string, job: Job) {
            return enqueue(key, job, () => ({ job, key, kind: 'run' }))
        },
    }
}
