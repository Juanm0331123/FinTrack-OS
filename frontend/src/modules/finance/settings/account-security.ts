import {
    changePassword as changePasswordRequest,
    confirmEmailChange as confirmEmailChangeRequest,
    requestEmailChange as requestEmailChangeRequest,
} from '@/modules/auth/auth.api'
import type { SessionManager } from '@/modules/auth/session-manager'

type SecurityApi = {
    changePassword: typeof changePasswordRequest
    confirmEmailChange: typeof confirmEmailChangeRequest
    requestEmailChange: typeof requestEmailChangeRequest
}

// Operaciones sensibles de la cuenta (contraseña y correo), ligadas a la cuenta que abrió el panel:
// el token solo se entrega si la sesión sigue siendo de userId. Si otra pestaña cambió de cuenta
// mientras se renovaba, la operación falla con SessionChangedError y el formulario de A nunca
// viaja con la identidad de B. El backend sigue exigiendo la contraseña actual.
export function createAccountSecurity(deps: {
    api?: SecurityApi
    session: Pick<SessionManager, 'ensureAccessToken'>
    userId: string
}) {
    const api = deps.api ?? {
        changePassword: changePasswordRequest,
        confirmEmailChange: confirmEmailChangeRequest,
        requestEmailChange: requestEmailChangeRequest,
    }

    async function requireToken() {
        const token = await deps.session.ensureAccessToken({ userId: deps.userId })

        if (!token) {
            throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
        }

        return token
    }

    return {
        async changePassword(input: { currentPassword: string; newPassword: string }, signal?: AbortSignal) {
            return api.changePassword(await requireToken(), input, { signal })
        },
        async confirmEmailChange(input: { code: string }, signal?: AbortSignal) {
            const result = await api.confirmEmailChange(await requireToken(), input, { signal })

            await deps.session.ensureAccessToken({ forceRefresh: true, userId: deps.userId })

            return result
        },
        async requestEmailChange(input: { currentPassword: string; newEmail: string }, signal?: AbortSignal) {
            return api.requestEmailChange(await requireToken(), input, { signal })
        },
    }
}
