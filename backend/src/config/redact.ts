// Redacción de datos sensibles antes de escribir logs. Se aplica a toda entrada del logger:
// ningún campo, URL o texto llega a stdout sin pasar por aquí.

export const REDACTED = '[REDACTED]'

const SENSITIVE_KEYS = new Set(
    [
        'accesstoken',
        'apikey',
        'authorization',
        'clientsecret',
        'client_secret',
        'code',
        'cookie',
        'currentpassword',
        'idtoken',
        'newpassword',
        'password',
        'passwordhash',
        'proxy-authorization',
        'refreshtoken',
        'resettoken',
        'secret',
        'set-cookie',
        'state',
        'token',
        'tokenhash',
        'verificationcode',
        'x-fintrack-edge-auth',
        'x-refresh-token',
    ].map((key) => key.toLowerCase()),
)

const SENSITIVE_QUERY_KEYS = new Set([
    'access_token',
    'code',
    'email',
    'error_description',
    'id_token',
    'refresh_token',
    'state',
    'token',
])

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi
const MAX_STRING_LENGTH = 500
const MAX_DEPTH = 5
const MAX_ARRAY_ITEMS = 20

function normalizeKey(key: string) {
    return key.toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

export function isSensitiveKey(key: string) {
    return SENSITIVE_KEYS.has(normalizeKey(key)) || SENSITIVE_KEYS.has(normalizeKey(key).replace(/[-_]/g, ''))
}

export function redactText(value: string) {
    const scrubbed = value.replace(JWT_PATTERN, REDACTED).replace(BEARER_PATTERN, `Bearer ${REDACTED}`)

    return scrubbed.length > MAX_STRING_LENGTH ? `${scrubbed.slice(0, MAX_STRING_LENGTH)}…` : scrubbed
}

export function redactUrl(rawUrl: string) {
    const queryStart = rawUrl.indexOf('?')

    if (queryStart === -1) {
        return redactText(rawUrl)
    }

    const path = rawUrl.slice(0, queryStart)
    const params = new URLSearchParams(rawUrl.slice(queryStart + 1))
    const redacted = new URLSearchParams()

    for (const [key, value] of params) {
        redacted.append(key, SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) || isSensitiveKey(key) ? REDACTED : value)
    }

    return redactText(`${path}?${redacted.toString()}`)
}

export function redactValue(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) {
        return value
    }

    if (typeof value === 'string') {
        return redactText(value)
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'bigint') {
        return value.toString()
    }

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (depth >= MAX_DEPTH) {
        return '[MAX_DEPTH]'
    }

    if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1))
    }

    if (typeof value === 'object') {
        const output: Record<string, unknown> = {}

        for (const [key, item] of Object.entries(value)) {
            output[key] = isSensitiveKey(key) ? REDACTED : redactValue(item, depth + 1)
        }

        return output
    }

    return String(value)
}
