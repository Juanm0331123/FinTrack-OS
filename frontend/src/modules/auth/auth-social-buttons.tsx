import { ArrowUpRight } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { getOAuthStartUrl, type OAuthIntent } from './auth.config'
import { AuthProviderIcon } from './auth-provider-icon'

const providers = [
    {
        description: 'Continúa con Google y completa la verificación obligatoria si aplica.',
        key: 'google',
        label: 'Continuar con Google',
    },
    {
        description: 'Usa GitHub y termina el acceso con código si el correo sigue pendiente.',
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
                        className="h-auto min-h-14 w-full justify-between gap-3 py-2.5 text-left whitespace-normal"
                    >
                        <a href={getOAuthStartUrl(provider.key, intent)}>
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 flex-none items-center justify-center rounded-full bg-muted-fill text-foreground ring-1 ring-border">
                                    <AuthProviderIcon
                                        provider={provider.key}
                                        className="size-4.5"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium">
                                        {actionCopy}{' '}
                                        {provider.key === 'google'
                                            ? 'Google'
                                            : 'GitHub'}
                                    </span>
                                    {/* Sin truncar: en móvil la descripción ocupa dos líneas en lugar de cortarse. */}
                                    <span className="block text-xs leading-5 text-muted-foreground">
                                        {provider.description}
                                    </span>
                                </span>
                            </span>
                            <ArrowUpRight className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
                        </a>
                    </Button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground">
                    {intent === 'register'
                        ? 'o crea con correo'
                        : 'o continúa con correo'}
                </span>
                <Separator className="flex-1" />
            </div>
        </div>
    )
}
