import { ArrowUpRight } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { AuthProviderIcon } from './auth-provider-icon'
import { getOAuthStartUrl } from './auth.config'

const providers = [
    {
        description: 'Crea o accede con tu cuenta verificada de Google.',
        key: 'google',
        label: 'Continuar con Google',
    },
    {
        description: 'Usa GitHub para abrir o crear tu acceso rapidamente.',
        key: 'github',
        label: 'Continuar con GitHub',
    },
] as const

export function AuthSocialButtons() {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {providers.map((provider) => (
                    <Button
                        key={provider.key}
                        asChild
                        variant="outline"
                        className="h-12 w-full justify-between bg-card text-left hover:bg-muted/72"
                    >
                        <a href={getOAuthStartUrl(provider.key)}>
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-full bg-muted/80 text-foreground ring-1 ring-border/70">
                                    <AuthProviderIcon
                                        provider={provider.key}
                                        className="size-4.5"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                        {provider.label}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {provider.description}
                                    </span>
                                </span>
                            </span>
                            <ArrowUpRight className="size-4 text-muted-foreground" />
                        </a>
                    </Button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground">
                    o continua con correo
                </span>
                <Separator className="flex-1" />
            </div>
        </div>
    )
}
