import { describe, expect, it } from 'vitest'

import { parseOAuthCallbackResult } from './oauth-callback-result'

// F-AUTH-06: sin fragmento de resultado, el callback espera solo mientras hidrata; después es un
// error recuperable con salida a iniciar sesión.
describe('parseOAuthCallbackResult', () => {
    it('waits during server rendering and hydration', () => {
        expect(parseOAuthCallbackResult('', { hydrated: false })).toEqual({ kind: 'loading' })
    })

    it('turns a missing result into a recoverable error once hydrated', () => {
        expect(parseOAuthCallbackResult('', { hydrated: true })).toMatchObject({ kind: 'error' })
        expect(parseOAuthCallbackResult('#', { hydrated: true })).toMatchObject({ kind: 'error' })
    })

    it('still reads a successful result', () => {
        expect(parseOAuthCallbackResult('#status=success', { hydrated: true })).toEqual({ kind: 'success' })
    })
})
