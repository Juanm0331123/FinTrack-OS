// Sustituye solo la frontera HTTP con terceros (Google, GitHub, Resend). La API y PostgreSQL
// funcionan de verdad. Las peticiones a cualquier otro host pasan al fetch original.

type Behavior = 'ok' | 'timeout' | 'server-error' | 'malformed' | 'rejected'

export type GoogleProfile = { email: string; email_verified: boolean | string; name?: string; sub: string }
export type GitHubEmail = { email: string; primary: boolean; verified: boolean }

const PROVIDER_HOSTS = new Set([
    'oauth2.googleapis.com',
    'openidconnect.googleapis.com',
    'github.com',
    'api.github.com',
    'api.resend.com',
])

export type FakeProviders = {
    behavior: Behavior
    calls: string[]
    github: { emails: GitHubEmail[]; id: number; login: string; name: string | null }
    google: GoogleProfile
    restore(): void
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status })
}

function never(signal: AbortSignal | null | undefined) {
    return new Promise<Response>((_, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
}

export function installFakeProviders(): FakeProviders {
    const originalFetch = globalThis.fetch
    const state: FakeProviders = {
        behavior: 'ok',
        calls: [],
        github: { emails: [], id: 4242, login: 'qa-github', name: 'QA GitHub' },
        google: { email: 'qa@example.test', email_verified: true, name: 'QA Google', sub: 'google-sub-1' },
        restore() {
            globalThis.fetch = originalFetch
        },
    }

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input.toString())

        if (!PROVIDER_HOSTS.has(url.hostname)) {
            return originalFetch(input, init)
        }

        state.calls.push(`${url.hostname}${url.pathname}`)

        if (state.behavior === 'timeout') {
            return never(init?.signal)
        }

        if (state.behavior === 'server-error') {
            return json({ error: 'temporarily_unavailable' }, 503)
        }

        if (state.behavior === 'rejected') {
            return json({ error: 'invalid_grant' }, 400)
        }

        if (state.behavior === 'malformed') {
            return json({ unexpected: true })
        }

        switch (`${url.hostname}${url.pathname}`) {
            case 'oauth2.googleapis.com/token':
            case 'github.com/login/oauth/access_token':
                return json({ access_token: 'provider-access-token', token_type: 'bearer' })
            case 'openidconnect.googleapis.com/v1/userinfo':
                return json(state.google)
            case 'api.github.com/user':
                return json({ avatar_url: null, id: state.github.id, login: state.github.login, name: state.github.name })
            case 'api.github.com/user/emails':
                return json(state.github.emails)
            default:
                return json({ error: 'not_found' }, 404)
        }
    }) as typeof fetch

    return state
}
