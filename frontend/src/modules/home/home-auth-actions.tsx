'use client'

import { ArrowRight, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
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

export function HomeAuthButton({
    children,
    className,
    destination,
    variant,
    withArrowIcon = false,
    withLoginIcon = false,
}: {
    children: ReactNode
    className?: string
    destination: AuthDestination
    variant: 'brand' | 'ghost' | 'outline'
    withArrowIcon?: boolean
    withLoginIcon?: boolean
}) {
    const router = useRouter()
    const [isNavigating, setIsNavigating] = useState(false)

    async function handleClick() {
        if (isNavigating) {
            return
        }

        setIsNavigating(true)

        try {
            const session = await resolveAuthSession()
            router.push(session ? getDashboardRoute() : getFallbackRoute(destination))
        } finally {
            setIsNavigating(false)
        }
    }

    return (
        <Button
            type="button"
            variant={variant}
            className={className}
            disabled={isNavigating}
            onClick={() => void handleClick()}
        >
            {withLoginIcon ? <LogIn className="size-4" aria-hidden="true" /> : null}
            {children}
            {withArrowIcon ? (
                <ArrowRight className="size-4" aria-hidden="true" />
            ) : null}
        </Button>
    )
}
