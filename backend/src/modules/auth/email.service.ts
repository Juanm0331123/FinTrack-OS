import { randomUUID } from 'node:crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../../config/env.ts'
import { describeError, logger } from '../../config/logger.ts'
import { metrics } from '../../config/metrics.ts'
import { ServiceUnavailableError } from '../../utils/app-error.ts'
import {
    renderEmailChangeCode,
    renderEmailChangedNotice,
    renderPasswordResetCode,
    renderVerificationCode,
    type RenderedEmail,
} from './email.templates.ts'

type CodeEmailInput = {
    code: string
    email: string
    expiresAt: Date
    firstName: string
}

type OutgoingEmail = RenderedEmail & { to: string }

type EmailProvider = {
    send(message: OutgoingEmail): Promise<void>
}

export type OutboxMessage = OutgoingEmail & { sentAt: Date }

// Los envíos tienen plazo propio y no se reintentan automáticamente: un reintento ciego puede
// duplicar códigos. El usuario puede pedir otro código, sujeto a los límites de envío.

function deliveryFailed(provider: string, kind: string, error?: unknown) {
    metrics.recordDependencyError('email', kind)
    logger.error('email_delivery_failed', { ...(error ? describeError(error) : {}), deliveryFailure: kind, provider })

    return new ServiceUnavailableError(
        'No pudimos enviar el correo en este momento. Intenta de nuevo en unos minutos.',
        'EMAIL_DELIVERY_FAILED',
    )
}

const outbox: OutboxMessage[] = []

// Solo existe con NODE_ENV=test (env.ts rechaza EMAIL_PROVIDER=outbox en otro entorno).
export function readTestOutbox() {
    return outbox
}

class OutboxEmailProvider implements EmailProvider {
    async send(message: OutgoingEmail) {
        outbox.push({ ...message, sentAt: new Date() })
    }
}

class ConsoleEmailProvider implements EmailProvider {
    async send(message: OutgoingEmail) {
        // Solo en desarrollo local sin proveedor configurado: imprime el correo para leer el código.
        process.stdout.write(`\n[correo de desarrollo] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}\n\n`)
    }
}

class ResendEmailProvider implements EmailProvider {
    private readonly apiKey: string
    private readonly from: string
    private readonly replyTo?: string

    constructor(apiKey: string, from: string) {
        this.apiKey = apiKey
        this.from = from
        this.replyTo = env.EMAIL_REPLY_TO
    }

    async send(message: OutgoingEmail) {
        let response: Response

        try {
            response = await fetch('https://api.resend.com/emails', {
                body: JSON.stringify({
                    from: this.from,
                    html: message.html,
                    subject: message.subject,
                    text: message.text,
                    to: [message.to],
                    ...(this.replyTo ? { reply_to: this.replyTo } : {}),
                }),
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    // Si la petición se repitiera, Resend no entregaría un segundo correo.
                    'Idempotency-Key': randomUUID(),
                },
                method: 'POST',
                signal: AbortSignal.timeout(env.EMAIL_SEND_TIMEOUT_MS),
            })
        } catch (error) {
            throw deliveryFailed('resend', (error as Error).name === 'TimeoutError' ? 'timeout' : 'network', error)
        }

        if (!response.ok) {
            await response.body?.cancel()
            throw deliveryFailed('resend', `http_${response.status}`)
        }

        await response.body?.cancel()
    }
}

class GmailEmailProvider implements EmailProvider {
    private readonly from: string
    private readonly replyTo?: string
    private readonly transporter: Transporter

    constructor(from: string, user: string, password: string) {
        this.from = from
        this.replyTo = env.EMAIL_REPLY_TO
        this.transporter = nodemailer.createTransport({
            auth: { pass: password, user },
            connectionTimeout: env.EMAIL_SEND_TIMEOUT_MS,
            greetingTimeout: env.EMAIL_SEND_TIMEOUT_MS,
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            socketTimeout: env.EMAIL_SEND_TIMEOUT_MS,
        })
    }

    async send(message: OutgoingEmail) {
        try {
            await this.transporter.sendMail({
                from: this.from,
                html: message.html,
                subject: message.subject,
                text: message.text,
                to: message.to,
                ...(this.replyTo ? { replyTo: this.replyTo } : {}),
            })
        } catch (error) {
            const code = (error as { code?: unknown }).code

            throw deliveryFailed('gmail', typeof code === 'string' ? code.toLowerCase() : 'smtp_error', error)
        }
    }
}

function extractEmailAddress(value: string) {
    const match = value.match(/<([^>]+)>/)

    if (match?.[1]) {
        return match[1].trim()
    }

    return value.includes('@') ? value.trim() : null
}

function createProvider(): EmailProvider {
    if (env.EMAIL_PROVIDER === 'outbox') {
        return new OutboxEmailProvider()
    }

    if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY && env.EMAIL_FROM) {
        return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM)
    }

    if (env.EMAIL_PROVIDER === 'gmail' && env.EMAIL_PASSWORD) {
        const from = env.EMAIL_FROM?.trim() || 'FinTrack OS <fintrackos.auth@gmail.com>'
        const address = extractEmailAddress(from)

        if (address) {
            return new GmailEmailProvider(from, address, env.EMAIL_PASSWORD)
        }
    }

    if (!env.EMAIL_PROVIDER && env.NODE_ENV === 'development') {
        return new ConsoleEmailProvider()
    }

    throw new ServiceUnavailableError('El envío de correos no está configurado.', 'EMAIL_DELIVERY_UNAVAILABLE')
}

export class EmailService {
    private provider: EmailProvider | null = null

    private getProvider() {
        this.provider ??= createProvider()

        return this.provider
    }

    sendVerificationCodeEmail(input: CodeEmailInput) {
        return this.getProvider().send({ ...renderVerificationCode(input), to: input.email })
    }

    sendPasswordResetCodeEmail(input: CodeEmailInput) {
        return this.getProvider().send({ ...renderPasswordResetCode(input), to: input.email })
    }

    sendEmailChangeCodeEmail(input: CodeEmailInput) {
        return this.getProvider().send({ ...renderEmailChangeCode(input), to: input.email })
    }

    // Aviso al correo anterior. Es informativo: si falla, el cambio ya está confirmado.
    async sendEmailChangedNotice(input: { firstName: string; newEmail: string; previousEmail: string }) {
        try {
            await this.getProvider().send({ ...renderEmailChangedNotice(input), to: input.previousEmail })
        } catch (error) {
            logger.warn('email_change_notice_failed', describeError(error))
        }
    }
}
