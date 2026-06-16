'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    LoaderCircle,
    LockKeyhole,
    Mail,
    RotateCcw,
    ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import {
    AuthApiError,
    requestPasswordReset,
    resetPassword,
    verifyPasswordResetCode,
} from '../auth.api'
import { maskEmailAddress } from '../auth.storage'
import { OneTimeCodeInput } from '../one-time-code-input'
import {
    forgotPasswordRequestSchema,
    forgotPasswordResetSchema,
    type ForgotPasswordRequestValues,
    type ForgotPasswordResetValues,
} from './forgot-password.schema'

type PasswordResetRequestState = {
    email: string
    expiresAt: string
}

type PasswordResetSessionState = {
    email: string
    resetToken: string
    resetTokenExpiresAt: string
}

type StepId = 'request' | 'verify' | 'reset'

const CODE_LENGTH = 6

function formatCountdown(expiresAt: string) {
    const remainingMs = Math.max(0, new Date(expiresAt).getTime() - Date.now())
    const totalSeconds = Math.floor(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
}

function StepRail({ step }: { step: StepId }) {
    const stepIndex = step === 'request' ? 1 : step === 'verify' ? 2 : 3
    const steps = [
        {
            id: 'request',
            label: 'Correo',
        },
        {
            id: 'verify',
            label: 'Codigo',
        },
        {
            id: 'reset',
            label: 'Nueva contrasena',
        },
    ] as const

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                {steps.map((item, index) => {
                    const status =
                        index + 1 < stepIndex
                            ? 'complete'
                            : index + 1 === stepIndex
                              ? 'current'
                              : 'upcoming'

                    return (
                        <div
                            key={item.id}
                            className="flex min-w-0 flex-1 items-center gap-3"
                        >
                            <div
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition',
                                    status === 'complete' &&
                                        'border-primary bg-primary text-primary-foreground',
                                    status === 'current' &&
                                        'border-primary/30 bg-primary/10 text-primary',
                                    status === 'upcoming' &&
                                        'border-border bg-background text-muted-foreground',
                                )}
                            >
                                {index + 1}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {item.label}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
            <Progress value={(stepIndex / steps.length) * 100} className="h-1.5" />
        </div>
    )
}

export function ForgotPasswordFlow() {
    const [code, setCode] = useState('')
    const [requestState, setRequestState] =
        useState<PasswordResetRequestState | null>(null)
    const [requestError, setRequestError] = useState<string | null>(null)
    const [requestInfo, setRequestInfo] = useState<string | null>(null)
    const [resetError, setResetError] = useState<string | null>(null)
    const [resetInfo, setResetInfo] = useState<string | null>(null)
    const [resetState, setResetState] =
        useState<PasswordResetSessionState | null>(null)
    const [isResendingCode, setIsResendingCode] = useState(false)
    const [isVerifyingCode, setIsVerifyingCode] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [successEmail, setSuccessEmail] = useState<string | null>(null)
    const emailForm = useForm<ForgotPasswordRequestValues>({
        defaultValues: {
            email: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(forgotPasswordRequestSchema),
    })
    const passwordForm = useForm<ForgotPasswordResetValues>({
        defaultValues: {
            confirmPassword: '',
            password: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(forgotPasswordResetSchema),
    })

    const currentStep: StepId = resetState
        ? 'reset'
        : requestState
          ? 'verify'
          : 'request'
    const isCodeExpired = requestState
        ? new Date(requestState.expiresAt).getTime() <= now
        : false
    const isResetSessionExpired = resetState
        ? new Date(resetState.resetTokenExpiresAt).getTime() <= now
        : false

    useEffect(() => {
        if (!requestState && !resetState) {
            return
        }

        const timerId = window.setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            window.clearInterval(timerId)
        }
    }, [requestState, resetState])

    useEffect(() => {
        if (!resetState) {
            return
        }

        const frameId = window.requestAnimationFrame(() => {
            passwordForm.setFocus('password')
        })

        return () => {
            window.cancelAnimationFrame(frameId)
        }
    }, [passwordForm, resetState])

    function restartFlow(options?: { email?: string; message?: string }) {
        setCode('')
        setRequestState(null)
        setRequestError(null)
        setResetError(null)
        setResetState(null)
        setSuccessEmail(null)
        setRequestInfo(options?.message ?? null)
        setResetInfo(null)
        passwordForm.reset()

        if (options?.email) {
            emailForm.setValue('email', options.email, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            })
        }
    }

    async function handleRequestSubmit(values: ForgotPasswordRequestValues) {
        setRequestError(null)
        setRequestInfo(null)

        try {
            const response = await requestPasswordReset({
                email: values.email,
            })

            setCode('')
            setResetState(null)
            setRequestState({
                email: response.email,
                expiresAt: response.expiresAt,
            })
            setRequestInfo(
                'Si encontramos una cuenta asociada, enviamos un codigo de 6 digitos al correo indicado.',
            )
        } catch (error) {
            setRequestError(
                error instanceof Error
                    ? error.message
                    : 'No pudimos iniciar la recuperacion. Intenta nuevamente.',
            )
        }
    }

    async function handleResendCode() {
        if (!requestState) {
            return
        }

        setIsResendingCode(true)
        setRequestError(null)
        setRequestInfo(null)
        setResetState(null)
        setResetError(null)
        setResetInfo(null)
        setCode('')

        try {
            const response = await requestPasswordReset({
                email: requestState.email,
            })

            setRequestState({
                email: response.email,
                expiresAt: response.expiresAt,
            })
            setRequestInfo(
                'Generamos un codigo nuevo. El anterior ya no funciona.',
            )
        } catch (error) {
            setRequestError(
                error instanceof Error
                    ? error.message
                    : 'No pudimos enviar otro codigo. Intenta nuevamente.',
            )
        } finally {
            setIsResendingCode(false)
        }
    }

    async function handleVerifyCode() {
        if (!requestState) {
            return
        }

        if (isCodeExpired) {
            setRequestError(
                'El codigo ya vencio. Solicita uno nuevo para continuar.',
            )
            return
        }

        if (code.length !== CODE_LENGTH) {
            setRequestError('Ingresa los 6 digitos para continuar.')
            return
        }

        setIsVerifyingCode(true)
        setRequestError(null)

        try {
            const response = await verifyPasswordResetCode({
                code,
                email: requestState.email,
            })

            setResetState({
                email: response.email,
                resetToken: response.resetToken,
                resetTokenExpiresAt: response.resetTokenExpiresAt,
            })
            setCode('')
            setResetInfo(
                'Codigo validado. Ahora define una contrasena nueva para tu cuenta.',
            )
        } catch (error) {
            if (error instanceof AuthApiError) {
                if (error.code === 'PASSWORD_RESET_CODE_EXPIRED') {
                    setRequestError(
                        'El codigo ya vencio. Solicita uno nuevo para seguir.',
                    )
                    return
                }

                setRequestError(error.message)
                return
            }

            setRequestError('No pudimos validar el codigo. Intenta nuevamente.')
        } finally {
            setIsVerifyingCode(false)
        }
    }

    async function handleResetSubmit(values: ForgotPasswordResetValues) {
        if (!resetState) {
            return
        }

        if (isResetSessionExpired) {
            setResetError(
                'La sesion de recuperacion ya vencio. Solicita un codigo nuevo.',
            )
            return
        }

        setResetError(null)
        setResetInfo(null)

        try {
            await resetPassword({
                email: resetState.email,
                password: values.password,
                resetToken: resetState.resetToken,
            })

            setSuccessEmail(resetState.email)
            setCode('')
            setRequestState(null)
            setResetState(null)
            setResetInfo(null)
            passwordForm.reset()
        } catch (error) {
            if (error instanceof AuthApiError) {
                if (
                    error.code === 'PASSWORD_RESET_TOKEN_EXPIRED' ||
                    error.code === 'PASSWORD_RESET_TOKEN_INVALID'
                ) {
                    setResetError(
                        'La autorizacion para cambiar la contrasena ya no es valida. Solicita un codigo nuevo.',
                    )
                    return
                }

                setResetError(error.message)
                return
            }

            setResetError(
                'No pudimos guardar la nueva contrasena. Intenta nuevamente.',
            )
        }
    }

    if (successEmail) {
        return (
            <div className="space-y-6">
                <div className="rounded-[1.4rem] border border-primary/15 bg-primary/7 p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                            <CheckCircle2 className="size-5" aria-hidden="true" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-base font-semibold text-foreground">
                                Contrasena actualizada
                            </p>
                            <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
                                La cuenta {maskEmailAddress(successEmail)} ya tiene
                                una nueva contrasena. Cerramos las sesiones activas
                                anteriores por seguridad.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Button asChild variant="brand" className="w-full">
                        <Link href={APP_ROUTES.login}>Volver al login</Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                            restartFlow({
                                email: successEmail,
                                message:
                                    'Si necesitas volver a solicitar otro cambio, puedes hacerlo desde aqui.',
                            })
                        }
                    >
                        Hacer otro intento
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <StepRail step={currentStep} />

            {currentStep === 'request' ? (
                <div className="space-y-5">
                    <div className="rounded-[1.4rem] border border-border/80 bg-muted/35 p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <ShieldCheck className="size-5" aria-hidden="true" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-base font-semibold text-foreground">
                                    Recuperacion protegida por codigo
                                </p>
                                <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
                                    Escribe tu correo y, si existe una cuenta
                                    asociada, enviaremos un codigo valido por 10
                                    minutos para autorizar el cambio.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        className="space-y-5"
                        onSubmit={emailForm.handleSubmit(handleRequestSubmit)}
                        noValidate
                    >
                        {requestError ? (
                            <p
                                role="alert"
                                className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            >
                                {requestError}
                            </p>
                        ) : null}

                        {requestInfo ? (
                            <p className="rounded-xl border border-primary/15 bg-primary/8 px-3 py-2 text-sm text-foreground">
                                {requestInfo}
                            </p>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="forgot-password-email">
                                Correo electronico
                            </Label>
                            <div className="relative">
                                <Mail
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    id="forgot-password-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="tu@email.com"
                                    aria-invalid={Boolean(emailForm.formState.errors.email)}
                                    aria-describedby={
                                        emailForm.formState.errors.email
                                            ? 'forgot-password-email-error'
                                            : 'forgot-password-email-help'
                                    }
                                    className="pl-10"
                                    {...emailForm.register('email')}
                                />
                            </div>
                            {emailForm.formState.errors.email ? (
                                <p
                                    id="forgot-password-email-error"
                                    className="text-sm text-destructive"
                                >
                                    {emailForm.formState.errors.email.message}
                                </p>
                            ) : (
                                <p
                                    id="forgot-password-email-help"
                                    className="text-sm leading-6 text-muted-foreground"
                                >
                                    Por privacidad, siempre mostraremos la misma
                                    confirmacion aunque el correo no exista.
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            variant="brand"
                            className="w-full"
                            disabled={emailForm.formState.isSubmitting}
                        >
                            {emailForm.formState.isSubmitting ? (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <KeyRound className="size-4" aria-hidden="true" />
                            )}
                            Enviar codigo de recuperacion
                        </Button>
                    </form>
                </div>
            ) : null}

            {currentStep === 'verify' && requestState ? (
                <div className="space-y-5">
                    <div className="rounded-[1.4rem] border border-border/80 bg-muted/35 p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                <LockKeyhole className="size-5" aria-hidden="true" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-foreground">
                                        Revisa tu correo
                                    </p>
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-medium',
                                            isCodeExpired
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-primary/10 text-primary',
                                        )}
                                    >
                                        {isCodeExpired
                                            ? 'Codigo vencido'
                                            : `Vence en ${formatCountdown(requestState.expiresAt)}`}
                                    </span>
                                </div>
                                <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
                                    Ingresa el codigo enviado a{' '}
                                    <span className="font-medium text-foreground">
                                        {maskEmailAddress(requestState.email)}
                                    </span>
                                    . Si sales de esta ruta, el proceso se reinicia y
                                    podras solicitar uno nuevo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {requestError ? (
                        <p
                            id="forgot-password-code-error"
                            role="alert"
                            className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        >
                            {requestError}
                        </p>
                    ) : null}

                    {requestInfo ? (
                        <p className="rounded-xl border border-primary/15 bg-primary/8 px-3 py-2 text-sm text-foreground">
                            {requestInfo}
                        </p>
                    ) : null}

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">
                            Ingresa el codigo de 6 digitos
                        </p>
                        <OneTimeCodeInput
                            value={code}
                            error={Boolean(requestError)}
                            describedBy={
                                requestError ? 'forgot-password-code-error' : undefined
                            }
                            onChange={(nextCode) => {
                                setCode(nextCode)
                                setRequestError(null)
                            }}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                            type="button"
                            variant="brand"
                            className="w-full"
                            disabled={code.length !== CODE_LENGTH || isVerifyingCode}
                            onClick={handleVerifyCode}
                        >
                            {isVerifyingCode ? (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : null}
                            Validar codigo
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={isResendingCode}
                            onClick={handleResendCode}
                        >
                            {isResendingCode ? (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : null}
                            Solicitar codigo nuevo
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() =>
                            restartFlow({
                                email: requestState.email,
                                message:
                                    'El flujo se reinicio. Puedes solicitar un nuevo codigo cuando quieras.',
                            })
                        }
                    >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Volver a empezar
                    </Button>
                </div>
            ) : null}

            {currentStep === 'reset' && resetState ? (
                <div className="space-y-5">
                    <div className="rounded-[1.4rem] border border-primary/15 bg-[linear-gradient(180deg,oklch(0.99_0.004_255),oklch(0.965_0.014_252))] p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                                <LockKeyhole className="size-5" aria-hidden="true" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-foreground">
                                        Define una contrasena nueva
                                    </p>
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-medium',
                                            isResetSessionExpired
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-primary/10 text-primary',
                                        )}
                                    >
                                        {isResetSessionExpired
                                            ? 'Sesion vencida'
                                            : `Autorizacion activa ${formatCountdown(resetState.resetTokenExpiresAt)}`}
                                    </span>
                                </div>
                                <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
                                    El cambio aplicara a{' '}
                                    <span className="font-medium text-foreground">
                                        {maskEmailAddress(resetState.email)}
                                    </span>
                                    . Al guardar, cerraremos las sesiones anteriores
                                    para proteger la cuenta.
                                </p>
                            </div>
                        </div>
                    </div>

                    {resetError ? (
                        <p
                            role="alert"
                            className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        >
                            {resetError}
                        </p>
                    ) : null}

                    {resetInfo ? (
                        <p className="rounded-xl border border-primary/15 bg-primary/8 px-3 py-2 text-sm text-foreground">
                            {resetInfo}
                        </p>
                    ) : null}

                    <form
                        className="space-y-5"
                        onSubmit={passwordForm.handleSubmit(handleResetSubmit)}
                        noValidate
                    >
                        <div className="space-y-2">
                            <Label htmlFor="forgot-password-new-password">
                                Nueva contrasena
                            </Label>
                            <div className="relative">
                                <Input
                                    id="forgot-password-new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Minimo 8 caracteres"
                                    aria-invalid={Boolean(
                                        passwordForm.formState.errors.password,
                                    )}
                                    aria-describedby={
                                        passwordForm.formState.errors.password
                                            ? 'forgot-password-new-password-error'
                                            : 'forgot-password-new-password-help'
                                    }
                                    className="pr-12"
                                    {...passwordForm.register('password')}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-1/2 size-11 -translate-y-1/2"
                                    aria-label={
                                        showPassword
                                            ? 'Ocultar contrasena'
                                            : 'Mostrar contrasena'
                                    }
                                    onClick={() =>
                                        setShowPassword((current) => !current)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
                                    )}
                                </Button>
                            </div>
                            {passwordForm.formState.errors.password ? (
                                <p
                                    id="forgot-password-new-password-error"
                                    className="text-sm text-destructive"
                                >
                                    {passwordForm.formState.errors.password.message}
                                </p>
                            ) : (
                                <p
                                    id="forgot-password-new-password-help"
                                    className="text-sm leading-6 text-muted-foreground"
                                >
                                    Usa una contrasena distinta a la anterior y facil
                                    de recordar para ti.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="forgot-password-confirm-password">
                                Confirmar contrasena
                            </Label>
                            <div className="relative">
                                <Input
                                    id="forgot-password-confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Repite tu nueva contrasena"
                                    aria-invalid={Boolean(
                                        passwordForm.formState.errors.confirmPassword,
                                    )}
                                    aria-describedby={
                                        passwordForm.formState.errors
                                            .confirmPassword
                                            ? 'forgot-password-confirm-password-error'
                                            : undefined
                                    }
                                    className="pr-12"
                                    {...passwordForm.register('confirmPassword')}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-1/2 size-11 -translate-y-1/2"
                                    aria-label={
                                        showConfirmPassword
                                            ? 'Ocultar confirmacion de contrasena'
                                            : 'Mostrar confirmacion de contrasena'
                                    }
                                    onClick={() =>
                                        setShowConfirmPassword((current) => !current)
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
                                    )}
                                </Button>
                            </div>
                            {passwordForm.formState.errors.confirmPassword ? (
                                <p
                                    id="forgot-password-confirm-password-error"
                                    className="text-sm text-destructive"
                                >
                                    {
                                        passwordForm.formState.errors.confirmPassword
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                                type="submit"
                                variant="brand"
                                className="w-full"
                                disabled={passwordForm.formState.isSubmitting}
                            >
                                {passwordForm.formState.isSubmitting ? (
                                    <LoaderCircle
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                Guardar nueva contrasena
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={isResendingCode}
                                onClick={handleResendCode}
                            >
                                {isResendingCode ? (
                                    <LoaderCircle
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : null}
                                Solicitar codigo nuevo
                            </Button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    )
}
