import { describe, expect, it } from 'vitest'

import { buildUpstreamHeaders, clientIpFrom, upstreamUrl } from './edge-proxy'

describe('buildUpstreamHeaders', () => {
    const incoming = new Headers({
        authorization: 'Bearer abc',
        cookie: 'refresh_token=xyz',
        origin: 'https://fintrack.example.app',
        'x-fintrack-client-ip': '6.6.6.6',
        'x-fintrack-edge-auth': 'secreto-falso',
        'x-forwarded-for': '1.2.3.4',
        'x-internal-debug': 'true',
    })

    it('forwards only allow-listed headers and replaces the proxy headers sent by the browser', () => {
        const headers = buildUpstreamHeaders(incoming, { clientIp: '203.0.113.5', secret: 'secreto-real' })

        expect(headers.get('authorization')).toBe('Bearer abc')
        expect(headers.get('cookie')).toBe('refresh_token=xyz')
        expect(headers.get('x-fintrack-edge-auth')).toBe('secreto-real')
        expect(headers.get('x-fintrack-client-ip')).toBe('203.0.113.5')
        expect(headers.get('x-internal-debug')).toBeNull()
        expect(headers.get('x-forwarded-for')).toBeNull()
    })

    it('omits the client IP header when the platform gave none', () => {
        expect(buildUpstreamHeaders(new Headers(), { clientIp: null, secret: 's' }).get('x-fintrack-client-ip')).toBeNull()
    })
})

describe('clientIpFrom', () => {
    it('uses the single platform-overwritten IP, never an alternate client header', () => {
        expect(clientIpFrom(new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.8' }), true)).toBe('203.0.113.8')
        expect(clientIpFrom(new Headers({ 'x-forwarded-for': '2001:db8::7' }), true)).toBe('2001:db8::7')
    })

    it('does not trust forwarded headers outside Vercel', () => {
        expect(clientIpFrom(new Headers({ 'x-forwarded-for': '203.0.113.8' }), false)).toBeNull()
        expect(clientIpFrom(new Headers())).toBeNull()
    })

    it('rejects missing, repeated, malformed or port-qualified IPs instead of selecting a prefix', () => {
        for (const value of ['203.0.113.8, 10.0.0.1', 'invalid', '203.0.113.8:443', '[2001:db8::7]', 'fe80::1%eth0', '']) {
            expect(clientIpFrom(new Headers({ 'x-forwarded-for': value }), true)).toBeNull()
        }
        expect(clientIpFrom(new Headers({ 'x-real-ip': '203.0.113.7' }), true)).toBeNull()
    })
})

describe('upstreamUrl', () => {
    it('keeps the path and query on the backend origin', () => {
        expect(upstreamUrl('https://fintrack-api.vercel.app/', '/api/auth/oauth/google/callback', '?code=1&state=2').toString()).toBe(
            'https://fintrack-api.vercel.app/api/auth/oauth/google/callback?code=1&state=2',
        )
    })
})
