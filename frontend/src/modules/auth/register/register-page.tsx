import { APP_ROUTES } from '@/shared/config/routes'
import { AuthShell } from '../auth-shell'
import { RegisterForm } from './register-form'

export function RegisterPage() {
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
