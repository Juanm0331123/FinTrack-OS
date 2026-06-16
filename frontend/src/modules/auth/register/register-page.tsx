'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { APP_ROUTES } from '@/shared/config/routes'
import { useResolvedAuthSession } from '../auth-session'
import { AuthShell } from '../auth-shell'
import { RegisterForm } from './register-form'

export function RegisterPage() {
    const router = useRouter()
    const { isAuthenticated, isLoading } = useResolvedAuthSession()

    useEffect(() => {
        if (isAuthenticated) {
            router.replace(APP_ROUTES.dashboard)
        }
    }, [isAuthenticated, router])

    if (isLoading || isAuthenticated) {
        return null
    }

    return (
        <AuthShell
            badgeLabel="Crear cuenta"
            title="Crea tu acceso"
            description={
                <>
                    Registra tu cuenta con lo esencial para empezar. Antes de entrar,
                    validaremos tu correo con un codigo obligatorio en{' '}
                    <span className="font-medium text-primary">FinTrack OS</span>.
                </>
            }
            switchPrompt="Ya tienes una cuenta?"
            switchLabel="Inicia sesion"
            switchHref={APP_ROUTES.login}
        >
            <RegisterForm />
        </AuthShell>
    )
}
