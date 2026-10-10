// Ejecuta una tarea asíncrona a la vez: las llamadas que llegan mientras otra está en curso se
// descartan. Evita un segundo registro o login efectivo por un doble envío del formulario.
export function createSingleFlight() {
    let inFlight = false

    return {
        async run(task: () => Promise<void>) {
            if (inFlight) {
                return
            }

            inFlight = true

            try {
                await task()
            } finally {
                inFlight = false
            }
        },
    }
}
