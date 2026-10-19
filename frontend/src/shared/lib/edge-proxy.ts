import { isIP } from 'node:net'

// Cabeceras que el proxy de Next reenvía al backend (lista blanca). Las cabeceras propias del
// proxy (`x-fintrack-*`) nunca se aceptan del navegador: se descartan y se fijan aquí.

export const EDGE_SECRET_HEADER = 'x-fintrack-edge-auth'
export const EDGE_CLIENT_IP_HEADER = 'x-fintrack-client-ip'

const FORWARDED_HEADERS = [
    'accept',
    'accept-language',
    'authorization',
    'content-type',
    'cookie',
    'origin',
    'referer',
    'sec-fetch-site',
    'user-agent',
    'x-request-id',
]

// Vercel sobrescribe x-forwarded-for en la entrada al proyecto público para evitar spoofing.
// No contamos saltos ni tomamos un prefijo: el salto al segundo proyecto tendrá otra IP.
// Fuera de Vercel estas cabeceras las puede enviar el cliente y nunca son una identidad fiable.
export function clientIpFrom(headers: Headers, isVercel = false) {
    if (!isVercel) {
        return null
    }

    const forwarded = headers.get('x-forwarded-for')?.trim()

    return forwarded && !forwarded.includes('%') && isIP(forwarded) ? forwarded : null
}

export function buildUpstreamHeaders(incoming: Headers, options: { clientIp: string | null; secret: string }) {
    const headers = new Headers()

    for (const name of FORWARDED_HEADERS) {
        const value = incoming.get(name)

        if (value !== null) {
            headers.set(name, value)
        }
    }

    headers.set(EDGE_SECRET_HEADER, options.secret)

    if (options.clientIp) {
        headers.set(EDGE_CLIENT_IP_HEADER, options.clientIp)
    }

    return headers
}

export function upstreamUrl(backendOrigin: string, pathname: string, search: string) {
    const origin = backendOrigin.replace(/\/+$/, '')

    return new URL(`${origin}${pathname}${search}`)
}
