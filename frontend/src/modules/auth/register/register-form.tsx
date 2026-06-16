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
    saveAuthSession,
    savePendingVerification,
} from '../auth.storage'
import type { PendingVerificationState } from '../auth.types'
import { AuthSocialButtons } from '../auth-social-buttons'
import {
    registerSchema,
    type RegisterFormValues,
} from './register.schema'

export function RegisterForm() {
    const router = useRouter()
    const [pendingVerification, setPendingVerification] =
        useState<PendingVerificationState | null>(() => loadPendingVerification())
    const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
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

    async function onSubmit(values: RegisterFormValues) {
        setServerErrorMessage(null)

        try {
            const response = await registerWithEmail({
                email: values.email,
                firstName: values.firstName,
                lastName: values.lastName || undefined,
                password: values.password,
            })

            handlePendingVerificationChange({
                email: response.email,
                expiresAt: response.expiresAt,
                source: 'register',
                verificationCode: response.verificationCode,
            })
        } catch (error) {
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

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="password">Contrasena</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
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
                                showPassword
                                    ? 'Ocultar contrasena'
                                    : 'Mostrar contrasena'
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
                    <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Repite tu contrasena"
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
