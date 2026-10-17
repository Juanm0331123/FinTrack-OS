// Los errores inesperados nunca incorporan diagnósticos enviados por el servidor.
export function serverFailureMessage(status: number) {
    return status >= 500 || (status > 0 && status < 400)
        ? 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.'
        : undefined
}
