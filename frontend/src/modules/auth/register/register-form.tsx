'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, Mail, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { APP_ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { AuthApiError, registerWithEmail } from '../auth.api'
import { EmailVerificationForm } from '../email-verification-form'
import {
    clearPendingVerification,
    loadPendingVerification,
    savePendingVerification,
} from '../auth.storage'
import type { AuthenticatedResponse, PendingVerificationState } from '../auth.types'
import { getBrowserSession } from '../browser-session'
import { AuthSocialButtons } from '../auth-social-buttons'
import { useFlowGuard } from '../flow-guard'
import { createSingleFlight } from '../single-flight'
import {
    registerSchema,
    type RegisterFormValues,
} from './register.schema'

export function RegisterForm() {
    const router = useRouter()
    const [pendingVerification, setPendingVerification] =
        useState<PendingVerificationState | null>(() => loadPendingVerification())
    const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null)
    // Solo en memoria: el backend exige la contraseña junto al código para activar la cuenta.
    const [verificationPassword, setVerificationPassword] = useState<string | null>(null)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [submission] = useState(createSingleFlight)
    // Al desmontar (p. ej. navegar a otra página) una respuesta tardía no adopta sesión ni cambia de paso.
    const guard = useFlowGuard()
    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
    } = useForm<RegisterFormValues>({
        defaultValues: {
            confirmPassword: '',
            email: '',
            firstName: '',
            lastName: '',
            password: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(registerSchema),
    })

    function handlePendingVerificationChange(nextState: PendingVerificationState) {
        setServerErrorMessage(null)
        savePendingVerification(nextState)
        setPendingVerification(nextState)
    }

    function handlePendingVerificationClear() {
        clearPendingVerification()
        setPendingVerification(null)
        setVerificationPassword(null)
    }

    function handleAuthenticated(session: AuthenticatedResponse) {
        clearPendingVerification()
        setVerificationPassword(null)
        getBrowserSession().setSession(session)
        router.replace(APP_ROUTES.dashboard)
    }

    function onSubmit(values: RegisterFormValues) {
        return submission.run(() => submit(values))
    }

    async function submit(values: RegisterFormValues) {
        setServerErrorMessage(null)

        const run = guard.begin()

        try {
            const response = await registerWithEmail({
                email: values.email,
                firstName: values.firstName,
                lastName: values.lastName || undefined,
                password: values.password,
            }, { signal: run.signal })

            if (!run.isCurrent()) {
                return
            }

            setVerificationPassword(values.password)
            handlePendingVerificationChange({
                email: response.email,
                expiresAt: response.expiresAt,
                source: 'register',
                verificationCode: response.verificationCode,
            })
        } catch (error) {
            if (!run.isCurrent()) {
                return
            }

            setServerErrorMessage(
                error instanceof AuthApiError || error instanceof Error
                    ? error.message
                    : 'No pudimos crear tu cuenta. Intenta nuevamente.',
            )
        }
    }

    if (pendingVerification) {
        return (
            <EmailVerificationForm
                key={`${pendingVerification.email}-${pendingVerification.expiresAt}`}
                pendingVerification={pendingVerification}
                onPendingVerificationChange={handlePendingVerificationChange}
                onCancelPendingVerification={handlePendingVerificationClear}
                onVerified={handleAuthenticated}
                password={verificationPassword}
            />
        )
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <AuthSocialButtons intent="register" />

            {serverErrorMessage ? (
                <p
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                    {serverErrorMessage}
                </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <div className="relative">
                        <UserRound
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="firstName"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Juan"
                            aria-invalid={Boolean(errors.firstName)}
                            aria-describedby={
                                errors.firstName ? 'first-name-error' : undefined
                            }
                            className="pl-10"
                            {...register('firstName')}
                        />
                    </div>
                    {errors.firstName ? (
                        <p id="first-name-error" className="text-sm text-destructive">
                            {errors.firstName.message}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido (opcional)</Label>
                    <Input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        placeholder="Montoya"
                        aria-invalid={Boolean(errors.lastName)}
                        aria-describedby={
                            errors.lastName ? 'last-name-error' : undefined
                        }
                        {...register('lastName')}
                    />
                    {errors.lastName ? (
                        <p id="last-name-error" className="text-sm text-destructive">
                            {errors.lastName.message}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                    <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="tu@email.com"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        className="pl-10"
                        {...register('email')}
                    />
                </div>
                {errors.email ? (
                    <p id="email-error" className="text-sm text-destructive">
                        {errors.email.message}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={
                                errors.password ? 'password-error' : undefined
                            }
                            className="pr-12"
                            {...register('password')}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 size-11 -translate-y-1/2"
                            aria-label={
                                showPassword
                                    ? 'Ocultar contraseña'
                                    : 'Mostrar contraseña'
                            }
                            onClick={() => setShowPassword((current) => !current)}
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" aria-hidden="true" />
                            ) : (
                                <Eye className="size-4" aria-hidden="true" />
                            )}
                        </Button>
                    </div>
                    {errors.password ? (
                        <p id="password-error" className="text-sm text-destructive">
                            {errors.password.message}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Repite tu contraseña"
                            aria-invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={
                                errors.confirmPassword
                                    ? 'confirm-password-error'
                                    : undefined
                            }
                            className="pr-12"
                            {...register('confirmPassword')}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 size-11 -translate-y-1/2"
                            aria-label={
                                showConfirmPassword
                                    ? 'Ocultar confirmación de contraseña'
                                    : 'Mostrar confirmación de contraseña'
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
                    {errors.confirmPassword ? (
                        <p
                            id="confirm-password-error"
                            className="text-sm text-destructive"
                        >
                            {errors.confirmPassword.message}
                        </p>
                    ) : null}
                </div>
            </div>

            <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Crear cuenta en FinTrack OS
            </Button>
        </form>
    )
}
