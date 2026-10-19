import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from './proxy'

describe('first-party API proxy between Vercel projects', () => {
    afterEach(() => vi.unstubAllEnvs())

    const secret = 'proxy-test-secret-01234567890123456789'

    function configure() {
        vi.stubEnv('BACKEND_ORIGIN', 'https://fintrack-api.vercel.app')
        vi.stubEnv('EDGE_PROXY_SECRET', secret)
        vi.stubEnv('VERCEL', '1')
    }

    it('replaces forged proxy headers and keeps the backend origin for preview and production frontend URLs', () => {
        configure()

        for (const frontend of ['https://fintrack.vercel.app', 'https://fintrack-preview-owner.vercel.app']) {
            const request = new NextRequest(`${frontend}/api/auth/me?test=1`, {
                headers: {
                    'x-forwarded-for': '203.0.113.7',
                    'x-real-ip': '198.51.100.1',
                    'x-fintrack-client-ip': '198.51.100.2',
                    'x-fintrack-edge-auth': 'forged',
                    cookie: 'refresh_token=synthetic-cookie',
                },
            })
            const response = proxy(request)

            expect(response.headers.get('x-middleware-rewrite')).toBe('https://fintrack-api.vercel.app/api/auth/me?test=1')
            expect(response.headers.get('x-middleware-request-x-fintrack-client-ip')).toBe('203.0.113.7')
            expect(response.headers.get('x-middleware-request-x-fintrack-edge-auth')).toBe(secret)
            expect(response.headers.get('x-middleware-request-cookie')).toBe('refresh_token=synthetic-cookie')
            expect(response.headers.get('x-middleware-request-x-forwarded-for')).toBeNull()
        }
    })

    it('fails closed on Vercel when the platform client IP is missing or a list', async () => {
        configure()

        for (const headers of [new Headers(), new Headers({ 'x-forwarded-for': '203.0.113.7, 198.51.100.1' })]) {
            const response = proxy(new NextRequest('https://fintrack.vercel.app/api/auth/me', { headers }))

            expect(response.status).toBe(503)
            expect(response.headers.get('cache-control')).toBe('no-store')
            expect(response.headers.has('x-middleware-rewrite')).toBe(false)
            expect(await response.json()).toMatchObject({ code: 'EDGE_PROXY_MISCONFIGURED', success: false })
        }
    })

    it('keeps local development usable without trusting caller-supplied forwarding headers', () => {
        configure()
        vi.stubEnv('VERCEL', undefined)
        const response = proxy(new NextRequest('http://localhost:3000/api/auth/me', {
            headers: { 'x-forwarded-for': '198.51.100.1', 'x-fintrack-client-ip': '198.51.100.2' },
        }))

        expect(response.headers.has('x-middleware-rewrite')).toBe(true)
        expect(response.headers.has('x-middleware-request-x-fintrack-client-ip')).toBe(false)
    })

    it('returns an uncached service error when the backend exists but its secret is missing', () => {
        configure()
        vi.stubEnv('EDGE_PROXY_SECRET', undefined)
        const response = proxy(new NextRequest('https://fintrack.vercel.app/api/auth/me'))

        expect(response.status).toBe(503)
        expect(response.headers.get('cache-control')).toBe('no-store')
    })

    it('leaves local requests unchanged without a backend proxy origin', () => {
        vi.stubEnv('BACKEND_ORIGIN', undefined)
        const response = proxy(new NextRequest('http://localhost:3000/api/auth/me'))

        expect(response.headers.get('x-middleware-next')).toBe('1')
    })
})
