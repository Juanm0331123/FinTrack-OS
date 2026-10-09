'use client'

import { LoaderCircle, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { clearPendingVerification, savePendingVerification } from './auth.storage'
import type { PendingVerificationState, PendingVerificationSource } from './auth.types'
import { getBrowserSession } from './browser-session'

type OAuthCallbackResult =
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

function subscribeToHashChange(onStoreChange: () => void) {
    window.addEventListener('hashchange', onStoreChange)

    return () => {
        window.removeEventListener('hashchange', onStoreChange)
    }
}

function getClientHashSnapshot() {
    return window.location.hash
}

function getServerHashSnapshot() {
    return ''
}

function parseOAuthCallbackResult(hash: string): OAuthCallbackResult {
    if (!hash) {
        return {
            kind: 'loading',
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

export function OAuthCallbackPage() {
    const router = useRouter()
    const hash = useSyncExternalStore(
        subscribeToHashChange,
        getClientHashSnapshot,
        getServerHashSnapshot,
    )
    const parsed = parseOAuthCallbackResult(hash)
    const [sessionError, setSessionError] = useState<string | null>(null)
    const result: OAuthCallbackResult = sessionError ? { kind: 'error', message: sessionError } : parsed
    const pendingVerification = parsed.kind === 'pending_verification' ? parsed.pendingVerification : null

    useEffect(() => {
        if (parsed.kind !== 'success') {
            return
        }

        let cancelled = false

        clearPendingVerification()
        getBrowserSession()
            .ensureAccessToken({ forceRefresh: true })
            .then((token) => {
                if (cancelled) {
                    return
                }

                if (token) {
                    router.replace(APP_ROUTES.dashboard)
                } else {
                    setSessionError('No pudimos abrir tu sesión. Intenta iniciar sesión de nuevo.')
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSessionError('No pudimos abrir tu sesión en este momento. Intenta de nuevo en unos segundos.')
                }
            })

        return () => {
            cancelled = true
        }
    }, [parsed.kind, router])

    useEffect(() => {
        if (pendingVerification) {
            savePendingVerification(pendingVerification)
            router.replace(APP_ROUTES.login)
        }
    }, [pendingVerification, router])

    if (
        result.kind === 'loading' ||
        result.kind === 'success' ||
        result.kind === 'pending_verification'
    ) {
        return (
            <main className="bg-auth-soft flex min-h-dvh items-center justify-center px-5">
                <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-5 py-4 shadow-[0_24px_60px_-28px_oklch(0.58_0.19_252/0.24)]">
                    <LoaderCircle className="size-5 animate-spin text-primary" />
                    <p className="text-sm text-foreground">
                        Terminando el acceso con tu proveedor...
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="bg-auth-soft flex min-h-dvh items-center justify-center px-5">
            <div className="w-full max-w-md rounded-[20px] border border-border/70 bg-card/95 p-6 shadow-[0_24px_60px_-28px_oklch(0.58_0.19_252/0.24)]">
                <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <TriangleAlert className="size-5" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    OAuth no pudo completarse
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {result.message}
                </p>
                <div className="mt-6 flex gap-3">
                    <Button asChild variant="brand" className="flex-1">
                        <Link href={APP_ROUTES.login}>Volver a iniciar sesión</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                        <Link href={APP_ROUTES.register}>Crear cuenta</Link>
                    </Button>
                </div>
            </div>
        </main>
    )
}
