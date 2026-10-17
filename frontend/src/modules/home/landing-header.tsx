import { APP_ROUTES } from '@/shared/config/routes'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { HomeAuthLink } from './home-auth-actions'
import { LANDING_ANCHORS, NAV_LINKS } from './landing-content'
import { LandingMobileMenu } from './landing-mobile-menu'

const navLinkClassName =
    'inline-flex min-h-11 items-center rounded-sm text-foreground transition-colors focus-ring hover:text-ink-secondary'

// Barra de navegación de la referencia SkyElite sobre el video del hero: marca a la izquierda y los
// destinos a la derecha desde 768px; por debajo, menú desplegable. «Iniciar sesión» conserva el
// comportamiento de sesión existente (con sesión activa lleva al dashboard).
export function LandingHeader() {
    return (
        <header className="relative z-20">
            <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-8 md:py-6">
                <BrandLogo
                    variant="full"
                    size="lg"
                    href={`${APP_ROUTES.home}#${LANDING_ANCHORS.hero}`}
                    priority
                    className="-ml-1.5 flex-none"
                />
                <nav aria-label="Principal" className="hidden md:block">
                    <ul className="flex items-center gap-6 text-[15px] lg:gap-8 lg:text-base">
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className={navLinkClassName}>
                                    {link.label}
                                </a>
                            </li>
                        ))}
                        <li>
                            <HomeAuthLink destination="login" className={navLinkClassName}>
                                Iniciar sesión
                            </HomeAuthLink>
                        </li>
                    </ul>
                </nav>
                <LandingMobileMenu />
            </div>
        </header>
    )
}
