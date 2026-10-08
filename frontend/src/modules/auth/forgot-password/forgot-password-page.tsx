import { APP_ROUTES } from '@/shared/config/routes'
import { AuthShell } from '../auth-shell'
import { ForgotPasswordFlow } from './forgot-password-flow'

export function ForgotPasswordPage() {
    return (
        <AuthShell
            badgeLabel="Recuperar acceso"
            title="Recupera tu contraseña"
            description={
                <>
                    Confirma tu correo con un código temporal y luego define una
                    contraseña nueva para volver a entrar a{' '}
                    <span className="font-medium text-primary">FinTrack OS</span>.
                </>
            }
            switchPrompt="¿Ya recuerdas tu contraseña?"
            switchLabel="Volver a iniciar sesión"
            switchHref={APP_ROUTES.login}
        >
            <ForgotPasswordFlow />
        </AuthShell>
    )
}
