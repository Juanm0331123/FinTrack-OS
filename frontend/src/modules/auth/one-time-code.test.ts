import { describe, expect, it } from 'vitest'

import { codeDigits, isCompleteCode, pasteCode, writeDigit } from './one-time-code'

// F-AUTH-02: cada casilla conserva su posición; los huecos no desplazan los demás dígitos.
describe('one-time code slots', () => {
    it('keeps a digit typed out of order in its own slot', () => {
        const value = writeDigit('', 2, '3', 6)

        expect(codeDigits(value, 6)).toEqual(['', '', '3', '', '', ''])
        expect(isCompleteCode(value, 6)).toBe(false)
    })

    it('clears a middle digit without shifting the following ones', () => {
        const value = writeDigit('123456', 2, '', 6)

        expect(codeDigits(value, 6)).toEqual(['1', '2', '', '4', '5', '6'])
        expect(isCompleteCode(value, 6)).toBe(false)
        expect(codeDigits(writeDigit(value, 2, '9', 6), 6)).toEqual(['1', '2', '9', '4', '5', '6'])
    })

    it('fills from the pasted slot onward and ignores separators', () => {
        expect(pasteCode('', 0, '123 456', 6)).toBe('123456')
        expect(codeDigits(pasteCode(writeDigit('', 0, '9', 6), 2, '34', 6), 6)).toEqual(['9', '', '3', '4', '', ''])
        expect(isCompleteCode(pasteCode('', 0, '123456', 6), 6)).toBe(true)
    })
})
