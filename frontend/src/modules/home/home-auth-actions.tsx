'use client'

import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'

import { resolveAuthSession } from '@/modules/auth/auth-session'
import { APP_ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'

type AuthDestination = 'login' | 'register'

function getFallbackRoute(destination: AuthDestination) {
    return destination === 'register' ? APP_ROUTES.register : APP_ROUTES.login
}

function getDashboardRoute() {
    return APP_ROUTES.dashboard
}

// Clic que el navegador debe resolver por su cuenta (nueva pestaña, ventana, menú contextual).
function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

// Navegación con semántica de enlace: el destino real es login o registro (funciona sin JavaScript
// y con clic modificado); con sesión activa, el clic principal lleva directo al dashboard.
function useAuthNavigation(destination: AuthDestination) {
    const router = useRouter()
    const [isNavigating, setIsNavigating] = useState(false)
    const href = getFallbackRoute(destination)

    async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (event.defaultPrevented || isModifiedClick(event)) {
            return
        }

        event.preventDefault()

        if (isNavigating) {
            return
        }

        setIsNavigating(true)

        try {
            const session = await resolveAuthSession()
            router.push(session ? getDashboardRoute() : href)
        } finally {
            setIsNavigating(false)
        }
    }

    return {
        'aria-busy': isNavigating || undefined,
        href,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => void handleClick(event),
    }
}

/** Enlace de texto con el mismo comportamiento de sesión (menú móvil, footer). */
export function HomeAuthLink({
    children,
    className,
    destination,
}: {
    children: ReactNode
    className?: string
    destination: AuthDestination
}) {
    const navigation = useAuthNavigation(destination)

    return (
        <Link className={className} {...navigation}>
            {children}
        </Link>
    )
}

export function HomeAuthButton({
    children,
    className,
    destination,
    size,
    variant,
    withArrowIcon = false,
    withLoginIcon = false,
    withRegisterIcon = false,
}: {
    children: ReactNode
    className?: string
    destination: AuthDestination
    size?: 'default' | 'lg'
    variant: 'access' | 'ghost'
    withArrowIcon?: boolean
    withLoginIcon?: boolean
    withRegisterIcon?: boolean
}) {
    const navigation = useAuthNavigation(destination)

    return (
        <Button asChild variant={variant} size={size} className={className}>
            <Link {...navigation}>
                {withLoginIcon ? <LogIn data-icon="inline-start" aria-hidden="true" /> : null}
                {withRegisterIcon ? <UserPlus data-icon="inline-start" aria-hidden="true" /> : null}
                {children}
                {withArrowIcon ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Link>
        </Button>
    )
}
