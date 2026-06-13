import { APP_ROUTES } from '@/shared/config/routes'
import { AuthShell } from '../auth-shell'
import { LoginForm } from './login-form'

export function LoginPage() {
    return (
        <AuthShell
            badgeLabel="Acceso seguro"
            title="Accede a tu espacio financiero"
            description={
                <>
                    Ingresa con tus datos o usa Google y GitHub para entrar a{' '}
                    <span className="font-medium text-primary">FinTrack OS</span>.
                </>
            }
            switchPrompt="Aun no tienes cuenta?"
            switchLabel="Crear mi acceso"
            switchHref={APP_ROUTES.register}
        >
            <LoginForm />
        </AuthShell>
    )
}
