// Precarga para pruebas de proceso real (ROPS-02): cuando el servidor anuncia que arrancó, lanza
// un error desde un temporizador, fuera de cualquier petición, como haría un fallo inesperado.
const write = process.stdout.write.bind(process.stdout)
let armed = false

process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    if (!armed && String(chunk).includes('server_started')) {
        armed = true
        setTimeout(() => {
            throw new Error('fallo sintético fuera de una petición')
        }, 50)
    }

    return (write as (...args: unknown[]) => boolean)(chunk, ...rest)
}) as typeof process.stdout.write
