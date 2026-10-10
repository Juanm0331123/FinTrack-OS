'use client'

import { useEffect, useState } from 'react'

// Generación de un flujo de autenticación. Cancelar, reiniciar, cambiar de correo o desmontar
// invalida lo que está en vuelo: la petición se aborta (cuando aún se puede) y su respuesta tardía
// se ignora, así no revive un paso abandonado ni adopta una sesión que ya no corresponde.
export function createFlowGuard() {
    let generation = 0
    let controller = new AbortController()

    return {
        begin() {
            const startedIn = generation
            const signal = controller.signal

            return { isCurrent: () => startedIn === generation && !signal.aborted, signal }
        },
        invalidate() {
            generation += 1
            controller.abort()
            controller = new AbortController()
        },
    }
}

export type FlowGuard = ReturnType<typeof createFlowGuard>

export function useFlowGuard() {
    const [guard] = useState(createFlowGuard)

    useEffect(() => () => guard.invalidate(), [guard])

    return guard
}
