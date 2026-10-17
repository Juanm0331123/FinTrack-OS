'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { APP_ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { FieldError, FormAlert } from '@/shared/ui/form-message'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PasswordToggle } from '@/shared/ui/password-toggle'
import { TextLink } from '@/shared/ui/text-link'
import { AuthApiError, loginWithEmail } from '../auth.api'
import { EmailVerificationForm } from '../email-verification-form'
import {
    clearPendingVerification,
    loadPendingVerification,
    savePasswordResetHandoff,
    savePendingVerification,
} from '../auth.storage'
import type { AuthenticatedResponse, PendingVerificationState } from '../auth.types'
import { getBrowserSession } from '../browser-session'
import { AuthSocialButtons } from '../auth-social-buttons'
import { useFlowGuard } from '../flow-guard'
import { createSingleFlight } from '../single-flight'
import { loginSchema, type LoginFormValues } from './login.schema'

function getFallbackPendingVerificationExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000).toISOString()
}

export function LoginForm() {
    const router = useRouter()
    const [pendingVerification, setPendingVerification] =
        useState<PendingVerificationState | null>(() => loadPendingVerification())
    const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null)
    // Solo en memoria: el backend exige la contraseña junto al código para activar la cuenta.
    const [verificationPassword, setVerificationPassword] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [submission] = useState(createSingleFlight)
    // Al desmontar (p. ej. navegar a otra página) una respuesta tardía no adopta sesión ni cambia de paso.
    const guard = useFlowGuard()
    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(loginSchema),
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

    function onSubmit(values: LoginFormValues) {
        return submission.run(() => submit(values))
    }

    async function submit(values: LoginFormValues) {
        setServerErrorMessage(null)

        const run = guard.begin()

        try {
            const session = await loginWithEmail(values, { signal: run.signal })

            if (run.isCurrent()) {
                handleAuthenticated(session)
            }
        } catch (error) {
            if (!run.isCurrent()) {
                return
            }

            if (
                error instanceof AuthApiError &&
                error.code === 'EMAIL_VERIFICATION_REQUIRED'
            ) {
                const nextPendingVerification: PendingVerificationState = {
                    email:
                        typeof error.details?.email === 'string'
                            ? error.details.email
                            : values.email.trim().toLowerCase(),
                    expiresAt:
                        typeof error.details?.expiresAt === 'string'
                            ? error.details.expiresAt
                            : getFallbackPendingVerificationExpiry(),
                    source: 'login',
                    ...(typeof error.details?.verificationCode === 'string'
                        ? { verificationCode: error.details.verificationCode }
                        : {}),
                }

                setVerificationPassword(values.password)
                handlePendingVerificationChange(nextPendingVerification)
                return
            }

            if (error instanceof AuthApiError && error.code === 'PASSWORD_RESET_REQUIRED') {
                savePasswordResetHandoff({
                    email: typeof error.details?.email === 'string' ? error.details.email : values.email.trim().toLowerCase(),
                    expiresAt:
                        typeof error.details?.expiresAt === 'string'
                            ? error.details.expiresAt
                            : getFallbackPendingVerificationExpiry(),
                })
                router.push(APP_ROUTES.forgotPassword)
                return
            }

            setServerErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No pudimos iniciar sesión. Intenta nuevamente.',
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
            <AuthSocialButtons intent="login" />

            {serverErrorMessage ? (
                <FormAlert>
                    {serverErrorMessage}
                </FormAlert>
            ) : null}

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
                    <FieldError id="email-error">
                        {errors.email.message}
                    </FieldError>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Mínimo 8 caracteres"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={
                            errors.password ? 'password-error' : undefined
                        }
                        className="pr-12"
                        {...register('password')}
                    />
                    <PasswordToggle visible={showPassword} hideLabel="Ocultar contraseña" showLabel="Mostrar contraseña" onToggle={() => setShowPassword((current) => !current)} />
                </div>
                {errors.password ? (
                    <FieldError id="password-error">
                        {errors.password.message}
                    </FieldError>
                ) : null}
                <div className="flex justify-end">
                    <TextLink href={APP_ROUTES.forgotPassword} className="text-sm">
                        Olvidé mi contraseña
                    </TextLink>
                </div>
            </div>

            <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                loading={isSubmitting}
            >
                <LogIn data-icon="inline-start" aria-hidden="true" />
                Acceder a FinTrack OS
            </Button>
        </form>
    )
}
