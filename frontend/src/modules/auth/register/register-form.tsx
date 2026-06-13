'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { AuthSocialButtons } from '../auth-social-buttons'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
    registerSchema,
    type RegisterFormValues,
} from './register.schema'

export function RegisterForm() {
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
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

    async function onSubmit(values: RegisterFormValues) {
        await new Promise((resolve) => setTimeout(resolve, 750))
        setSubmittedEmail(values.email)
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <AuthSocialButtons />

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

            {submittedEmail ? (
                <p className="rounded-lg bg-accent/12 px-3 py-2 text-sm text-foreground">
                    Registro visual listo para {submittedEmail}. En el flujo real,
                    aqui te avisaremos que revises el correo de verificacion.
                </p>
            ) : null}
        </form>
    )
}
