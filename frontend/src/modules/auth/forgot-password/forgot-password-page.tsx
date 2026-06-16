import { APP_ROUTES } from '@/shared/config/routes'
import { AuthShell } from '../auth-shell'
import { ForgotPasswordFlow } from './forgot-password-flow'

export function ForgotPasswordPage() {
    return (
        <AuthShell
            badgeLabel="Recuperar acceso"
            title="Recupera tu contrasena"
            description={
                <>
                    Confirma tu correo con un codigo temporal y luego define una
                    contrasena nueva para volver a entrar a{' '}
                    <span className="font-medium text-primary">FinTrack OS</span>.
                </>
            }
            switchPrompt="Ya recuerdas tu contrasena?"
            switchLabel="Volver al login"
            switchHref={APP_ROUTES.login}
        >
            <ForgotPasswordFlow />
        </AuthShell>
    )
}
