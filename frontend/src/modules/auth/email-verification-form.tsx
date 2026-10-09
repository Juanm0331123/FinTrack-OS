'use client'

import { LoaderCircle, MailCheck, RefreshCw } from 'lucide-react'
import {
    type FormEvent,
    useEffect,
    useState,
} from 'react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'
import { AuthApiError, resendEmailCode, verifyEmailCode } from './auth.api'
import {
    isPendingVerificationExpired,
    maskEmailAddress,
} from './auth.storage'
import type {
    AuthenticatedResponse,
    PendingVerificationState,
} from './auth.types'
import { OneTimeCodeInput } from './one-time-code-input'

const CODE_LENGTH = 6

type EmailVerificationFormProps = {
    onCancelPendingVerification: () => void
    onPendingVerificationChange: (state: PendingVerificationState) => void
    onVerified: (session: AuthenticatedResponse) => void
    // Contraseña recién escrita en el registro o el login; null tras recargar la página.
    password?: string | null
    pendingVerification: PendingVerificationState
}

// Los códigos emitidos por un registro o login con contraseña solo activan la cuenta junto a esa
// contraseña. Los de Google o GitHub no la necesitan.
function requiresPassword(source: PendingVerificationState['source']) {
    return source === 'register' || source === 'login'
}

function getSourceCopy(source: PendingVerificationState['source']) {
    if (source === 'register') {
        return 'Tu cuenta ya fue creada. Falta confirmar el correo para activar el acceso.'
    }

    if (source === 'login') {
        return 'Tu cuenta existe, pero sigue pendiente la verificación obligatoria por correo.'
    }

    if (source === 'google') {
        return 'Google ya validó tu identidad. Ahora confirma tu correo con el código obligatorio.'
    }

    return 'GitHub ya validó tu identidad. Ahora confirma tu correo con el código obligatorio.'
}

function formatCountdownAt(expiresAt: string, now: number) {
    const differenceMs = Math.max(0, new Date(expiresAt).getTime() - now)
    const totalSeconds = Math.floor(differenceMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
}

export function EmailVerificationForm({
    onCancelPendingVerification,
    onPendingVerificationChange,
    onVerified,
    password = null,
    pendingVerification,
}: EmailVerificationFormProps) {
    const [code, setCode] = useState('')
    const [typedPassword, setTypedPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [infoMessage, setInfoMessage] = useState<string | null>(null)
    const [isResending, setIsResending] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [now, setNow] = useState(() => Date.now())

    const needsPassword = requiresPassword(pendingVerification.source)
    const askForPassword = needsPassword && !password
    const isExpired = isPendingVerificationExpired(pendingVerification.expiresAt)
    const timeLabel = formatCountdownAt(pendingVerification.expiresAt, now)

    useEffect(() => {
        const timeoutId = window.setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            window.clearInterval(timeoutId)
        }
    }, [pendingVerification.expiresAt])

    function handleCodeChange(nextCode: string) {
        setCode(nextCode)
        setErrorMessage(null)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isExpired) {
            setErrorMessage(
                'El código ya venció. Reenvía un correo nuevo antes de continuar.',
            )
            return
        }

        if (code.length !== CODE_LENGTH) {
            setErrorMessage('Ingresa los 6 dígitos del código para continuar.')
            return
        }

        if (askForPassword && !typedPassword) {
            setErrorMessage('Escribe la contraseña con la que creaste la cuenta.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        setInfoMessage(null)

        try {
            const session = await verifyEmailCode({
                code,
                email: pendingVerification.email,
                ...(needsPassword ? { password: password || typedPassword } : {}),
            })

            onVerified(session)
        } catch (error) {
            if (error instanceof AuthApiError) {
                if (error.code === 'EMAIL_VERIFICATION_EXPIRED') {
                    setErrorMessage(
                        'El código ya venció. Reenvía un correo nuevo para seguir.',
                    )
                    return
                }

                if (error.code === 'EMAIL_ALREADY_VERIFIED') {
                    setErrorMessage(
                        'Este correo ya fue verificado. Puedes volver a iniciar sesión si lo necesitas.',
                    )
                    return
                }

                setErrorMessage(error.message)
                return
            }

            setErrorMessage('No pudimos validar el código. Intenta de nuevo.')
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleResendCode() {
        setIsResending(true)
        setErrorMessage(null)
        setInfoMessage(null)

        try {
            const response = await resendEmailCode({
                email: pendingVerification.email,
            })

            const nextPendingVerification: PendingVerificationState = {
                email: response.email,
                expiresAt: response.expiresAt,
                source: pendingVerification.source,
                verificationCode: response.verificationCode,
            }

            setCode('')
            onPendingVerificationChange(nextPendingVerification)
            setInfoMessage('Enviamos un código nuevo a tu correo.')
        } catch (error) {
            if (error instanceof AuthApiError) {
                setErrorMessage(error.message)
                return
            }

            setErrorMessage('No pudimos reenviar el código. Intenta otra vez.')
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MailCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            Verificación obligatoria de correo
                        </p>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {getSourceCopy(pendingVerification.source)}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                            {maskEmailAddress(pendingVerification.email)}
                        </p>
                    </div>
                </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                            Ingresa el código de 6 dígitos
                        </p>
                        <p
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium',
                                isExpired
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-primary/10 text-primary',
                            )}
                        >
                            {isExpired ? 'Vencido' : `Vence en ${timeLabel}`}
                        </p>
                    </div>

                    <OneTimeCodeInput
                        value={code}
                        error={Boolean(errorMessage)}
                        onChange={handleCodeChange}
                    />
                </div>

                {askForPassword ? (
                    <div className="space-y-2">
                        <Label htmlFor="verification-password">Contraseña de la cuenta</Label>
                        <Input
                            id="verification-password"
                            type="password"
                            autoComplete="current-password"
                            value={typedPassword}
                            aria-describedby="verification-password-hint"
                            onChange={(event) => {
                                setTypedPassword(event.target.value)
                                setErrorMessage(null)
                            }}
                        />
                        <p id="verification-password-hint" className="text-sm text-muted-foreground">
                            Por seguridad, el código solo activa la cuenta junto con su contraseña.
                        </p>
                    </div>
                ) : null}

                {pendingVerification.verificationCode ? (
                    <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground">
                        Código de desarrollo: {pendingVerification.verificationCode}
                    </p>
                ) : null}

                {errorMessage ? (
                    <p
                        role="alert"
                        className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                        {errorMessage}
                    </p>
                ) : null}

                {infoMessage ? (
                    <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground">
                        {infoMessage}
                    </p>
                ) : null}

                <Button
                    type="submit"
                    variant="brand"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Validar correo y continuar
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isResending}
                        onClick={handleResendCode}
                    >
                        {isResending ? (
                            <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                        Reenviar código
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={onCancelPendingVerification}
                    >
                        Usar otro correo
                    </Button>
                </div>
            </form>
        </div>
    )
}
