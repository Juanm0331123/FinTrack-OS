'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { APP_ROUTES } from '@/shared/config/routes'
import { logoutSession } from '../auth/auth.api'
import {
    clearAuthSession,
    clearPendingVerification,
} from '../auth/auth.storage'
import { useResolvedAuthSession } from '../auth/auth-session'
import {
    DashboardShell,
    type DashboardShellUser,
} from './dashboard-shell'
import {
    getDashboardNavigation,
    resolveDashboardView,
    type DashboardView,
} from './dashboard.data'
import { DashboardWorkspace } from './dashboard-workspace'

function buildDashboardUser(sessionUser: {
    email: string
    firstName: string
    lastName: string | null
}): DashboardShellUser {
    const firstName = sessionUser.firstName.trim()
    const lastName = sessionUser.lastName?.trim() ?? ''
    const displayName = [firstName, lastName].filter(Boolean).join(' ')
    const initials = [firstName, lastName]
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)

    return {
        displayName,
        email: sessionUser.email,
        firstName,
        initials: initials || firstName.charAt(0).toUpperCase(),
    }
}

export function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isLoading, session, status } = useResolvedAuthSession()
    const activeView = resolveDashboardView(searchParams.get('view'))

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace(APP_ROUTES.home)
        }
    }, [router, status])

    async function handleLogout() {
        try {
            await logoutSession(session?.accessToken)
        } catch {
            // Local cleanup still needs to happen even if the cookie was already gone.
        } finally {
            clearAuthSession()
            clearPendingVerification()
            router.replace(APP_ROUTES.home)
        }
    }

    if (isLoading || !session) {
        return null
    }

    const dashboardUser = buildDashboardUser(session.user)
    const navigation = getDashboardNavigation(activeView)
    const viewCopy = getDashboardViewCopy(activeView)

    return (
        <DashboardShell
            navigation={navigation}
            user={dashboardUser}
            onLogout={handleLogout}
            pageLabel={viewCopy.pageLabel}
            pageTitle={viewCopy.pageTitle}
        >
            <DashboardWorkspace
                accessToken={session.accessToken}
                currencyCode={session.user.preferredCurrencyCode}
                view={activeView}
            />
        </DashboardShell>
    )
}

function getDashboardViewCopy(view: DashboardView) {
    if (view === 'current-month') {
        return {
            pageLabel: 'Mes actual',
            pageTitle: 'Gestion diaria del mes en curso',
        }
    }

    return {
        pageLabel: 'Dashboard mensual',
        pageTitle: 'Estado financiero del mes actual',
    }
}
