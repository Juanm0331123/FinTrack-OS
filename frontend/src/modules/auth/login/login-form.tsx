'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { APP_ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { AuthApiError, loginWithEmail } from '../auth.api'
import { EmailVerificationForm } from '../email-verification-form'
import {
    clearPendingVerification,
    loadPendingVerification,
    saveAuthSession,
    savePendingVerification,
} from '../auth.storage'
import type { PendingVerificationState } from '../auth.types'
import { AuthSocialButtons } from '../auth-social-buttons'
import { loginSchema, type LoginFormValues } from './login.schema'

function getFallbackPendingVerificationExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000).toISOString()
}

export function LoginForm() {
    const router = useRouter()
    const [pendingVerification, setPendingVerification] =
        useState<PendingVerificationState | null>(() => loadPendingVerification())
    const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
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
    }

    function handleAuthenticated(session: {
        accessToken: string
        accessTokenExpiresInSeconds: number
        user: Parameters<typeof saveAuthSession>[0]['user']
    }) {
        clearPendingVerification()
        saveAuthSession(session)
        router.replace(APP_ROUTES.dashboard)
    }

    async function onSubmit(values: LoginFormValues) {
        setServerErrorMessage(null)

        try {
            const session = await loginWithEmail(values)
            handleAuthenticated(session)
        } catch (error) {
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

                handlePendingVerificationChange(nextPendingVerification)
                return
            }

            setServerErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No pudimos iniciar sesion. Intenta nuevamente.',
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
            />
        )
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <AuthSocialButtons intent="login" />

            {serverErrorMessage ? (
                <p
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                    {serverErrorMessage}
                </p>
            ) : null}

            <div className="space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
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

            <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Minimo 8 caracteres"
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
                            showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'
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
                <div className="flex justify-end">
                    <Link
                        href={APP_ROUTES.forgotPassword}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Olvide mi contrasena
                    </Link>
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
                Acceder a FinTrack OS
            </Button>
        </form>
    )
}
