// Estado de ciclo de vida compartido entre el servidor y el endpoint de readiness.
let shuttingDown = false

export function markShuttingDown() {
    shuttingDown = true
}

export function isShuttingDown() {
    return shuttingDown
}
