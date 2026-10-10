'use client'

import { RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AlertDialog } from 'radix-ui'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { logoutSession } from '@/modules/auth/auth.api'
import { useResolvedAuthSession } from '@/modules/auth/auth-session'
import { clearPendingVerification } from '@/modules/auth/auth.storage'
import { getBrowserSession } from '@/modules/auth/browser-session'
import { APP_ROUTES } from '@/shared/config/routes'
import { useSelectedMonth } from '../hooks/use-selected-month'
import { WorkbookProvider, useWorkbookActions, useWorkbookState } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { MAIN_CONTENT_ID } from '../ui/drawer'
import { Panel } from '../ui/panel'
import { MobileTabBar, MobileTopBar } from './mobile-bars'
import { SaveErrorNotice } from './save-indicator'
import { ContentSkeleton, ShellSkeleton } from './shell-skeleton'
import { Sidebar, type ShellUser } from './sidebar'

function toShellUser(user: { firstName: string; lastName: string | null }): ShellUser {
    const firstName = user.firstName.trim()
    const lastName = user.lastName?.trim() ?? ''
    const initials = [firstName, lastName]
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)

    return {
        displayName: [firstName, lastName].filter(Boolean).join(' '),
        initials: initials || 'FT',
    }
}

// Tope de espera para guardar cambios pendientes antes de cerrar sesión.
const LOGOUT_SAVE_TIMEOUT_MS = 4_000

function WorkbookGate({ children }: { children: ReactNode }) {
    const status = useWorkbookState((state) => state.status)
    const error = useWorkbookState((state) => state.error)
    const actions = useWorkbookActions()

    if (status === 'loading') {
        return <ContentSkeleton />
    }

    if (status === 'error') {
        return (
            <Panel className="flex flex-col items-start gap-3 p-6">
                <h1 className="text-lg font-semibold text-ft-ink">No pudimos cargar tu información</h1>
                <p className="text-sm text-ft-ink-2">{error}</p>
                <FtButton variant="primary" onClick={() => void actions.reload()}>
                    <RotateCw aria-hidden="true" />
                    Reintentar
                </FtButton>
            </Panel>
        )
    }

    return children
}

export function FinanceShell({ children }: { children: ReactNode }) {
    const router = useRouter()
    const { isLoading, retryAfterSeconds, session, status } = useResolvedAuthSession()
    const accessToken = session?.accessToken

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace(APP_ROUTES.home)
        }
    }, [router, status])

    const handleLogout = useCallback(async () => {
        try {
            await logoutSession(accessToken)
        } catch {
            // The local session is cleared below even if the server session already expired.
        } finally {
            getBrowserSession().clear()
            clearPendingVerification()
            router.replace(APP_ROUTES.home)
        }
    }, [accessToken, router])

    // Un fallo temporal (sin red, 429 o 5xx) no cierra la sesión: se ofrece reintentar.
    if (status === 'unavailable' && !session) {
        return (
            <main className="finance-theme flex min-h-dvh items-center justify-center px-4">
                <Panel className="flex max-w-md flex-col items-start gap-3 p-6">
                    <h1 className="text-lg font-semibold text-ft-ink">No pudimos verificar tu sesión</h1>
                    <p className="text-sm text-ft-ink-2">
                        {retryAfterSeconds
                            ? `El servidor pidió esperar unos ${retryAfterSeconds} segundos antes de reintentar.`
                            : 'Puede ser un problema de conexión. Tu sesión sigue abierta.'}
                    </p>
                    <FtButton variant="primary" onClick={() => void getBrowserSession().resolve().catch(() => null)}>
                        <RotateCw aria-hidden="true" />
                        Reintentar
                    </FtButton>
                </Panel>
            </main>
        )
    }

    if (isLoading || !session) {
        return <ShellSkeleton />
    }

    return (
        <WorkbookProvider key={session.user.id} userId={session.user.id}>
            <ShellFrame user={toShellUser(session.user)} onLogout={handleLogout}>
                {children}
            </ShellFrame>
        </WorkbookProvider>
    )
}

