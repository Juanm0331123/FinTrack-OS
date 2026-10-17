import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { Badge } from '@/shared/ui/badge'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { Button } from '@/shared/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/shared/ui/card'
import { TextLink } from '@/shared/ui/text-link'

type AuthShellProps = {
    badgeLabel: string
    children: ReactNode
    description: ReactNode
    switchHref: string
    switchLabel: string
    switchPrompt: string
    title: string
}

export function AuthShell({
    badgeLabel,
    children,
    description,
    switchHref,
    switchLabel,
    switchPrompt,
    title,
}: AuthShellProps) {
    return (
        <main className="bg-auth-soft relative min-h-dvh overflow-hidden text-foreground">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute left-[8%] top-[12%] size-52 rounded-full bg-primary/18 blur-3xl" />
                <div className="absolute right-[10%] top-[16%] size-64 rounded-full bg-(--brand-violet)/16 blur-3xl" />
                <div className="absolute bottom-[10%] right-[18%] size-72 rounded-full bg-(--brand-pink)/14 blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
                <section className="w-full max-w-xl">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <Button asChild variant="ghost" className="h-11 px-2 text-sm">
                            <Link href={APP_ROUTES.home}>
                                <ArrowLeft className="size-4" aria-hidden="true" />
                                Volver al inicio
                            </Link>
                        </Button>
                        <Badge variant="accent" className="h-8 px-3">
                            {badgeLabel}
                        </Badge>
                    </div>

                    <Card className="border border-border bg-card shadow-[0_24px_60px_-28px_oklch(0.58_0.19_252/0.24)]">
                        <CardHeader className="gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                {/* Sin enlace: "Volver al inicio" ya cubre ese destino en esta misma pantalla. */}
                                <BrandLogo variant="full" size="sm" priority />
                                <p className="min-w-0 text-xs text-muted-foreground">
                                    Tu acceso mensual a una mejor lectura financiera
                                </p>
                            </div>
                            <div>
                                {/* Encabezado compacto de autenticación, con semántica h1. */}
                                <h1
                                    data-slot="card-title"
                                    className="font-heading text-balance text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-2xl"
                                >
                                    {title}
                                </h1>
                                <CardDescription className="mt-3 max-w-lg text-sm leading-[22px] text-muted-foreground">
                                    {description}
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
                            {children}

                            <p className="text-center text-sm text-muted-foreground">
                                {switchPrompt}{' '}
                                <TextLink href={switchHref} className="font-semibold">
                                    {switchLabel}
                                </TextLink>
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    )
}
