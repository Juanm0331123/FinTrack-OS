'use client'

import { RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'

import { logoutSession } from '@/modules/auth/auth.api'
import { useResolvedAuthSession } from '@/modules/auth/auth-session'
import { clearPendingVerification } from '@/modules/auth/auth.storage'
import { getBrowserSession } from '@/modules/auth/browser-session'
import { APP_ROUTES } from '@/shared/config/routes'
import { WorkbookProvider, useWorkbookActions, useWorkbookState } from '../store/workbook-context'
import { FtButton } from '../ui/button'
import { Panel } from '../ui/panel'
import { MobileTabBar, MobileTopBar } from './mobile-bars'
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

    const user = toShellUser(session.user)
    const onLogout = () => void handleLogout()

    return (
        <WorkbookProvider>
            <div className="finance-theme min-h-dvh lg:flex">
                <Sidebar user={user} onLogout={onLogout} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <MobileTopBar user={user} onLogout={onLogout} />
                    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-6 lg:pb-14">
                        <WorkbookGate>{children}</WorkbookGate>
                    </main>
                </div>
                <MobileTabBar />
            </div>
        </WorkbookProvider>
    )
}