// F-DATA-09: un ?month= fuera de 2000-01..2099-12 cae al mes actual y lo dice.
function InvalidMonthNotice() {
    const { invalidRequest } = useSelectedMonth()

    if (!invalidRequest) {
        return null
    }

    return (
        <p role="status" className="mb-4 rounded-lg border border-ft-warn-border bg-ft-warn-soft px-4 py-3 text-sm font-medium text-ft-warn">
            El mes «{invalidRequest}» no es válido: usa el formato AAAA-MM entre 2000-01 y 2099-12. Te mostramos el mes actual.
        </p>
    )
}

// Salir con cambios que no se pudieron guardar: nunca se descartan en silencio.
function UnsavedLogoutDialog({
    onCancel,
    onDiscard,
    onRetry,
    open,
    retrying,
}: {
    onCancel: () => void
    onDiscard: () => void
    onRetry: () => void
    open: boolean
    retrying: boolean
}) {
    return (
        <AlertDialog.Root open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="ft-overlay finance-theme fixed inset-0 z-50 bg-[rgba(15,23,42,0.32)]" />
                <AlertDialog.Content className="finance-theme fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ft-line bg-ft-card p-5 shadow-[0_20px_48px_-16px_rgba(16,24,40,0.28)] outline-none">
                    <AlertDialog.Title className="text-lg font-semibold text-ft-ink">Hay cambios sin guardar</AlertDialog.Title>
                    <AlertDialog.Description className="mt-1.5 text-sm leading-6 text-ft-ink-2">
                        No pudimos guardar tus últimos cambios. Si cierras sesión ahora se pierden: reintenta guardarlos o
                        sal sin guardar.
                    </AlertDialog.Description>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <AlertDialog.Cancel asChild>
                            <FtButton variant="secondary">Cancelar</FtButton>
                        </AlertDialog.Cancel>
                        <FtButton variant="danger" onClick={onDiscard}>
                            Salir sin guardar
                        </FtButton>
                        <FtButton variant="primary" disabled={retrying} onClick={onRetry}>
                            <RotateCw aria-hidden="true" />
                            {retrying ? 'Guardando…' : 'Reintentar y salir'}
                        </FtButton>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}

function ShellFrame({ children, onLogout, user }: { children: ReactNode; onLogout: () => Promise<void>; user: ShellUser }) {
    const actions = useWorkbookActions()
    const [unsavedOnLogout, setUnsavedOnLogout] = useState(false)
    const [retrying, setRetrying] = useState(false)
    // Los cambios pendientes se guardan con la cuenta actual antes de cerrar la sesión. Si algo
    // falla o no termina a tiempo, se pregunta en lugar de cerrar y perderlo.
    const logout = () =>
        void actions.settle(LOGOUT_SAVE_TIMEOUT_MS).then(({ saved }) => (saved ? onLogout() : setUnsavedOnLogout(true)))
    const retryAndLogout = async () => {
        setRetrying(true)
        actions.retrySaves()

        const { saved } = await actions.settle(LOGOUT_SAVE_TIMEOUT_MS)

        setRetrying(false)

        if (saved) {
            setUnsavedOnLogout(false)
            await onLogout()
        }
    }

    return (
        <div className="finance-theme min-h-dvh lg:flex">
            {/* F-UI-08: primer destino del teclado, visible al enfocarse. */}
            <a
                href={`#${MAIN_CONTENT_ID}`}
                onClick={(event) => {
                    event.preventDefault()
                    document.getElementById(MAIN_CONTENT_ID)?.focus()
                }}
                className="sr-only rounded-lg bg-ft-primary px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:outline-2 focus:outline-offset-2 focus:outline-ft-focus"
            >
                Saltar al contenido
            </a>
            <Sidebar user={user} onLogout={logout} />
            <div className="flex min-w-0 flex-1 flex-col">
                <MobileTopBar user={user} onLogout={logout} />
                <main
                    id={MAIN_CONTENT_ID}
                    tabIndex={-1}
                    className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-4 pb-28 outline-none sm:px-6 lg:px-8 lg:pt-6 lg:pb-14"
                >
                    <InvalidMonthNotice />
                    <WorkbookGate>{children}</WorkbookGate>
                </main>
            </div>
            <MobileTabBar />
            <SaveErrorNotice />
            <UnsavedLogoutDialog
                open={unsavedOnLogout}
                retrying={retrying}
                onCancel={() => setUnsavedOnLogout(false)}
                onDiscard={() => {
                    setUnsavedOnLogout(false)
                    void onLogout()
                }}
                onRetry={() => void retryAndLogout()}
            />
        </div>
    )
}
