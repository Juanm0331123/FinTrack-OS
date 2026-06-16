import nodemailer from 'nodemailer'
import { env } from '../../config/env.ts'
import { ServiceUnavailableError } from '../../utils/app-error.ts'

type SendVerificationCodeEmailInput = {
    code: string
    email: string
    expiresAt: Date
    firstName: string
}

type SendPasswordResetCodeEmailInput = {
    code: string
    email: string
    expiresAt: Date
    firstName: string
}

type EmailProvider = {
    sendPasswordResetCodeEmail(input: SendPasswordResetCodeEmailInput): Promise<void>
    sendVerificationCodeEmail(input: SendVerificationCodeEmailInput): Promise<void>
}

class ConsoleEmailProvider implements EmailProvider {
    async sendVerificationCodeEmail(input: SendVerificationCodeEmailInput) {
        console.info(
            `Email verification code for ${input.email}: ${input.code} (expires ${input.expiresAt.toISOString()})`,
        )
    }

    async sendPasswordResetCodeEmail(input: SendPasswordResetCodeEmailInput) {
        console.info(
            `Password reset code for ${input.email}: ${input.code} (expires ${input.expiresAt.toISOString()})`,
        )
    }
}

class ResendEmailProvider implements EmailProvider {
    private readonly apiKey: string
    private readonly from: string
    private readonly replyTo?: string

    constructor() {
        if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
            throw new ServiceUnavailableError(
                'Email delivery is not configured.',
                'EMAIL_DELIVERY_UNAVAILABLE',
            )
        }

        this.apiKey = env.RESEND_API_KEY
        this.from = env.EMAIL_FROM
        this.replyTo = env.EMAIL_REPLY_TO
    }

    async sendVerificationCodeEmail(input: SendVerificationCodeEmailInput) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.from,
                to: [input.email],
                subject: 'Tu codigo de verificacion de FinTrack OS',
                html: this.renderVerificationEmailHtml(input),
                text: this.renderVerificationEmailText(input),
                ...(this.replyTo ? { reply_to: this.replyTo } : {}),
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()

            throw new ServiceUnavailableError(
                env.NODE_ENV === 'production'
                    ? 'Email delivery is temporarily unavailable.'
                    : `Email delivery failed. ${errorText}`,
                'EMAIL_DELIVERY_FAILED',
            )
        }
    }

    async sendPasswordResetCodeEmail(input: SendPasswordResetCodeEmailInput) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: this.from,
                to: [input.email],
                subject: 'Tu codigo para recuperar la contrasena de FinTrack OS',
                html: renderPasswordResetEmailHtml(input),
                text: renderPasswordResetEmailText(input),
                ...(this.replyTo ? { reply_to: this.replyTo } : {}),
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()

            throw new ServiceUnavailableError(
                env.NODE_ENV === 'production'
                    ? 'Email delivery is temporarily unavailable.'
                    : `Email delivery failed. ${errorText}`,
                'EMAIL_DELIVERY_FAILED',
            )
        }
    }

    private renderVerificationEmailHtml(input: SendVerificationCodeEmailInput) {
        return renderVerificationEmailHtml(input)
    }

    private renderVerificationEmailText(input: SendVerificationCodeEmailInput) {
        return renderVerificationEmailText(input)
    }
}

class GmailEmailProvider implements EmailProvider {
    private readonly from: string
    private readonly replyTo?: string
    private readonly transporter: nodemailer.Transporter

    constructor() {
        const from = env.EMAIL_FROM?.trim() || 'FinTrack OS <fintrackos.auth@gmail.com>'
        const gmailAddress = extractEmailAddress(from)

        if (!gmailAddress || !env.EMAIL_PASSWORD) {
            throw new ServiceUnavailableError(
                'Email delivery is not configured.',
                'EMAIL_DELIVERY_UNAVAILABLE',
            )
        }

        this.from = from
        this.replyTo = env.EMAIL_REPLY_TO
        this.transporter = nodemailer.createTransport({
            auth: {
                pass: env.EMAIL_PASSWORD,
                user: gmailAddress,
            },
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
        })
    }

    async sendVerificationCodeEmail(input: SendVerificationCodeEmailInput) {
        try {
            await this.transporter.sendMail({
                from: this.from,
                to: input.email,
                subject: 'Tu codigo de verificacion de FinTrack OS',
                html: renderVerificationEmailHtml(input),
                text: renderVerificationEmailText(input),
                ...(this.replyTo ? { replyTo: this.replyTo } : {}),
            })
        } catch (error) {
            throw new ServiceUnavailableError(
                env.NODE_ENV === 'production'
                    ? 'Email delivery is temporarily unavailable.'
                    : `Email delivery failed. ${error instanceof Error ? error.message : 'Unknown SMTP error.'}`,
                'EMAIL_DELIVERY_FAILED',
            )
        }
    }

