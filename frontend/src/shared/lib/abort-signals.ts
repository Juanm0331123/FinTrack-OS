// AbortSignal.any no existe en Chrome < 116, Firefox < 124 ni Safari < 17.4, que siguen dentro de
// los navegadores para los que compila Next 16. Combina señales con la API nativa si existe y, si
// no, con un AbortController propio. dispose quita los listeners de señales de larga vida (como la
// del ciclo de vida del cliente) cuando la petición termina.
export function combineSignals(signals: readonly AbortSignal[]): { dispose: () => void; signal: AbortSignal } {
    if (typeof AbortSignal.any === 'function') {
        return { dispose: () => undefined, signal: AbortSignal.any([...signals]) }
    }

    const controller = new AbortController()
    const aborted = signals.find((signal) => signal.aborted)

    if (aborted) {
        controller.abort(aborted.reason)

        return { dispose: () => undefined, signal: controller.signal }
    }

    const listeners = signals.map((signal) => {
        const onAbort = () => controller.abort(signal.reason)

        signal.addEventListener('abort', onAbort, { once: true })

        return () => signal.removeEventListener('abort', onAbort)
    })
    const dispose = () => listeners.forEach((remove) => remove())

    controller.signal.addEventListener('abort', dispose, { once: true })

    return { dispose, signal: controller.signal }
}
