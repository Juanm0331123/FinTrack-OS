import { ArrowUpRight } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { getOAuthStartUrl, type OAuthIntent } from './auth.config'
import { AuthProviderIcon } from './auth-provider-icon'

const providers = [
    {
        description: 'Continua con Google y completa la verificacion obligatoria si aplica.',
        key: 'google',
        label: 'Continuar con Google',
    },
    {
        description: 'Usa GitHub y termina el acceso con codigo si el correo sigue pendiente.',
        key: 'github',
        label: 'Continuar con GitHub',
    },
] as const

type AuthSocialButtonsProps = {
    intent: OAuthIntent
}

export function AuthSocialButtons({ intent }: AuthSocialButtonsProps) {
    const actionCopy = intent === 'register' ? 'Crear con' : 'Continuar con'

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
                        <a href={getOAuthStartUrl(provider.key, intent)}>
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-full bg-muted/80 text-foreground ring-1 ring-border/70">
                                    <AuthProviderIcon
                                        provider={provider.key}
                                        className="size-4.5"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                        {actionCopy}{' '}
                                        {provider.key === 'google'
                                            ? 'Google'
                                            : 'GitHub'}
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
                    {intent === 'register'
                        ? 'o crea con correo'
                        : 'o continua con correo'}
                </span>
                <Separator className="flex-1" />
            </div>
        </div>
    )
}