    async sendPasswordResetCodeEmail(input: SendPasswordResetCodeEmailInput) {
        try {
            await this.transporter.sendMail({
                from: this.from,
                to: input.email,
                subject: 'Tu codigo para recuperar la contrasena de FinTrack OS',
                html: renderPasswordResetEmailHtml(input),
                text: renderPasswordResetEmailText(input),
                ...(this.replyTo ? { replyTo: this.replyTo } : {}),
            })
        } catch (error) {
            throw new ServiceUnavailableError(
                env.NODE_ENV === 'production'
                    ? 'Email delivery is temporarily unavailable.'
                    : `Email delivery failed. ${error instanceof Error ? error.message : 'Unknown SMTP error.'}`,
                'EMAIL_DELIVERY_FAILED',
            )
        }
    }
}

function renderVerificationEmailHtml(input: SendVerificationCodeEmailInput) {
    return `
        <div style="background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe4f0">
            <p style="margin:0 0 16px;font-size:14px;color:#475569">FinTrack OS</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">Verifica tu correo</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155">
              Hola ${escapeHtml(input.firstName)}, usa este codigo para completar tu acceso a FinTrack OS.
            </p>
            <div style="margin:0 0 20px;padding:18px 20px;border-radius:16px;background:#eef4ff;border:1px solid #bfdbfe;text-align:center">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#1d4ed8">Codigo de verificacion</p>
              <p style="margin:0;font-size:36px;line-height:1;font-weight:700;letter-spacing:.24em;color:#0f172a">${input.code}</p>
            </div>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155">
              Este codigo vence en 10 minutos y solo funciona para <strong>${escapeHtml(input.email)}</strong>.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b">
              Si no solicitaste este acceso, puedes ignorar este correo.
            </p>
          </div>
        </div>
    `.trim()
}

function renderVerificationEmailText(input: SendVerificationCodeEmailInput) {
    return [
        'FinTrack OS',
        '',
        `Hola ${input.firstName},`,
        '',
        `Tu codigo de verificacion es: ${input.code}`,
        `Este codigo vence en 10 minutos y solo funciona para ${input.email}.`,
        '',
        'Si no solicitaste este acceso, puedes ignorar este correo.',
    ].join('\n')
}

function renderPasswordResetEmailHtml(input: SendPasswordResetCodeEmailInput) {
    return `
        <div style="background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe4f0">
            <p style="margin:0 0 16px;font-size:14px;color:#475569">FinTrack OS</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">Recupera tu contrasena</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155">
              Hola ${escapeHtml(input.firstName)}, usa este codigo para continuar con el cambio de contrasena.
            </p>
            <div style="margin:0 0 20px;padding:18px 20px;border-radius:16px;background:#fff6eb;border:1px solid #fdba74;text-align:center">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#c2410c">Codigo de recuperacion</p>
              <p style="margin:0;font-size:36px;line-height:1;font-weight:700;letter-spacing:.24em;color:#0f172a">${input.code}</p>
            </div>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155">
              Este codigo vence en 10 minutos y solo funciona para <strong>${escapeHtml(input.email)}</strong>.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b">
              Si no solicitaste cambiar tu contrasena, puedes ignorar este correo y tu cuenta seguira igual.
            </p>
          </div>
        </div>
    `.trim()
}

function renderPasswordResetEmailText(input: SendPasswordResetCodeEmailInput) {
    return [
        'FinTrack OS',
        '',
        `Hola ${input.firstName},`,
        '',
        `Tu codigo para recuperar la contrasena es: ${input.code}`,
        `Este codigo vence en 10 minutos y solo funciona para ${input.email}.`,
        '',
        'Si no solicitaste este cambio, puedes ignorar este correo y tu cuenta seguira igual.',
    ].join('\n')
}

function extractEmailAddress(value: string) {
    const match = value.match(/<([^>]+)>/)

    if (match?.[1]) {
        return match[1].trim()
    }

    return value.includes('@') ? value.trim() : null
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

export class EmailService {
    private readonly provider: EmailProvider

    constructor() {
        if (env.EMAIL_PROVIDER === 'gmail') {
            this.provider = new GmailEmailProvider()
            return
        }

        if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY && env.EMAIL_FROM) {
            this.provider = new ResendEmailProvider()
            return
        }

        if (!env.EMAIL_PROVIDER) {
            if (env.NODE_ENV === 'production') {
                throw new ServiceUnavailableError(
                    'Email delivery is not configured.',
                    'EMAIL_DELIVERY_UNAVAILABLE',
                )
            }

            this.provider = new ConsoleEmailProvider()
            return
        }

        throw new ServiceUnavailableError(
            'Email delivery is not configured.',
            'EMAIL_DELIVERY_UNAVAILABLE',
        )
    }

    sendVerificationCodeEmail(input: SendVerificationCodeEmailInput) {
        return this.provider.sendVerificationCodeEmail(input)
    }

    sendPasswordResetCodeEmail(input: SendPasswordResetCodeEmailInput) {
        return this.provider.sendPasswordResetCodeEmail(input)
    }
}
