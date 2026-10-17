import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Prisma } from '@prisma/client'
import { describeError, logger, setLogLevel, setLogSink } from './logger.ts'

function captureError(error: Error) {
    const entries: Record<string, unknown>[] = []
    const restoreSink = setLogSink((line) => entries.push(JSON.parse(line)))

    setLogLevel('error')

    try {
        logger.error('request_failed', describeError(error))
        assert.equal(entries.length, 1)

        return entries[0]
    } finally {
        restoreSink()
    }
}

describe('structured error diagnostics privacy', () => {
    it('keeps Prisma error codes and stack frames without multiline query arguments', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
            'Invalid prisma.user.findFirst invocation:\nSELECT password_hash FROM users;\nemail: query-argument-pii@example.test\npassword: query-argument-secret',
            { clientVersion: '7.10.0', code: 'P2022' },
        )
        const frame = '    at findUser (C:\\private\\auth.repository.ts:10:3)'

        error.stack = `${error.name}: ${error.message}\n${frame}`
        const entry = captureError(error)

        assert.equal(entry.errorName, 'PrismaClientKnownRequestError')
        assert.equal(entry.errorCode, 'P2022')
        assert.equal(entry.stack, frame)
        assert.equal('errorMessage' in entry, false)
        assert.doesNotMatch(JSON.stringify(entry), /SELECT|password_hash|query-argument|findFirst/)
    })

    it('preserves ordinary error diagnostics and bounds actual frames after filtering message lines', () => {
        const error = new Error('Synthetic dependency unavailable\nExtra diagnostic line')
        const frames = Array.from({ length: 9 }, (_, index) => `    at handler${index} (/app/server.ts:${index + 1}:2)`)

        error.stack = `${error.name}: ${error.message}\n${frames.join('\n')}`
        const entry = captureError(error)

        assert.equal(entry.errorName, 'Error')
        assert.equal(entry.errorMessage, 'Synthetic dependency unavailable\nExtra diagnostic line')
        assert.equal(entry.stack, frames.slice(0, 7).join('\n'))
    })

    it('keeps body-parser diagnostics free of raw input, error messages and stack', () => {
        const error = Object.assign(new SyntaxError('Bad JSON: password=parser-private-sentinel'), {
            body: '{"password":"parser-private-sentinel"',
            type: 'entity.parse.failed',
        })
        const entry = captureError(error)

        assert.equal(entry.errorName, 'SyntaxError')
        assert.equal(entry.parserType, 'entity.parse.failed')
        assert.equal('errorMessage' in entry, false)
        assert.equal('stack' in entry, false)
        assert.equal('body' in entry, false)
        assert.doesNotMatch(JSON.stringify(entry), /parser-private-sentinel|password/)
    })
})
