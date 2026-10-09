export type RenderedEmail = {
    html: string
    subject: string
    text: string
}

type CodeTemplateInput = {
    code: string
    email: string
    expiresAt: Date
    firstName: string
}

type CodeTemplate = {
    accent: { background: string; border: string; label: string }
    codeLabel: string
    heading: string
    ignoreNote: string
    intro: string
    subject: string
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function minutesUntil(expiresAt: Date) {
    return Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60_000))
}

function renderCodeEmail(template: CodeTemplate, input: CodeTemplateInput): RenderedEmail {
    const minutes = minutesUntil(input.expiresAt)
    const expiry = `Este código vence en ${minutes} minutos y solo funciona para`

    return {
        html: `
        <div style="background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe4f0">
            <p style="margin:0 0 16px;font-size:14px;color:#475569">FinTrack OS</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">${template.heading}</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155">
              Hola ${escapeHtml(input.firstName)}, ${template.intro}
            </p>
            <div style="margin:0 0 20px;padding:18px 20px;border-radius:16px;background:${template.accent.background};border:1px solid ${template.accent.border};text-align:center">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${template.accent.label}">${template.codeLabel}</p>
              <p style="margin:0;font-size:36px;line-height:1;font-weight:700;letter-spacing:.24em;color:#0f172a">${escapeHtml(input.code)}</p>
            </div>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155">
              ${expiry} <strong>${escapeHtml(input.email)}</strong>.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b">${template.ignoreNote}</p>
          </div>
        </div>`.trim(),
        subject: template.subject,
        text: [
            'FinTrack OS',
            '',
            `Hola ${input.firstName},`,
            '',
            `${template.codeLabel}: ${input.code}`,
            `${expiry} ${input.email}.`,
            '',
            template.ignoreNote,
        ].join('\n'),
    }
}

export function renderVerificationCode(input: CodeTemplateInput) {
    return renderCodeEmail(
        {
            accent: { background: '#eef4ff', border: '#bfdbfe', label: '#1d4ed8' },
            codeLabel: 'Código de verificación',
            heading: 'Verifica tu correo',
            ignoreNote: 'Si no solicitaste este acceso, puedes ignorar este correo.',
            intro: 'usa este código para completar tu acceso a FinTrack OS.',
            subject: 'Tu código de verificación de FinTrack OS',
        },
        input,
    )
}

export function renderPasswordResetCode(input: CodeTemplateInput) {
    return renderCodeEmail(
        {
            accent: { background: '#fff6eb', border: '#fdba74', label: '#c2410c' },
            codeLabel: 'Código de recuperación',
            heading: 'Recupera tu contraseña',
            ignoreNote: 'Si no solicitaste cambiar tu contraseña, puedes ignorar este correo y tu cuenta seguirá igual.',
            intro: 'usa este código para continuar con el cambio de contraseña.',
            subject: 'Tu código para recuperar la contraseña de FinTrack OS',
        },
        input,
    )
}

export function renderEmailChangeCode(input: CodeTemplateInput) {
    return renderCodeEmail(
        {
            accent: { background: '#eef4ff', border: '#bfdbfe', label: '#1d4ed8' },
            codeLabel: 'Código para confirmar tu nuevo correo',
            heading: 'Confirma tu nuevo correo',
            ignoreNote: 'Si no pediste este cambio, ignora este correo: tu cuenta no cambiará.',
            intro: 'usa este código en FinTrack OS para confirmar que este será tu correo de acceso.',
            subject: 'Confirma tu nuevo correo de FinTrack OS',
        },
        input,
    )
}

export function renderEmailChangedNotice(input: { firstName: string; newEmail: string }): RenderedEmail {
    const message = `El correo de acceso de tu cuenta de FinTrack OS cambió a ${input.newEmail}. Si no fuiste tú, recupera tu contraseña desde el nuevo correo o responde a este mensaje.`

    return {
        html: `
        <div style="background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe4f0">
            <p style="margin:0 0 16px;font-size:14px;color:#475569">FinTrack OS</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a">Tu correo de acceso cambió</h1>
            <p style="margin:0;font-size:16px;line-height:1.6;color:#334155">Hola ${escapeHtml(input.firstName)}, ${escapeHtml(message)}</p>
          </div>
        </div>`.trim(),
        subject: 'El correo de tu cuenta de FinTrack OS cambió',
        text: ['FinTrack OS', '', `Hola ${input.firstName},`, '', message].join('\n'),
    }
}
