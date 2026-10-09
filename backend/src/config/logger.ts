import { redactText, redactValue } from './redact.ts'
import { getRequestContext } from './request-context.ts'

// Logger estructurado en JSON de una línea. Cloud Logging interpreta `severity` y `message`.
// Todos los campos pasan por la redacción antes de escribirse.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogLevelSetting = LogLevel | 'silent'

const LEVEL_ORDER: Record<LogLevelSetting, number> = {
    debug: 10,
    error: 40,
    info: 20,
    silent: 100,
    warn: 30,
}

const SEVERITY: Record<LogLevel, string> = {
    debug: 'DEBUG',
    error: 'ERROR',
    info: 'INFO',
    warn: 'WARNING',
}

export type LogFields = Record<string, unknown>

type LogSink = (line: string) => void

function defaultLevel(): LogLevelSetting {
    const configured = process.env.LOG_LEVEL

    if (configured && configured in LEVEL_ORDER) {
        return configured as LogLevelSetting
    }

    return process.env.NODE_ENV === 'test' ? 'silent' : 'info'
}

let minimumLevel: LogLevelSetting = defaultLevel()
let sink: LogSink = (line) => {
    process.stdout.write(`${line}\n`)
}

export function setLogLevel(level: LogLevelSetting) {
    minimumLevel = level
}

export function setLogSink(nextSink: LogSink) {
    const previous = sink

    sink = nextSink

    return () => {
        sink = previous
    }
}

function write(level: LogLevel, message: string, fields?: LogFields) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel]) {
        return
    }

    const context = getRequestContext()
    const entry = {
        severity: SEVERITY[level],
        time: new Date().toISOString(),
        message: redactText(message),
        ...(context ? { requestId: context.requestId, ...(context.traceId ? { traceId: context.traceId } : {}) } : {}),
        ...((fields ? redactValue(fields) : {}) as LogFields),
    }

    try {
        sink(JSON.stringify(entry))
    } catch {
        // A logging failure must never break the request that produced it.
    }
}

export const logger = {
    debug: (message: string, fields?: LogFields) => write('debug', message, fields),
    error: (message: string, fields?: LogFields) => write('error', message, fields),
    info: (message: string, fields?: LogFields) => write('info', message, fields),
    warn: (message: string, fields?: LogFields) => write('warn', message, fields),
}

// Describe un error sin serializar propiedades arbitrarias: body-parser adjunta el cuerpo
// crudo en `error.body` y V8 incluye fragmentos del JSON inválido en el mensaje.
export function describeError(error: unknown) {
    if (!(error instanceof Error)) {
        return { errorName: typeof error }
    }

    const parserType = (error as { type?: unknown }).type
    const isParserError = typeof parserType === 'string'
    // Prisma puede incluir argumentos de la consulta en el mensaje: solo se registra el código.
    const isPrismaError = error.name.startsWith('PrismaClient')
    const errorCode = (error as { code?: unknown }).code
    const frames = error.stack?.split('\n').slice(1, 8).join('\n')

    return {
        errorName: error.name,
        ...(typeof errorCode === 'string' ? { errorCode } : {}),
        ...(isParserError ? { parserType } : {}),
        ...(!isParserError && !isPrismaError ? { errorMessage: error.message } : {}),
        ...(frames && !isParserError ? { stack: frames } : {}),
    }
}
