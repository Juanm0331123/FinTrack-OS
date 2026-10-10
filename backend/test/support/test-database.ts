// Guarda de seguridad: las pruebas de integración escriben, borran y migran. Solo pueden apuntar
// a una base local cuyo nombre la identifique como de prueba, o a un host permitido de forma
// explícita (por ejemplo el servicio `postgres` de CI). Nunca leen DATABASE_URL del .env.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const TEST_DATABASE_NAME = /(^|[_-])(test|qa)([_-]|$)/i

export function assertSafeTestDatabaseUrl(rawUrl: string | undefined, allowedHosts: string[] = []) {
    if (!rawUrl) {
        throw new Error('Define TEST_DATABASE_URL con una base PostgreSQL de prueba (ver docs/qa-backend-remediacion.md).')
    }

    let url: URL

    try {
        url = new URL(rawUrl)
    } catch {
        throw new Error('TEST_DATABASE_URL no es una URL válida.')
    }

    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
        throw new Error('TEST_DATABASE_URL debe ser una URL postgresql://.')
    }

    const host = url.hostname.toLowerCase()

    if (!LOCAL_HOSTS.has(host) && !allowedHosts.map((item) => item.toLowerCase()).includes(host)) {
        throw new Error(
            `TEST_DATABASE_URL apunta a ${host}, que no es local ni está en TEST_DATABASE_ALLOWED_HOSTS. Las pruebas no se ejecutan contra bases remotas por defecto.`,
        )
    }

    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

    if (!TEST_DATABASE_NAME.test(databaseName)) {
        throw new Error(`La base "${databaseName}" no parece de prueba: su nombre debe contener "test" o "qa".`)
    }

    return url
}

export function allowedTestHosts() {
    return (process.env.TEST_DATABASE_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)
}
