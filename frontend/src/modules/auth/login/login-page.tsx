'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { APP_ROUTES } from '@/shared/config/routes'
import { useResolvedAuthSession } from '../auth-session'
import { AuthShell } from '../auth-shell'
import { LoginForm } from './login-form'

export function LoginPage() {
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
            badgeLabel="Acceso seguro"
            title="Accede a tu espacio financiero"
            description={
                <>
                    Ingresa con tus datos o usa Google y GitHub. Si tu correo aún no
                    ha sido validado, te pediremos un código obligatorio antes de
                    entrar a <span className="font-medium text-primary">FinTrack OS</span>.
                </>
            }
            switchPrompt="¿Aún no tienes cuenta?"
            switchLabel="Crear mi acceso"
            switchHref={APP_ROUTES.register}
        >
            <LoginForm />
        </AuthShell>
    )
}
