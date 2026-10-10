'use client'

import { KeyRound, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { getBrowserSession } from '@/modules/auth/browser-session'
import { useFlowGuard } from '@/modules/auth/flow-guard'
import { fitsPasswordBytes, PASSWORD_TOO_LONG_MESSAGE } from '@/modules/auth/password-rules'
import { FtButton } from '../ui/button'
import { Field, inputClassName } from '../ui/fields'
import { Panel, PanelHeader } from '../ui/panel'
import { createAccountSecurity } from './account-security'

type Feedback = { kind: 'error' | 'success'; text: string } | null

function errorText(error: unknown) {
    return error instanceof Error && error.message ? error.message : 'No pudimos guardar el cambio. Intenta de nuevo.'
}

type AccountSecurity = ReturnType<typeof createAccountSecurity>

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
    if (!feedback) {
        return null
    }

    return (
        <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={feedback.kind === 'error' ? 'text-[13px] text-ft-neg' : 'text-[13px] text-ft-ink-2'}
        >
            {feedback.text}
        </p>
    )
}

function PasswordForm({ security }: { security: AccountSecurity }) {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [busy, setBusy] = useState(false)
    const [feedback, setFeedback] = useState<Feedback>(null)
    const guard = useFlowGuard()

    async function submit(event: FormEvent) {
        event.preventDefault()

        if (newPassword.length < 8) {
            setFeedback({ kind: 'error', text: 'La contraseña nueva debe tener al menos 8 caracteres.' })
            return
        }

        if (!fitsPasswordBytes(newPassword)) {
            setFeedback({ kind: 'error', text: PASSWORD_TOO_LONG_MESSAGE })
            return
        }

        if (newPassword !== confirmation) {
            setFeedback({ kind: 'error', text: 'Las contraseñas nuevas no coinciden.' })
            return
        }

        setBusy(true)
        setFeedback(null)

        const run = guard.begin()

        try {
            await security.changePassword({ currentPassword, newPassword }, run.signal)

            if (!run.isCurrent()) {
                return
            }

            setCurrentPassword('')
            setNewPassword('')
            setConfirmation('')
            setFeedback({ kind: 'success', text: 'Contraseña actualizada. Cerramos tus sesiones en otros dispositivos.' })
        } catch (error) {
            if (run.isCurrent()) {
                setFeedback({ kind: 'error', text: errorText(error) })
            }
        } finally {
            if (run.isCurrent()) {
                setBusy(false)
            }
        }
    }

    return (
        <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)} noValidate>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ft-ink">
                <KeyRound aria-hidden="true" className="size-4" />
                Cambiar contraseña
            </h3>
            <Field label="Contraseña actual" htmlFor="security-current-password">
                <input
                    id="security-current-password"
                    type="password"
                    autoComplete="current-password"
                    className={inputClassName}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Contraseña nueva" htmlFor="security-new-password" hint="Mínimo 8 caracteres.">
                    <input
                        id="security-new-password"
                        type="password"
                        autoComplete="new-password"
                        className={inputClassName}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                    />
                </Field>
                <Field label="Repite la contraseña nueva" htmlFor="security-confirm-password">
                    <input
                        id="security-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        className={inputClassName}
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        required
                    />
                </Field>
            </div>
            <FeedbackMessage feedback={feedback} />
            <FtButton type="submit" variant="secondary" className="self-start" disabled={busy || !currentPassword || !newPassword}>
                Actualizar contraseña
            </FtButton>
        </form>
    )
}

