import type { PendingVerificationSource, PendingVerificationState } from './auth.types'

export type OAuthCallbackResult =
    | {
          kind: 'loading'
      }
    | {
          kind: 'success'
      }
    | {
          kind: 'pending_verification'
          pendingVerification: PendingVerificationState
      }
    | {
          kind: 'error'
          message: string
      }

// Durante el render del servidor y la hidratación el fragmento aún no se conoce: se espera. Ya en
// el navegador, un callback sin resultado (enlace abierto a mano, fragmento perdido) es un error
// recuperable, no una espera infinita.
export function parseOAuthCallbackResult(hash: string, options: { hydrated: boolean }): OAuthCallbackResult {
    if (!options.hydrated) {
        return { kind: 'loading' }
    }

    if (!hash || hash === '#') {
        return {
            kind: 'error',
            message: 'No recibimos el resultado del acceso con tu proveedor. Vuelve a intentarlo desde iniciar sesión.',
        }
    }

    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const resultStatus = hashParams.get('status')

    if (!resultStatus) {
        return {
            kind: 'error',
            message: 'No pudimos completar el acceso con el proveedor externo.',
        }
    }

    // El backend ya fijó la cookie de refresh; el access token se pide con /auth/refresh y nunca
    // viaja en la URL.
    if (resultStatus === 'success') {
        return { kind: 'success' }
    }

    if (resultStatus === 'pending_verification') {
        const email = hashParams.get('email')
        const expiresAt = hashParams.get('expiresAt')
        const provider = hashParams.get('provider')

        if (!email || !expiresAt || (provider !== 'google' && provider !== 'github')) {
            return {
                kind: 'error',
                message: 'No pudimos continuar con la verificación del correo.',
            }
        }

        return {
            kind: 'pending_verification',
            pendingVerification: {
                email,
                expiresAt,
                source: provider as PendingVerificationSource,
                ...(hashParams.get('verificationCode')
                    ? { verificationCode: hashParams.get('verificationCode') ?? undefined }
                    : {}),
            },
        }
    }

    return {
        kind: 'error',
        message:
            hashParams.get('message') ??
            'No pudimos completar el acceso con el proveedor externo.',
    }
}