function EmailForm({ currentEmail, security }: { currentEmail: string; security: AccountSecurity }) {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [code, setCode] = useState('')
    const [pendingEmail, setPendingEmail] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [feedback, setFeedback] = useState<Feedback>(null)
    const guard = useFlowGuard()

    async function request(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setFeedback(null)

        const run = guard.begin()

        try {
            const response = await security.requestEmailChange({ currentPassword, newEmail: newEmail.trim() }, run.signal)

            if (!run.isCurrent()) {
                return
            }

            setPendingEmail(response.email)
            setCurrentPassword('')
            setFeedback({ kind: 'success', text: `Enviamos un código de 6 dígitos a ${response.email}.` })
        } catch (error) {
            if (run.isCurrent()) {
                setFeedback({ kind: 'error', text: errorText(error) })
            }
        } finally {
            if (run.isCurrent()) {
                setBusy(false)
            }
        }
    }

    async function confirm(event: FormEvent) {
        event.preventDefault()
        setBusy(true)
        setFeedback(null)

        const run = guard.begin()

        try {
            await security.confirmEmailChange({ code: code.trim() }, run.signal)

            if (!run.isCurrent()) {
                return
            }

            setPendingEmail(null)
            setNewEmail('')
            setCode('')
            setFeedback({ kind: 'success', text: 'Correo actualizado. Cerramos tus sesiones en otros dispositivos.' })
        } catch (error) {
            if (run.isCurrent()) {
                setFeedback({ kind: 'error', text: errorText(error) })
            }
        } finally {
            if (run.isCurrent()) {
                setBusy(false)
            }
        }
    }

    if (pendingEmail) {
        return (
            <form className="flex flex-col gap-3" onSubmit={(event) => void confirm(event)} noValidate>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ft-ink">
                    <Mail aria-hidden="true" className="size-4" />
                    Confirma tu nuevo correo
                </h3>
                <Field label="Código enviado a tu nuevo correo" htmlFor="security-email-code">
                    <input
                        id="security-email-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        className={inputClassName}
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                        required
                    />
                </Field>
                <FeedbackMessage feedback={feedback} />
                <div className="flex flex-wrap gap-2">
                    <FtButton type="submit" variant="secondary" disabled={busy || code.length !== 6}>
                        Confirmar correo
                    </FtButton>
                    <FtButton
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            guard.invalidate()
                            setBusy(false)
                            setPendingEmail(null)
                        }}
                    >
                        Cancelar
                    </FtButton>
                </div>
            </form>
        )
    }

    return (
        <form className="flex flex-col gap-3" onSubmit={(event) => void request(event)} noValidate>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ft-ink">
                <Mail aria-hidden="true" className="size-4" />
                Cambiar correo de acceso
            </h3>
            <p className="text-[13px] text-ft-ink-2">Correo actual: {currentEmail}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Correo nuevo" htmlFor="security-new-email">
                    <input
                        id="security-new-email"
                        type="email"
                        autoComplete="off"
                        className={inputClassName}
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        required
                    />
                </Field>
                <Field label="Contraseña actual" htmlFor="security-email-password">
                    <input
                        id="security-email-password"
                        type="password"
                        autoComplete="current-password"
                        className={inputClassName}
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        required
                    />
                </Field>
            </div>
            <FeedbackMessage feedback={feedback} />
            <FtButton type="submit" variant="secondary" className="self-start" disabled={busy || !newEmail.trim() || !currentPassword}>
                Enviar código
            </FtButton>
        </form>
    )
}

export function AccountSecurityPanel({ currentEmail, userId }: { currentEmail: string; userId: string }) {
    const [security] = useState(() => createAccountSecurity({ session: getBrowserSession(), userId }))

    return (
        <Panel aria-labelledby="security-settings">
            <PanelHeader id="security-settings" title="Seguridad de la cuenta" aside="Pide tu contraseña actual" />
            <div className="flex flex-col gap-6 px-4 pb-5 sm:px-[18px]">
                <PasswordForm security={security} />
                <div className="border-t border-ft-line-soft pt-5">
                    <EmailForm currentEmail={currentEmail} security={security} />
                </div>
                <p className="text-[12.5px] leading-5 text-ft-ink-3">
                    Si entras con Google o GitHub y nunca creaste una contraseña, usa “Olvidé mi contraseña” en la
                    pantalla de acceso para definir una.
                </p>
            </div>
        </Panel>
    )
}
